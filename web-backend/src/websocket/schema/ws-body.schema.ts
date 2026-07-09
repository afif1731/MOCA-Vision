import { t } from 'elysia';

import { ViolenceDetectionPayloadSchema } from '@/common';

export const WebsocketBodySchema = t.Union([
  t.Object({
    type: t.Literal('violence_detection'),
    payload: ViolenceDetectionPayloadSchema,
  }),
  t.Object({ type: t.Literal('heartbeat') }),
]);
