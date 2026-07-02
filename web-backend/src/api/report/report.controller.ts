import Elysia from 'elysia';

import { ReportEmailController } from './email/report-email.controller';
import { ReportWhatsappController } from './whatsapp/report-whatsapp.controller';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ReportController = new Elysia({ name: 'report-controller' }).group(
  '/report',
  app => {
    app.use(ReportEmailController);
    app.use(ReportWhatsappController);

    return app;
  },
);
