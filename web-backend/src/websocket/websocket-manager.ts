/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { CryptoHasher } from 'bun';
import Elysia from 'elysia';
import { type ElysiaWS } from 'elysia/ws';

import { LiveKitConfig, logger } from '@/common';

import { WebsocketListener } from './listener';
import { WebsocketBodySchema, WebsocketEdgeQuerySchema } from './schema';

export const socketMap = new Map<string, ElysiaWS>();
const heartbeatMap = new Map<string, number>();
const HEARTBEAT_TIMEOUT = 60_000;

setInterval(() => {
  const now = Date.now();

  for (const [deviceId, lastHeartbeat] of heartbeatMap.entries()) {
    if (now - lastHeartbeat > HEARTBEAT_TIMEOUT) {
      const ws = socketMap.get(deviceId);

      if (ws) {
        logger.warn(`Device ${deviceId} heartbeat timeout. Closing socket...`);
        ws.close();
      }

      heartbeatMap.delete(deviceId);
      socketMap.delete(deviceId);
    }
  }
}, 30_000);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const WebsocketManager = new Elysia({ name: 'websocket-manager' }).ws(
  '/ws/edge',
  {
    query: WebsocketEdgeQuerySchema,
    body: WebsocketBodySchema,

    open(ws) {
      const { device_id: deviceId, secret, timestamp } = ws.data.query;

      const now = Date.now();

      if (Math.abs(now - timestamp) > 60_000) {
        logger.warn(
          `Device ${deviceId} connection rejected: timestamp expired`,
        );
        ws.close();

        return;
      }

      const signaturePayload = `${deviceId}:${timestamp}`;
      const hasher = new CryptoHasher('sha256', LiveKitConfig.DEVICE_SECRET);

      hasher.update(signaturePayload);
      const signatureKey = hasher.digest('hex');

      if (secret !== signatureKey) {
        ws.close();

        return;
      }

      const existing = socketMap.get(deviceId);

      if (existing && existing !== ws) {
        // logger.warn(`Device ${deviceId} reconnect, closing old socket`);
        existing.close();
      }

      socketMap.set(deviceId, ws);
      heartbeatMap.set(deviceId, Date.now());
      // logger.info(`Device ${deviceId} connected to websocket`);
    },

    message(ws, data) {
      const { device_id: deviceId } = ws.data.query;

      if (socketMap.get(deviceId) !== ws) return;

      switch (data.type) {
        case 'violence_detection': {
          WebsocketListener.handleViolenceDetection(data.payload).catch(
            error => {
              logger.error(
                `❌ [LivekitListener] Error in handleViolenceDetection: ${error}`,
              );
            },
          );
          break;
        }

        case 'heartbeat': {
          heartbeatMap.set(deviceId, Date.now());
          break;
        }
      }

      return;
    },

    close(ws) {
      const { device_id: deviceId } = ws.data.query;

      if (socketMap.get(deviceId) === ws) {
        socketMap.delete(deviceId);
        heartbeatMap.delete(deviceId);
        logger.info(`Closing device ${deviceId} socket connection`);
      }
    },
  },
);
