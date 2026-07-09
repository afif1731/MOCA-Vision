/* eslint-disable unicorn/prefer-at */
/* eslint-disable unicorn/import-style */
/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { type RemoteTrack, type VideoFrameEvent } from '@livekit/rtc-node';

import { ReportService } from '@/api/report/report.service';
import {
  type IViolenceEvent,
  type IViolenceRecordSession,
  logger,
  prisma,
} from '@/common';

export class FrameStorageService {
  private store = new Map<string, Buffer[]>();
  private lastUpdate = new Map<string, number>();

  constructor() {
    // Jalankan pembersihan setiap 10 detik untuk track yang kadaluarsa (> 60 detik)
    // Ini jauh lebih ringan dari membuat 30 timer per detik
    setInterval(() => this.runCleanup(), 10_000);
  }

  private runCleanup() {
    const now = Date.now();

    for (const [trackId, time] of this.lastUpdate.entries()) {
      if (now - time > 60_000) {
        this.clearTrack(trackId);
      }
    }
  }

  /**
   * Menyimpan frame baru untuk suatu track.
   * - Menambahkan frame ke dalam list (penyimpanan baru jika track baru).
   * - Membatasi penyimpanan maksimal 100 frame terbaru.
   * - Waktu kadaluarsa otomatis ditangani oleh cleanup interval.
   *
   * @param trackId Nama track (contoh: track_{camera_id})
   * @param frameData Data frame
   */
  async saveFrame(trackId: string, frameData: string | Buffer): Promise<void> {
    if (!this.store.has(trackId)) {
      this.store.set(trackId, []);
    }

    const frames = this.store.get(trackId)!;

    // Masukkan frame terbaru di awal list
    frames.unshift(frameData as Buffer);

    // Pertahankan hanya 100 frame terbaru
    if (frames.length > 100) {
      frames.pop();
    }

    // Catat waktu frame terakhir masuk
    this.lastUpdate.set(trackId, Date.now());
  }

  /**
   * Mengambil frame yang tersimpan pada track tertentu.
   * @param trackId Nama track
   * @returns Array berisi data frame
   */
  async getFrames(trackId: string): Promise<Buffer[]> {
    const frames = this.store.get(trackId) || [];

    return [...frames];
  }

  /**
   * Menghapus penyimpanan frame untuk track tertentu secara manual (jika diperlukan).
   * @param trackId Nama track
   */
  async clearTrack(trackId: string): Promise<void> {
    this.store.delete(trackId);
    this.lastUpdate.delete(trackId);
  }
}

export const frameStorageService = new FrameStorageService();

export abstract class CameraRecorder {
  private static activeViolenceRecordings = new Map<
    string,
    IViolenceRecordSession
  >();

  private static readonly VIDEO_FPS = 30;
  private static readonly RECORD_COOLDOWN = 70_000;

  static async recordViolence(
    camera_id: string,
    event: IViolenceEvent,
    force_record: boolean,
  ) {
    if (this.activeViolenceRecordings.has(camera_id)) return;

    if (!force_record) {
      const recentRecord = await prisma.detectedAnomalies.findFirst({
        where: { camera_id },
        select: { created_at: true },
        orderBy: { created_at: 'desc' },
      });
      const currentTime = new Date(Date.now());

      if (
        recentRecord &&
        currentTime.getTime() - recentRecord.created_at.getTime() <
          this.RECORD_COOLDOWN
      ) {
        logger.debug(
          `💤 [LiveKit Listener] Violence Recording for camera ${camera_id} is on 1 minute cooldown (${currentTime.getTime() - recentRecord.created_at.getTime()}ms remaining)`,
        );

        return;
      }

      logger.info(
        `🚨 [LivekitListener] Violence detected on ${camera_id} (${event.label}: ${event.confidence}). Starting 200 frame capture...`,
      );

      const trackName = `track_${camera_id}`;
      const previousFrames = await frameStorageService.getFrames(trackName);
      previousFrames.reverse();

      const sanitizedFrames: Buffer[] = [];
      let lastValidBuffer: Buffer | undefined;

      const targetSize =
        previousFrames.length > 0
          ? previousFrames[previousFrames.length - 1].length
          : undefined;

      if (targetSize) {
        for (const f of previousFrames) {
          if (f.length === targetSize) {
            sanitizedFrames.push(f);
            lastValidBuffer = f;
          } else if (lastValidBuffer) {
            sanitizedFrames.push(lastValidBuffer);
          }
        }
      }

      this.activeViolenceRecordings.set(camera_id, {
        cameraId: camera_id,
        frames: sanitizedFrames,
        remaining: 200,
        highestConfidence: event.confidence,
        detectedLabel: event.label,
        targetSize,
        lastValidBuffer,
      });
    }
  }

