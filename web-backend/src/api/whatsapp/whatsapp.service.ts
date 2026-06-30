import { whatsappClient } from '@/common';

export abstract class WhatsAppService {
  static async sendViolenceDetection(
    name: string,
    camera_name: string,
    wa_chat_id: string,
    is_group: boolean,
    violence_label: string,
    violence_confidence: number,
    footage_id: string,
    video_start: Date,
  ) {
    const videoUrl =
      (process.env.FE_URL || 'http://localhost:3000') +
      '/footage-log/' +
      footage_id;

    const message =
      '*🚨 Violence Detected! 🚨*\n' +
      `Hi ${name}, MOCA-Vision have detected a new violence activity, here's the detail:\n\n` +
      `*Camera:* ${camera_name}\n` +
      `*Violence Type:* ${violence_label}\n` +
      `*Confidence:* ${(violence_confidence * 100).toFixed(2)}%\n` +
      `*Footage:* ${videoUrl}\n\n` +
      `Violence detected at ${new Date(
        video_start.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }),
      ).toLocaleDateString(
        'id-ID',
      )}. Please check the footage at MOCA-Vision Dashboard`;

    const chatId = `${wa_chat_id.split('@')[0]}${is_group ? '@g.us' : '@c.us'}`;

    await whatsappClient.sendMessage(chatId, message);
  }
}
