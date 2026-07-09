import { t } from 'elysia';

import { StringSchema } from './string.schema';

export const ViolenceEventLabel = {
  normal_event: 'normal_event',
  assault: 'assault',
  fighting: 'fighting',
  robbery: 'robbery',
  shooting: 'shooting',
  analyzing: 'analyzing',
} as const;

export type IViolenceEventLabel = keyof typeof ViolenceEventLabel;

export const ViolenceEventSchema = t.Object({
  group_id: t.Integer(),
  num_persons: t.Integer(),
  label: t.Enum(ViolenceEventLabel),
  confidence: t.Numeric(),
});

export const ViolenceDetectionPayloadSchema = t.Object({
  camera_id: StringSchema.uuid,
  events: t.Array(ViolenceEventSchema),
});

export type IViolenceEvent = typeof ViolenceEventSchema.static;
export type IViolenceDetectionPayload =
  typeof ViolenceDetectionPayloadSchema.static;

export interface IViolenceRecordSession {
  cameraId: string;
  frames: Buffer[];
  remaining: number;
  width?: number;
  height?: number;
  highestConfidence: number;
  detectedLabel: IViolenceEventLabel;
  targetSize?: number;
  lastValidBuffer?: Buffer;
}
