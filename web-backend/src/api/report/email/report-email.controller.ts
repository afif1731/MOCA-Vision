import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';

import { ReportEmailService } from './report-email.service';
import {
  CreateEmailRequestSchema,
  EditEmailRequestSchema,
  EmailListQuerySchema,
} from './schema';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ReportEmailController = new Elysia({
  name: 'report-email-controller',
})
  .use(AuthPlugin)
  .group('/email', app => {
    app
      .post(
        '/',
        async ({ body }) => {
          const result = await ReportEmailService.createEmailReceiver(body);

          return new SuccessResponse(
            StatusCodes.CREATED,
            'Email receiver created successfully',
            result,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          body: CreateEmailRequestSchema,
        },
      )
      .get(
        '/',
        async ({ query }) => {
          const result = await ReportEmailService.getEmailReceiverList(query);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get email receiver list successfully',
            result.data,
            result.meta,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          query: EmailListQuerySchema,
        },
      )
      .get(
        '/:id',
        async ({ params: { id } }) => {
          const result = await ReportEmailService.getEmailReceiverDetail(id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get email receiver detail successfully',
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
          await ReportEmailService.editEmailReceiver(id, body);

          return new SuccessResponse(
            StatusCodes.OK,
            'Email receiver edited successfully',
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          body: EditEmailRequestSchema,
        },
      )
      .delete(
        '/:id',
        async ({ params: { id } }) => {
          await ReportEmailService.deleteEmailReceiver(id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Email receiver deleted successfully',
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      );

    return app;
  });
