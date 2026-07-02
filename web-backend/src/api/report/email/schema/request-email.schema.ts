import { type Static, t } from 'elysia';

export const EmailListQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  per_page: t.Optional(t.Numeric({ default: 10 })),
  search: t.Optional(t.String()),
});
export type IEmailListQuery = Static<typeof EmailListQuerySchema>;

export const CreateEmailRequestSchema = t.Object({
  name: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  is_activated: t.Optional(t.Boolean({ default: true })),
});
export type ICreateEmailRequest = Static<typeof CreateEmailRequestSchema>;

export const EditEmailRequestSchema = t.Partial(CreateEmailRequestSchema);
export type IEditEmailRequest = Static<typeof EditEmailRequestSchema>;
