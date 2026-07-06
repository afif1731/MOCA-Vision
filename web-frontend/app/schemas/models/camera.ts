// biome-ignore-all lint/suspicious/noExplicitAny: Too lazy to change the any tbh
import * as v from 'valibot';

import { DeviceStatus } from './edge-device';

export const cameraSourceMap = {
  LOCAL: 'Local Video Device (Webcam, USB)',
  STATIC_FILE: 'Static Video File',
  RTSP_LINK: 'RTSP Link',
} satisfies Record<string, string>;

export const CameraSourceType = {
  LOCAL: 'LOCAL',
  STATIC_FILE: 'STATIC_FILE',
  RTSP_LINK: 'RTSP_LINK',
} as const;

export const CameraSourceSchema = v.enum(CameraSourceType);

export const CameraItemSchema = v.object({
  id: v.string(),
  name: v.string(),
  source: v.string(),
  source_type: CameraSourceSchema,
  status: v.enum(DeviceStatus),
  cv_threshold: v.number(),
  device_id: v.nullable(v.string()),
});

export const CameraDetailSchema = v.object({
  id: v.string(),
  name: v.string(),
  source: v.string(),
  source_type: CameraSourceSchema,
  status: v.enum(DeviceStatus),
  cv_threshold: v.number(),
  error_message: v.nullable(v.string()),
  rtsp_username: v.nullable(v.string()),
  rtsp_password: v.nullable(v.string()),
  device_id: v.nullable(v.string()),
  device: v.nullable(
    v.object({
      id: v.string(),
      name: v.string(),
    })
  ),
});

const CreateCameraBaseSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Camera name required')),
  source: v.pipe(v.string(), v.trim(), v.nonEmpty('Source required')),
  source_type: CameraSourceSchema,
  rtsp_username: v.optional(v.string()),
  rtsp_password: v.optional(v.string()),
  device_id: v.optional(
    v.union([v.pipe(v.string(), v.trim(), v.uuid('Invalid UUID')), v.literal('')])
  ),
});

export const CreateCameraSchema = v.pipe(
  CreateCameraBaseSchema,
  v.check((input: any) => {
    if (input.source_type === 'RTSP_LINK') {
      return !!input.rtsp_username && input.rtsp_username.trim().length > 0;
    }
    return true;
  }, 'RTSP Username required'),
  v.check((input: any) => {
    if (input.source_type === 'RTSP_LINK') {
      return !!input.rtsp_password && input.rtsp_password.trim().length > 0;
    }
    return true;
  }, 'RTSP Password required')
);

const EditCameraBaseSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Camera name required')),
  source: v.pipe(v.string(), v.trim(), v.nonEmpty('Source required')),
  source_type: CameraSourceSchema,
  rtsp_username: v.optional(v.string()),
  rtsp_password: v.optional(v.string()),
  device_id: v.optional(
    v.union([v.pipe(v.string(), v.trim(), v.uuid('Invalid UUID')), v.literal('')])
  ),
  cv_threshold: v.number(),
  error_message: v.optional(v.string()),
});

export const EditCameraSchema = v.pipe(
  EditCameraBaseSchema,
  v.check((input: any) => {
    if (input.source_type === 'RTSP_LINK') {
      return !!input.rtsp_username && input.rtsp_username.trim().length > 0;
    }
    return true;
  }, 'RTSP Username required'),
  v.check((input: any) => {
    if (input.source_type === 'RTSP_LINK') {
      return !!input.rtsp_password && input.rtsp_password.trim().length > 0;
    }
    return true;
  }, 'RTSP Password required')
);

export type ICameraItem = v.InferInput<typeof CameraItemSchema>;
export type ICameraDetail = v.InferInput<typeof CameraDetailSchema>;
export type ICreateCamera = v.InferInput<typeof CreateCameraSchema>;
export type IEditCamera = v.InferInput<typeof EditCameraSchema>;
