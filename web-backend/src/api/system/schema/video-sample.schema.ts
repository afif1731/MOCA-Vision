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

export type IVideoSampleUploadRequest =
  typeof VideoSampleUploadRequestSchema.static;

export type IVideoSampleDeleteRequest =
  typeof VideoSampleDeleteRequestSchema.static;
