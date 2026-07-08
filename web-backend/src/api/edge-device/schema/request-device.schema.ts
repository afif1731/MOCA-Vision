import { t } from 'elysia';

import { OrderBySchema, PaginationSchema, StringSchema } from '@/common';
import { DeviceStatus } from '~/generated/prisma/enums';

export const CreateDeviceRequestSchema = t.Object({
  id: t.Optional(StringSchema.uuid),
  name: StringSchema.text,
  location: StringSchema.text,
  type: StringSchema.text,
  is_inference_active: t.Optional(t.BooleanString()),
  max_cameras: t.Optional(t.Integer()),
});

export const UpdateDeviceRequestSchema = t.Partial(
  t.Object({
    ...CreateDeviceRequestSchema.properties,
    id: t.Undefined(),
    max_cameras: t.Integer({ minimum: 1 }),
    status: t.Enum(DeviceStatus),
    error_message: StringSchema.paragraph,
  }),
);

export const GetAllDeviceQuerySchema = t.Object({
  page: PaginationSchema.pageSchema,
  perPage: PaginationSchema.perPageSchema,
  status: t.Optional(t.Enum(DeviceStatus)),
  search: t.Optional(StringSchema.text),
  orderByName: OrderBySchema,
  orderByType: OrderBySchema,
  orderByLocation: OrderBySchema,
  orderById: OrderBySchema,
});

export const GetDeviceCameraQuerySchema = t.Object({
  timestamp: t.Date(),
  signature: StringSchema.id,
});

export type ICreateDeviceRequest = typeof CreateDeviceRequestSchema.static;
export type IUpdateDeviceRequest = typeof UpdateDeviceRequestSchema.static;
export type IGetAllDeviceQuery = typeof GetAllDeviceQuerySchema.static;
export type IGetDevicecCameraQuery = typeof GetDeviceCameraQuerySchema.static;
