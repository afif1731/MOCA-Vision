import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';

import { ReportWhatsappService } from './report-whatsapp.service';
import {
  CreateWhatsappRequestSchema,
  EditWhatsappRequestSchema,
  WhatsappListQuerySchema,
} from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ReportWhatsappController = new Elysia({
  name: 'report-wa-controller',
})
  .use(AuthPlugin)
  .group('/wa', app => {
    app
      .post(
        '/',
        async ({ body }) => {
          const result =
            await ReportWhatsappService.createWhatsappReceiver(body);

          return new SuccessResponse(
            StatusCodes.CREATED,
            'WhatsApp receiver created successfully',
            result,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          body: CreateWhatsappRequestSchema,
        },
      )
      .get(
        '/',
        async ({ query }) => {
          const result =
            await ReportWhatsappService.getWhatsappReceiverList(query);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get WhatsApp receiver list successfully',
            result.data,
            result.meta,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          query: WhatsappListQuerySchema,
        },
      )
      .get(
        '/:id',
        async ({ params: { id } }) => {
          const result =
            await ReportWhatsappService.getWhatsappReceiverDetail(id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get WhatsApp receiver detail successfully',
            result,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      )
      .patch(
        '/:id',
        async ({ params: { id }, body }) => {
          await ReportWhatsappService.editWhatsappReceiver(id, body);

          return new SuccessResponse(
            StatusCodes.OK,
            'WhatsApp receiver edited successfully',
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          body: EditWhatsappRequestSchema,
        },
      )
      .delete(
        '/:id',
        async ({ params: { id } }) => {
          await ReportWhatsappService.deleteWhatsappReceiver(id);

          return new SuccessResponse(
            StatusCodes.OK,
            'WhatsApp receiver deleted successfully',
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      );

    return app;
  });
