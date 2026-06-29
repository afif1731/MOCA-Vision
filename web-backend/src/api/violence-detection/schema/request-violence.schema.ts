import { t } from 'elysia';

import { OrderBySchema, PaginationSchema, StringSchema } from '@/common';
import { AnomalyType } from '~/generated/prisma/enums';

export const EditViolenceRequestSchema = t.Partial(
  t.Object({
    is_valid: t.Boolean(),
    is_reported: t.Boolean(),
    report_sent: t.Any(),
  }),
);

export const ViolenceListQuerySchema = t.Object({
  page: PaginationSchema.pageSchema,
  perPage: PaginationSchema.perPageSchema,
  anomalyType: t.Optional(t.Enum(AnomalyType)),
  search: t.Optional(StringSchema.text),
  orderById: OrderBySchema,
  orderByCreatedAt: OrderBySchema,
});

export type IEditViolenceRequest = typeof EditViolenceRequestSchema.static;
export type IViolenceListQuery = typeof ViolenceListQuerySchema.static;
