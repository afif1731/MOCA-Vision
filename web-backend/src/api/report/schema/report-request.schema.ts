import { t } from 'elysia';

import { StringSchema, ViolenceEventLabel } from '@/common';

export const CreateViolenceReportSchema = t.Object({
  camera_id: StringSchema.uuid,
  label: t.Enum(ViolenceEventLabel),
  confidence: t.Numeric(),
  duration: t.Numeric(),
  video_path: t.Optional(StringSchema.longtext),
});

export type ICreateViolenceReport = typeof CreateViolenceReportSchema.static;
