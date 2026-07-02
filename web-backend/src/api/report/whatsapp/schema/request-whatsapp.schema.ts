import { type Static, t } from 'elysia';

export const WhatsappListQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  per_page: t.Optional(t.Numeric({ default: 10 })),
  search: t.Optional(t.String()),
});
export type IWhatsappListQuery = Static<typeof WhatsappListQuerySchema>;

export const CreateWhatsappRequestSchema = t.Object({
  name: t.String({ minLength: 1 }),
  wa_chat_id: t.String({ minLength: 1 }),
  is_group: t.Optional(t.Boolean({ default: false })),
  is_activated: t.Optional(t.Boolean({ default: true })),
});
export type ICreateWhatsappRequest = Static<typeof CreateWhatsappRequestSchema>;

export const EditWhatsappRequestSchema = t.Partial(CreateWhatsappRequestSchema);
export type IEditWhatsappRequest = Static<typeof EditWhatsappRequestSchema>;
