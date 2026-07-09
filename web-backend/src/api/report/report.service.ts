import { sleep } from 'bun';

import { logger, prisma } from '@/common';
import { type AnomalyType } from '~/generated/prisma/enums';

import { MailerService } from '../mailer/mailer.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { type ICreateViolenceReport } from './schema';

export abstract class ReportService {
  static async createViolenceReport(data: ICreateViolenceReport) {
    const currentTime = new Date(Date.now());
    const videoStartTime = new Date(
      currentTime.getTime() - data.duration * 1000,
    );

    let anomalyType: AnomalyType = 'ASSAULT';

    switch (data.label) {
      case 'assault': {
        anomalyType = 'ASSAULT';
        break;
      }

      case 'fighting': {
        anomalyType = 'FIGHTING';
        break;
      }

      case 'robbery': {
        anomalyType = 'ROBBERY';
        break;
      }

      case 'shooting': {
        anomalyType = 'SHOOTING';
        break;
      }
    }

    const systemSettings = await prisma.systemSettings.findFirst();
    const camera = await prisma.cameras.findUnique({
      where: { id: data.camera_id },
      select: { id: true, name: true },
    });

    const sendDatabaseStartTime = new Date();

    const newFootage = await prisma.detectedAnomalies.create({
      data: {
        camera_id: camera ? data.camera_id : null,
        video_path: data.video_path,
        video_duration: data.duration,
        anomaly_type: anomalyType,
        confidence: data.confidence,
        is_reported:
          !systemSettings?.report_auto_send_wa &&
          !systemSettings?.report_auto_send_email
            ? false
            : true,
        report_sent: {},
        video_start_date: videoStartTime,
        video_end_date: currentTime,
      },
      select: { id: true },
    });

    const sendDatabaseEndTime = new Date();
    logger.info(
      `💾 [LivekitListener] Anomaly data saved to database for ${data.camera_id} with speed ${sendDatabaseEndTime.getTime() - sendDatabaseStartTime.getTime()}ms`,
    );

    if (systemSettings?.report_auto_send_email) {
      const emailList = await prisma.emailReceivers.findMany({
        where: { is_activated: true },
        select: { email: true },
      });

      const sendMailStartTime = new Date();

      await MailerService.sendViolenceReportMail(
        emailList.map(receiver => receiver.email),
        'MOCA-Vision Admin',
        camera?.name || 'Unnamed Camera',
        data.label,
        data.confidence,
        newFootage.id,
        videoStartTime,
      );

      const sendMailEndTime = new Date();

      logger.info(
        `📨 [EmailSender] Report Sended to Emails with speed ${sendMailEndTime.getTime() - sendMailStartTime.getTime()}ms`,
      );
    }

    if (systemSettings?.report_auto_send_wa) {
      const waReceiverList = await prisma.waReceivers.findMany({
        where: { is_activated: true },
        select: { name: true, wa_chat_id: true, is_group: true },
      });

      const sendWaStartTime = new Date();

      for (const waReceiver of waReceiverList) {
        await WhatsAppService.sendViolenceDetection(
          waReceiver.name,
          camera?.name || 'Unnamed Camera',
          waReceiver.wa_chat_id,
          waReceiver.is_group,
          data.label,
          data.confidence,
          newFootage.id,
          videoStartTime,
        );

        await sleep(500);
      }

      const sendWaEndTime = new Date();

      logger.info(
        `💚 [WhatsappSender] Report Sended to Whatsapps with speed ${sendWaEndTime.getTime() - sendWaStartTime.getTime()}ms. Average: ${(sendWaEndTime.getTime() - sendWaStartTime.getTime() - 500 * waReceiverList.length) / waReceiverList.length}ms`,
      );
    }
  }
}
