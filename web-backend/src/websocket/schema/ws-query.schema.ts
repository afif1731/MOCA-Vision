import { t } from 'elysia';

import { StringSchema } from '@/common';

export const WebsocketEdgeQuerySchema = t.Object({
  device_id: StringSchema.uuid,
  secret: t.String(),
  timestamp: t.Numeric(),
});
