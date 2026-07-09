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
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable unicorn/prefer-at */

import {
  type RemoteVideoTrack,
  Room,
  RoomEvent,
  TrackKind,
  VideoStream,
} from '@livekit/rtc-node';
import { AccessToken } from 'livekit-server-sdk';

import { CameraRecorder } from '@/utils/video-recorder.util';

import { LiveKitConfig, logger } from '../common';

export class LivekitListener {
  private room: Room;

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
          name: 'Backend LiveKit Listener',
        },
      );
      token.addGrant({
        roomJoin: true,
        room: LiveKitConfig.ROOM_NAME,
        canPublish: true,
        canSubscribe: true,
        hidden: false,
      });
      const tokenString = await token.toJwt();

      this.room.on(
        RoomEvent.TrackSubscribed,
        (track, _publication, participant) => {
          if (track.kind === TrackKind.KIND_VIDEO) {
            logger.info(
              `📹 [LivekitListener] Subscribed to video track: ${track.name || 'unnamed'} from ${participant?.identity || 'unknown'}`,
            );

            if (!track.name) {
              logger.warn(
                '⚠️ [LivekitListener] Track name is undefined, ignoring track.',
              );

              return;
            }

            const stream = new VideoStream(track as RemoteVideoTrack);
            const reader = stream.getReader();

            (async () => {
              try {
                await CameraRecorder.handleViolenceFrameSaving(track, reader);
              } catch (error) {
                logger.error(
                  `❌ [LivekitListener] VideoStream error for track ${track.name}: ${error}`,
                );
              }
            })();
          }
        },
      );

      await this.room.connect(LiveKitConfig.URL, tokenString, {
        autoSubscribe: true,
        dynacast: false,
      });

      logger.info(
        `✅ [LivekitListener] Connected to room: ${LiveKitConfig.ROOM_NAME}`,
      );
    } catch (error) {
      logger.error(`❌ [LivekitListener] Connection failed: ${error}`);
    }
  }

  public async disconnect() {
    try {
      if (this.room) {
        await this.room.disconnect();
        logger.info('🛑 [LivekitListener] Disconnected from room gracefully');
      }
    } catch (error) {
      logger.error(`❌ [LivekitListener] Error disconnecting: ${error}`);
    }
  }
}

export const livekitListener = new LivekitListener();
