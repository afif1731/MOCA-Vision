/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unicorn/import-style */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unicorn/text-encoding-identifier-case */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  type RemoteVideoTrack,
  Room,
  RoomEvent,
  VideoStream,
} from '@livekit/rtc-node';
import { AccessToken } from 'livekit-server-sdk';

import { LiveKitConfig, prisma } from '../common';
import { ViolenceThresholdConfig } from '../common/config/violence-threshold.config';
import { frameStorageService } from '../redis/frame-storage';

export const ViolenceEventLabel = {
  normal_event: 'normal_event',
  assault: 'assault',
  fighting: 'fighting',
  robbery: 'robbery',
  shooting: 'shooting',
  analyzing: 'analyzing',
} as const;

export type IViolenceEventLabel = keyof typeof ViolenceEventLabel;

export interface AbsoluteSkeleton {
  x: number;
  y: number;
}

export interface ViolenceEvent {
  group_id: number;
  label: IViolenceEventLabel;
  confidence: number;
  skeletons: AbsoluteSkeleton[];
}

export interface ViolenceDetectionPayload {
  camera_id: string;
  fps: number;
  events: ViolenceEvent[];
}

interface RecordingSession {
  cameraId: string;
  frames: Buffer[];
  remaining: number;
  width?: number;
  height?: number;
  payload: ViolenceDetectionPayload;
  highestConfidence: number;
  detectedLabel: string;
}

export class LivekitListener {
  private room: Room;
  private activeRecordings = new Map<string, RecordingSession>();

  constructor() {
    this.room = new Room();
  }

