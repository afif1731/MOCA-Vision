/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call*/
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type ElysiaWS } from 'elysia/ws';

import { logger } from '@/common';

import {
  type ICameraCreatePatchPayload,
  type ICameraDeletePayload,
} from './schema';
import { socketMap } from './websocket-manager';

// eslint-disable-next-line @typescript-eslint/naming-convention
export abstract class WebsocketPublisher {
  static deviceAiShutdown(device_id: string) {
    this.sendBackendCommand(device_id, 'DEVICE', 'ai-shutdown');
  }

  static deviceAiActivate(device_id: string) {
    this.sendBackendCommand(device_id, 'DEVICE', 'ai-activate');
  }

  static cameraCreate(device_id: string, data: ICameraCreatePatchPayload) {
    this.sendBackendCommand(device_id, 'CAMERA', 'create', data);
  }

  static cameraPatch(device_id: string, data: ICameraCreatePatchPayload) {
    this.sendBackendCommand(device_id, 'CAMERA', 'patch', data);
  }

  static cameraDelete(device_id: string, data: ICameraDeletePayload) {
    this.sendBackendCommand(device_id, 'CAMERA', 'delete', data);
  }

  static deviceStatus() {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    for (const [_, ws] of socketMap) {
      this.sendCommand(
        ws,
        JSON.stringify({
          service: 'DEVICE',
          method: 'status-request',
          data: {},
        }),
      );
    }
  }

  private static sendBackendCommand(
    device_id: string,
    service: string,
    method: string,
    data: Record<string, any> = {}, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    const ws = socketMap.get(device_id);

    if (!ws) {
      logger.warn(
        `Socket connection for device id ${device_id} not found. Skipping...`,
      );

      return;
    }

    const payload = {
      service,
      method,
      data,
    };

    this.sendCommand(ws, JSON.stringify(payload));
  }

  private static sendCommand(ws: ElysiaWS, payload: string) {
    try {
      ws.send(payload);
    } catch {
      logger.error('Failed to send websocket message to device');
    }
  }
}
