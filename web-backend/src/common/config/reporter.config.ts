export const ReporterConfig = {
  Email: {
    MAIL_USER: process.env.REPORTER_MAIL_USER || 'MOCA-Vision Auto-Report',
    MAIL_ADDRESS: process.env.REPORTER_MAIL_ADDRESS!,
    MAIL_PASSWORD: process.env.REPORTER_MAIL_PASSWORD!,
  },
  Whatsapp: {
    CLIENT_ID: 'mocavis-wa-sender',
  },
  Telegram: {},
};
