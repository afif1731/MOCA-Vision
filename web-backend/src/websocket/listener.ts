import {
  type IViolenceDetectionPayload,
  type IViolenceEvent,
  logger,
} from '@/common';
import { isEventViolence } from '@/utils';
import { CameraRecorder } from '@/utils/video-recorder.util';

// eslint-disable-next-line @typescript-eslint/naming-convention
export abstract class WebsocketListener {
  static async handleViolenceDetection(
    data: IViolenceDetectionPayload,
    force_record: boolean = false,
  ) {
    let isViolenceExist = false;
    let violenceEvent: IViolenceEvent | undefined;

    for (const event of data.events) {
      const isViolence = isEventViolence(event);

      if (isViolence) {
        isViolenceExist = true;

        if (!violenceEvent || event.confidence > violenceEvent.confidence)
          violenceEvent = event;
      }
    }

    if (!isViolenceExist) return;
    logger.info(`Violence detected from ${data.camera_id}`);

    await CameraRecorder.recordViolence(
      data.camera_id,
      violenceEvent!,
      force_record,
    );

    return;
  }

  static async triggerDummyRecording(cameraId: string) {
    logger.info(
      `🧪 [LivekitListener] Dummy recording triggered for ${cameraId}`,
    );
    const dummyPayload: IViolenceDetectionPayload = {
      camera_id: cameraId,
      events: [
        {
          group_id: 1,
          num_persons: 2,
          label: 'assault',
          confidence: 0.99,
        },
      ],
    };
    await this.handleViolenceDetection(dummyPayload, true);
  }
}
