import handlebars from 'handlebars';

import { MailQueue } from './mailer.processor';
import { type IReportViolenceBody } from './schemas';

enum MailType {
  VIOLENCE_REPORT,
}

export abstract class MailerService {
  static async sendViolenceReportMail(
    email_targets: string[],
    name: string,
    camera_name: string,
    violence_label: string,
    violence_confidence: number,
    footage_id: string,
    video_start: Date,
  ) {
    const data: IReportViolenceBody = {
      name,
      camera_name,
      violence_label,
      violence_confidence: (violence_confidence * 100).toFixed(2) + '%',
      video_url:
        (process.env.FE_URL || 'http://localhost:3000') +
        '/footage-log/' +
        footage_id,
      video_start: new Date(
        video_start.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }),
      ).toLocaleDateString('id-ID'),
    };

    const mailer = new MailQueue();
    const mailBody = await this.renderMailBody(MailType.VIOLENCE_REPORT, data);

    await mailer.processSendMail(
      email_targets,
      'MOCA-Vision Violence Detected!',
      mailBody,
    );
  }

  private static getMailTemplate(type: MailType): string {
    switch (type) {
      case MailType.VIOLENCE_REPORT: {
        return 'violence-report.hbs';
      }
    }
  }

  private static async renderMailBody(
    type: MailType,
    data: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    const file = Bun.file(
      `./src/api/mailer/templates/${this.getMailTemplate(type)}`,
    );

    const emailTemplate: string = await file.text();
    const template = handlebars.compile(emailTemplate);

    return template(data);
  }
}
