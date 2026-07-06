import { WhatsappQueue } from './whatsapp.processor';

export abstract class WhatsAppService {
  private static whatsappQueue = new WhatsappQueue();

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

    const chatId = this.resolveChatId(wa_chat_id, is_group);

    await this.whatsappQueue.createMessageQueue({
      recepient: chatId,
      message: message,
    });
  }

  static async sendRawMessage(
    wa_chat_id: string,
    is_group: boolean,
    message: string,
  ) {
    const chatId = this.resolveChatId(wa_chat_id, is_group);

    await this.whatsappQueue.createMessageQueue({
      recepient: chatId,
      message: message,
    });
  }

  private static resolveChatId(wa_chat_id: string, isGroup?: boolean): string {
    if (wa_chat_id.endsWith('@c.us') || wa_chat_id.endsWith('@g.us'))
      return wa_chat_id;

    return isGroup ? `${wa_chat_id}@g.us` : `${wa_chat_id}@c.us`;
  }
}
