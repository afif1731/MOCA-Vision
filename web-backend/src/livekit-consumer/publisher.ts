/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { DataPacket_Kind } from 'livekit-server-sdk';

import { logger } from '../common';
import {
  LiveKitConfig,
  LiveKitRoomClient,
} from '../common/config/livekit.config';
import {
  type ICameraCreatePatchPayload,
  type ICameraDeletePayload,
} from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export abstract class LiveKitPublisher {
  static async deviceAiShutdown(deviceId: string) {
    await this.sendBackendCommand(deviceId, 'DEVICE', 'ai-shutdown');
  }

  static async deviceAiActivate(deviceId: string) {
    await this.sendBackendCommand(deviceId, 'DEVICE', 'ai-activate');
  }

  static async cameraCreate(deviceId: string, data: ICameraCreatePatchPayload) {
    await this.sendBackendCommand(deviceId, 'CAMERA', 'create', data);
  }

  static async cameraPatch(deviceId: string, data: ICameraCreatePatchPayload) {
    await this.sendBackendCommand(deviceId, 'CAMERA', 'patch', data);
  }

  static async cameraDelete(deviceId: string, data: ICameraDeletePayload) {
    await this.sendBackendCommand(deviceId, 'CAMERA', 'delete', data);
  }

  static async deviceStatus() {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify({}));

    await this.sendCommand('frontend_request_device_status', dataBytes);
  }

  private static async sendBackendCommand(
    deviceId: string,
    service: string,
    method: string,
    data: Record<string, any> = {}, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    const payload = {
      service,
      method,
      data,
    };

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify(payload));

    await this.sendCommand(`backend_request_${deviceId}`, dataBytes);

    logger.info(
      `📤 [LiveKitPublisher] Sent ${service} ${method} command to device ${deviceId}`,
    );
  }

  private static async sendCommand(
    topic: string,
    dataBytes: Uint8Array<ArrayBuffer>,
  ) {
    try {
      await LiveKitRoomClient.sendData(
        LiveKitConfig.ROOM_NAME,
        dataBytes,
        DataPacket_Kind.RELIABLE,
        { topic },
      );

      logger.info(`📤 [LiveKitPublisher] Sent to topic ${topic}`);
    } catch (error) {
      logger.error(
        `❌ [LiveKitPublisher] Failed to send topic ${topic}: ${error}`,
      );
    }
  }
}
