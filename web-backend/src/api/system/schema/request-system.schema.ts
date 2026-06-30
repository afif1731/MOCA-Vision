import { t } from 'elysia';

import { ALLOWED_VIDEO_TYPE, StringSchema } from '@/common';

export const VideoSampleUploadRequestSchema = t.Object({
  video_file: t.File({
    type: [...ALLOWED_VIDEO_TYPE],
    error: 'Not supported video file format',
    maxSize: '60m',
  }),
});

export const VideoSampleDeleteRequestSchema = t.Object({
  video_name: StringSchema.text,
});

export const SystemSettingsUpdateRequestSchema = t.Partial(
  t.Object({
    video_retention_days: t.Integer({ minimum: 1 }),
    report_auto_send_wa: t.BooleanString(),
    report_auto_send_email: t.BooleanString(),
  }),
);

export type IVideoSampleUploadRequest =
  typeof VideoSampleUploadRequestSchema.static;

export type IVideoSampleDeleteRequest =
  typeof VideoSampleDeleteRequestSchema.static;

export type ISystemSettingsUpdateRequest =
  typeof SystemSettingsUpdateRequestSchema.static;