  public async connect() {
    try {
      const token = new AccessToken(
        LiveKitConfig.API_KEY,
        LiveKitConfig.API_SECRET,
        {
          identity: 'backend-livekit',
        },
      );
      token.addGrant({
        roomJoin: true,
        room: LiveKitConfig.ROOM_NAME,
        canPublish: true,
        canSubscribe: true,
      });
      const tokenString = await token.toJwt();

      await this.room.connect(LiveKitConfig.URL, tokenString, {
        autoSubscribe: true,
        dynacast: true,
      });

      console.log(
        '✅ [LivekitListener] Connected to room:',
        LiveKitConfig.ROOM_NAME,
      );

      this.room.on(
        RoomEvent.TrackSubscribed,
        (track, publication, participant) => {
          if (track.kind === 1) {
            // 1 is usually Video
            console.log(
              `📹 [LivekitListener] Subscribed to video track: ${track.name || 'unnamed'} from ${participant?.identity || 'unknown'}`,
            );

            if (!track.name) {
              console.warn(
                '⚠️ [LivekitListener] Track name is undefined, ignoring track.',
              );

              return;
            }

            const stream = new VideoStream(track as RemoteVideoTrack);
            const reader = stream.getReader();

            (async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  const frame = value.frame;
                  const trackName = track.name!;
                  const cameraId = trackName.replace('track_', '');

                  const buffer = Buffer.from(frame.data);

                  await frameStorageService.saveFrame(trackName, buffer);

                  // Handle active recording
                  if (this.activeRecordings.has(cameraId)) {
                    const session = this.activeRecordings.get(cameraId)!;

                    if (session.remaining > 0) {
                      session.frames.push(buffer);
                      session.width = frame.width;
                      session.height = frame.height;
                      session.remaining--;

                      if (session.remaining === 0) {
                        this.finishRecording(session);
                        this.activeRecordings.delete(cameraId);
                      }
                    }
                  }
                }
              } catch (error) {
                console.error(
                  `❌ [LivekitListener] VideoStream error for track ${track.name}:`,
                  error,
                );
              }
            })();
          }
        },
      );

      this.room.on(
        RoomEvent.DataReceived,
        (payload, participant, kind, topic) => {
          try {
            const dataString = Buffer.from(payload).toString('utf-8');
            const detection: ViolenceDetectionPayload = JSON.parse(dataString);
            this.handleViolenceDetection(detection);
          } catch (error) {
            console.error(
              '❌ [LivekitListener] Failed to parse data channel message:',
              error,
            );
          }
        },
      );
    } catch (error) {
      console.error('❌ [LivekitListener] Connection failed:', error);
    }
  }

  private async handleViolenceDetection(payload: ViolenceDetectionPayload) {
    if (!payload.events || payload.events.length === 0) return;

    let highestConfidence = 0;
    let detectedLabel = '';
    let isViolent = false;

    for (const event of payload.events) {
      if (event.label === 'normal_event' || event.label === 'analyzing')
        continue;

      let threshold = ViolenceThresholdConfig.GLOBAL;

      if (!ViolenceThresholdConfig.USE_GLOBAL) {
        switch (event.label) {
          case 'assault': {
            threshold = ViolenceThresholdConfig.ASSAULT;
            break;
          }

          case 'fighting': {
            threshold = ViolenceThresholdConfig.FIGHTING;
            break;
          }

          case 'robbery': {
            threshold = ViolenceThresholdConfig.ROBBERY;
            break;
          }

          case 'shooting': {
            threshold = ViolenceThresholdConfig.SHOOTING;
            break;
          }
        }
      }

      if (event.confidence > threshold) {
        isViolent = true;

        if (event.confidence > highestConfidence) {
          highestConfidence = event.confidence;
          detectedLabel = event.label;
        }
      }
    }

    if (isViolent && !this.activeRecordings.has(payload.camera_id)) {
      console.log(
        `🚨 [LivekitListener] Violence detected on ${payload.camera_id} (${detectedLabel}: ${highestConfidence}). Starting 200 frame capture...`,
      );

      const trackName = `track_${payload.camera_id}`;
      // Fetch the 100 previous frames from Redis
      const previousFrames = await frameStorageService.getFrames(trackName);

      // Redis lrange returns index 0 (newest) to 99 (oldest) if we use lpush.
      // We need chronological order: oldest to newest, so we reverse it.
      previousFrames.reverse();

      this.activeRecordings.set(payload.camera_id, {
        cameraId: payload.camera_id,
        frames: previousFrames,
        remaining: 200, // wait for 200 more frames
        payload: payload,
        highestConfidence,
        detectedLabel,
      });
    }
  }

  private async finishRecording(session: RecordingSession) {
    console.log(
      `🎥 [LivekitListener] Finished collecting frames for ${session.cameraId}. Encoding video...`,
    );

    if (!session.width || !session.height || session.frames.length === 0) {
      console.error('❌ [LivekitListener] Invalid session data for recording.');

      return;
    }

    const folderPath = join(
      process.cwd(),
      process.env.FILE_STORAGE_PATH || 'uploads',
      'violence-detection',
    );

    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const fileName = `${Date.now()}-${session.cameraId}.mp4`;
    const outputPath = join(folderPath, fileName);

    const width = session.width;
    const height = session.height;
    const firstFrameSize = session.frames[0].length;

    let pixFmt = 'rgba';

    switch (firstFrameSize) {
      case width * height * 4: {
        pixFmt = 'rgba';
        break;
      }

      case width * height * 3: {
        pixFmt = 'rgb24';
        break;
      }

      case width * height * 1.5: {
        pixFmt = 'yuv420p';
        break;
      }

      default: {
        console.warn(
          `⚠️ [LivekitListener] Unknown pixel format for size ${firstFrameSize} (WxH: ${width}x${height}). Defaulting to rgba.`,
        );
      }
    }

    // Default framerate: if fps is in payload use it, else 30
    const fps = session.payload.fps || 30;

    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f',
      'rawvideo',
      '-vcodec',
      'rawvideo',
      '-s',
      `${width}x${height}`,
      '-pix_fmt',
      pixFmt,
      '-r',
      fps.toString(),
      '-i',
      '-', // Read from stdin
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      outputPath,
    ]);

    ffmpeg.on('error', error => {
      console.error(
        `❌ [LivekitListener] FFmpeg error for ${session.cameraId}:`,
        error,
      );
    });

    ffmpeg.on('close', async code => {
      if (code === 0) {
        console.log(
          `✅ [LivekitListener] Video saved successfully to ${outputPath}`,
        );
        await this.saveAnomalyToDB(session, `violence-detection/${fileName}`);
      } else {
        console.error(`❌ [LivekitListener] FFmpeg exited with code ${code}`);
      }
    });

    // Write all buffers sequentially
    for (const frame of session.frames) {
      ffmpeg.stdin.write(frame);
    }

    ffmpeg.stdin.end();
  }

  private async saveAnomalyToDB(
    session: RecordingSession,
    relativeVideoPath: string,
  ) {
    try {
      // Map label to AnomalyType enum correctly
      let anomalyType: any = 'ASSAULT';

      switch (session.detectedLabel) {
        case 'assault': {
          anomalyType = 'ASSAULT';
          break;
        }

        case 'fighting': {
          anomalyType = 'FIGHTING';
          break;
        }

        case 'robbery': {
          anomalyType = 'ROBBERY';
          break;
        }

        case 'shooting': {
          anomalyType = 'SHOOTING';
          break;
        }
      }

      const duration = Math.round(
        session.frames.length / (session.payload.fps || 30),
      );

      await prisma.detectedAnomalies.create({
        data: {
          camera_id: session.cameraId,
          video_path: relativeVideoPath,
          video_duration: duration,
          anomaly_type: anomalyType,
          confidence: session.highestConfidence,
          is_valid: false,
          is_reported: false,
          report_sent: {},
          video_start_date: new Date(Date.now() - duration * 1000),
          video_end_date: new Date(),
        },
      });
      console.log(
        `💾 [LivekitListener] Anomaly data saved to database for ${session.cameraId}`,
      );
    } catch (error) {
      console.error(
        '❌ [LivekitListener] Failed to save anomaly to DB:',
        error,
      );
    }
  }

  public async triggerDummyRecording(cameraId: string) {
    console.log(
      `🧪 [LivekitListener] Dummy recording triggered for ${cameraId}`,
    );
    const dummyPayload: ViolenceDetectionPayload = {
      camera_id: cameraId,
      fps: 30,
      events: [
        {
          group_id: 1,
          label: 'assault',
          confidence: 0.99,
          skeletons: [],
        },
      ],
    };
    await this.handleViolenceDetection(dummyPayload);
  }
}

export const livekitListener = new LivekitListener();
