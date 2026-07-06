import { t } from 'elysia';

export const WhatsappMessageSchema = t.Object({
  message: t.String(),
  recepient: t.String(),
});

export type IWhatsappMessage = typeof WhatsappMessageSchema.static;
