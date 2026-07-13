import { type Job, Queue, Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { type MailOptions } from 'nodemailer/lib/json-transport';

import { logger, RedisConfig, ReporterConfig } from '@/common';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class MailQueue {
  private mailList: Queue;

  constructor() {
    this.mailList = new Queue('mail-queue-processor', {
      connection: RedisConfig,
    });

    new Worker(
      'mail-queue-processor',
      async (job: Job<MailOptions>) => {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: ReporterConfig.Email.MAIL_ADDRESS,
            pass: ReporterConfig.Email.MAIL_PASSWORD,
          },
        });

        try {
          const startTime = new Date(Date.now());
          await transporter.sendMail(job.data);
          const totalSendTime =
            new Date(Date.now()).getTime() - startTime.getTime();

          logger.info(`Email send with speed ${totalSendTime}ms`);
        } catch (error) {
          logger.error(error);
        }
      },
      {
        connection: RedisConfig,
      },
    );
  }

  async processSendMail(
    email_targets: string[],
    subject: string,
    html: string,
  ) {
    const primaryTarget = email_targets.shift();

    const data: MailOptions = {
      from: {
        name: ReporterConfig.Email.MAIL_USER,
        address: ReporterConfig.Email.MAIL_ADDRESS,
      },
      to: primaryTarget,
      cc: email_targets.length > 0 ? email_targets : undefined,
      subject: subject,
      html: html,
    };

    await this.mailList.add('send-mail', data, {
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
