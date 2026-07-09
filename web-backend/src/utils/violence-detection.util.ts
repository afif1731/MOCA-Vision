import { type IViolenceEvent, ViolenceThresholdConfig } from '@/common';

export function isEventViolence(event: IViolenceEvent) {
  if (
    event.label === 'normal_event' ||
    event.label === 'analyzing' ||
    event.num_persons < 2
  )
    return false;

  let violence_threshold = ViolenceThresholdConfig.GLOBAL;

  if (!ViolenceThresholdConfig.USE_GLOBAL) {
    switch (event.label) {
      case 'assault': {
        violence_threshold = ViolenceThresholdConfig.ASSAULT;
        break;
      }

      case 'fighting': {
        violence_threshold = ViolenceThresholdConfig.FIGHTING;
        break;
      }

      case 'shooting': {
        violence_threshold = ViolenceThresholdConfig.SHOOTING;
        break;
      }

      case 'robbery': {
        violence_threshold = ViolenceThresholdConfig.ROBBERY;
        break;
      }
    }
  }

  return event.confidence > violence_threshold;
}
