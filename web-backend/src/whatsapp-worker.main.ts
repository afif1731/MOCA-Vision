/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable unicorn/no-process-exit */
import { Worker } from 'bullmq';

import { type IWhatsappMessage } from './api/whatsapp/schema';
import { logger, RedisConfig, whatsappClient } from './common';

let worker: Worker<IWhatsappMessage> | undefined;

const sleep = (ms: number) =>
  new Promise<void>(resource => setTimeout(resource, ms));

function startWhatsappWorker(): void {
  if (worker) return;

  worker = new Worker<IWhatsappMessage>(
    'wa-queue-processor',
    async job => {
      const payload = job.data;
      const startTime = new Date(Date.now());

      await whatsappClient.sendMessage(payload.recepient, payload.message);

      const totalSendTime =
        new Date(Date.now()).getTime() - startTime.getTime();

      logger.info(`Message send with speed ${totalSendTime}ms`);

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

  worker.on('failed', async (job, error) => {
    logger.error(
      `[WA-Worker] Job error at id ${job?.id} attempt ${job?.attemptsMade}: ${error}`,
    );

    if (String(error?.message).includes('detached Frame')) {
      logger.error('[WA-Worker] Frame detached — process will be restarted.');
      await worker?.close();
      process.exit(1);
    }
  });

  logger.info('[WA-Worker] 💚 Worker is active, waiting for job...');
}

async function shutdown(signal: string) {
  logger.info(`[WA-Worker] ${signal} received, shutdown gracefully...`);

  try {
    await worker?.close();
    await whatsappClient.destroy();
  } catch (error) {
    logger.error(`[WA-Worker] Error during shutdown: ${error}`); //eslint-disable-line @typescript-eslint/restrict-template-expressions
  } finally {
    process.exit(0);
  }
}

whatsappClient.on('ready', () => {
  startWhatsappWorker();
});

whatsappClient.initialize();

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
