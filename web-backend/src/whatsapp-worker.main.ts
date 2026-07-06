/* eslint-disable @typescript-eslint/no-floating-promises */
import { Worker } from 'bullmq';
import { sleep } from 'bun';

import { type IWhatsappMessage } from './api/whatsapp/schema';
import { logger, RedisConfig, whatsappClient } from './common';

let worker: Worker<IWhatsappMessage> | undefined;

function startWhatsappWorker(): void {
  if (worker) return;

  worker = new Worker<IWhatsappMessage>(
    'wa-queue-processor',
    async job => {
      const payload = job.data;

      await whatsappClient.sendMessage(payload.recepient, payload.message);

      await sleep(1000);
    },
    {
      connection: RedisConfig,
      concurrency: 1,
    },
  );

  worker.on('completed', job => {
    logger.info(`[WA-Worker] job with id ${job.id} finished`);
  });

  worker.on('failed', (job, error) => {
    logger.error(
      `[WA-Worker] Job error at id ${job?.id} attempt ${job?.attemptsMade}: ${error}`,
    );
  });

  logger.info('[WA-Worker] 💚 Worker is active, waiting for job...');
}

whatsappClient.on('ready', () => {
  startWhatsappWorker();
});

whatsappClient.initialize();
