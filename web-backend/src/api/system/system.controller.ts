import Elysia from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { AuthPlugin, SuccessResponse } from '@/common';

import {
  SystemSettingsUpdateRequestSchema,
  VideoSampleDeleteRequestSchema,
  VideoSampleUploadRequestSchema,
} from './schema';
import { SystemService } from './system.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SystemController = new Elysia({ name: 'system-controller' })
  .use(AuthPlugin)
  .group('/system', app => {
    app
      .get(
        '/sample-video',
        async () => {
          const result = await SystemService.getAllVideoSample();

          return new SuccessResponse(
            StatusCodes.OK,
            'get all video samples',
            result,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      )
      .post(
        '/sample-video',
        async ({ body }) => {
          const result = await SystemService.uploadVideoSample(body);

          return new SuccessResponse(
            StatusCodes.CREATED,
            'New sample video created',
            result,
          );
        },
        {
          authPlugin: {
            allowed_roles: 'ADMIN',
          },
          body: VideoSampleUploadRequestSchema,
        },
      )
      .delete(
        '/sample-video',
        async ({ body }) => {
          await SystemService.deleteVideoSample(body);

          return new SuccessResponse(StatusCodes.OK, 'Video sample deleted');
        },
        {
          authPlugin: {
            allowed_roles: 'ADMIN',
          },
          body: VideoSampleDeleteRequestSchema,
        },
      )
      .get(
        '/settings',
        async () => {
          const result = await SystemService.getSystemSettings();

          return new SuccessResponse(
            StatusCodes.OK,
            'Get system settings',
            result,
          );
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
        },
      )
      .patch(
        '/settings',
        async ({ body }) => {
          await SystemService.updateSystemSettings(body);

          return new SuccessResponse(StatusCodes.OK, 'System settings updated');
        },
        {
          authPlugin: { allowed_roles: 'ADMIN' },
          body: SystemSettingsUpdateRequestSchema,
        },
      );

    return app;
  });
