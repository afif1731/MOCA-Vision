import { cron } from '@elysiajs/cron';

import { logger, prisma } from '@/common';

import { FileManager } from '../file-management.util';

export const removeFootageLog = cron({
  name: 'remove-footage-log',
  pattern: '0 0 * * *',
  async run() {
    logger.info('Starting to removing old footage...');

    try {
      const videoRetention = await prisma.systemSettings.findFirst({
        select: { video_retention_days: true },
      });
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - videoRetention!.video_retention_days);

      const fotoageList = await prisma.detectedAnomalies.findMany({
        where: { created_at: { lte: daysAgo } },
        select: { video_path: true },
      });

      for (const footage of fotoageList)
        await FileManager.remove(footage.video_path);

      const updatedFootage = await prisma.detectedAnomalies.updateMany({
        where: { created_at: { lte: daysAgo } },
        data: {
          video_path: null,
        },
      });

      logger.info(`Successfully remove ${updatedFootage.count} videos`);
    } catch (error: any) {
      logger.error(`Failed to run remove function. Error: ${error}`);
    }
  },
});
