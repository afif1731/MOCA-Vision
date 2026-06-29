import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';

import { EditViolenceRequestSchema, ViolenceListQuerySchema } from './schema';
import { ViolenceService } from './violence.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ViolenceController = new Elysia({ name: 'violence-controller' })
  .use(AuthPlugin)
  .group('/violence-detection', app => {
    app
      .get(
        '/',
        async ({ query }) => {
          const result = await ViolenceService.getViolenceList(query);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get violence list successfully',
            result.data,
            result.meta,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          query: ViolenceListQuerySchema,
        },
      )
      .post(
        '/record-dummy/:camera_id',
        async ({ params: { camera_id } }) => {
          await ViolenceService.recordDummyViolence(camera_id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Dummy recording triggered successfully',
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      )
      .get(
        '/:anomaly_id',
        async ({ params: { anomaly_id } }) => {
          const result = await ViolenceService.getViolenceDetail(anomaly_id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Get violence detail successfully',
            result,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      )
      .patch(
        '/:anomaly_id',
        async ({ params: { anomaly_id }, body }) => {
          await ViolenceService.editViolence(anomaly_id, body);

          return new SuccessResponse(
            StatusCodes.OK,
            'Violence record edited successfully',
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          body: EditViolenceRequestSchema,
        },
      )
      .delete(
        '/:anomaly_id',
        async ({ params: { anomaly_id } }) => {
          await ViolenceService.deleteViolence(anomaly_id);

          return new SuccessResponse(
            StatusCodes.OK,
            'Violence record deleted successfully',
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      );

    return app;
  });