  static async handleViolenceFrameSaving(
    track: RemoteTrack,
    reader: ReadableStreamDefaultReader<VideoFrameEvent>,
  ) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const frame = value.frame;
      const trackName = track.name!;
      const cameraId = trackName.replace('track_', '');

      const buffer = Buffer.allocUnsafe(frame.data.length);
      buffer.set(frame.data);

      await frameStorageService.saveFrame(trackName, buffer);

      if (this.activeViolenceRecordings.has(cameraId)) {
        const session = this.activeViolenceRecordings.get(cameraId)!;

        if (session.remaining > 0) {
          if (!session.targetSize) {
            session.targetSize = buffer.length;
          }

          if (!session.width && buffer.length === session.targetSize) {
            session.width = frame.width;
            session.height = frame.height;
          }

          if (buffer.length === session.targetSize) {
            session.frames.push(buffer);
            session.lastValidBuffer = buffer;
            session.remaining--;
          } else if (session.lastValidBuffer) {
            session.frames.push(session.lastValidBuffer);
            session.remaining--;
          }

          if (session.remaining === 0) {
            this.finishViolenceRecording(session);
            this.activeViolenceRecordings.delete(cameraId);
          }
        }
      }
    }
  }

  private static async finishViolenceRecording(
    session: IViolenceRecordSession,
  ) {
    logger.info(
      `🎥 [LivekitListener] Finished collecting frames for ${session.cameraId}. Encoding video...`,
    );

    if (!session.width || !session.height || session.frames.length === 0) {
      logger.error('❌ [LivekitListener] Invalid session data for recording.');

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
        logger.warn(
          `⚠️ [LivekitListener] Unknown pixel format for size ${firstFrameSize} (WxH: ${width}x${height}). Defaulting to rgba.`,
        );
      }
    }

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
      this.VIDEO_FPS.toString(),
      '-i',
      '-',
      '-vf',
      'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-r',
      this.VIDEO_FPS.toString(),
      outputPath,
    ]);

    ffmpeg.on('error', (error: unknown) => {
      logger.error(
        `❌ [LivekitListener] FFmpeg error for ${session.cameraId}: ${error}`,
      );
    });

    ffmpeg.on('close', async (code: number) => {
      if (code === 0) {
        logger.info(
          `✅ [LivekitListener] Video saved successfully to ${outputPath}`,
        );
        const duration = Math.round(session.frames.length / this.VIDEO_FPS);

        await ReportService.createViolenceReport({
          camera_id: session.cameraId,
          label: session.detectedLabel,
          confidence: session.highestConfidence,
          duration: duration,
          video_path: `violence-detection/${fileName}`,
        });
      } else {
        logger.error(`❌ [LivekitListener] FFmpeg exited with code ${code}`);
      }
    });

    for (const frame of session.frames) {
      if (ffmpeg.stdin.destroyed) break;
      const canWrite = ffmpeg.stdin.write(frame);

      if (!canWrite) {
        await new Promise<void>(resolve => {
          const drainHandler = () => {
            ffmpeg.stdin.removeListener('error', errorHandler);
            resolve();
          };

          const errorHandler = () => {
            ffmpeg.stdin.removeListener('drain', drainHandler);
            resolve();
          };

          ffmpeg.stdin.once('drain', drainHandler);
          ffmpeg.stdin.once('error', errorHandler);
        });
      }
    }

    if (!ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.end();
    }
  }
}
