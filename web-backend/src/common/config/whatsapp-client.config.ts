import qrcode from 'qrcode-terminal';
import { Client, LocalAuth } from 'whatsapp-web.js';

import { ReporterConfig } from './reporter.config';

const whatsappClient = new Client({
  authStrategy: new LocalAuth({
    clientId: ReporterConfig.Whatsapp.CLIENT_ID,
    dataPath: '../.wawebjs-auth',
  }),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

whatsappClient.on('qr', qr => {
  console.log('WhatsApp QR Code received. Scan to authenticate.');
  qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
  console.log('WhatsApp Client is ready and listening!');
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
whatsappClient.on('message', async message => {
  if (message.body.toLowerCase() === '!ping') {
    await message.reply(
      '*PONG!*\n\n' + `Chat Id: ${message.from}\n` + `_sent at ${new Date()}_`, // eslint-disable-line @typescript-eslint/restrict-template-expressions
    );
  }
});

export { whatsappClient };
