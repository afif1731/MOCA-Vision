import { Queue } from 'bullmq';

import { RedisConfig } from '@/common';

import { type IWhatsappMessage } from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class WhatsappQueue {
  private whatsappQueue: Queue;

  constructor() {
    this.whatsappQueue = new Queue<IWhatsappMessage>('wa-queue-processor', {
      connection: RedisConfig,
    });
  }

  public async createMessageQueue(data: IWhatsappMessage) {
    await this.whatsappQueue.add('wa-queue', data, {
      attempts: 3,
      removeOnComplete: {
        age: 3600,
      },
      removeOnFail: {
        age: 24 * 3600,
      },
    });
  }
}
