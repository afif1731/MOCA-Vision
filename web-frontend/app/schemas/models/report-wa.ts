import * as v from 'valibot';

export const WhatsappReceiverItemSchema = v.object({
  id: v.string(),
  name: v.string(),
  wa_chat_id: v.string(),
  is_group: v.boolean(),
  is_activated: v.boolean(),
  created_at: v.string(),
  updated_at: v.string(),
});

export const WhatsappReceiverDetailSchema = v.object({
  id: v.string(),
  name: v.string(),
  wa_chat_id: v.string(),
  is_group: v.boolean(),
  is_activated: v.boolean(),
  created_at: v.string(),
  updated_at: v.string(),
});

export const CreateWhatsappReceiverSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Name is required')),
  wa_chat_id: v.pipe(v.string(), v.trim(), v.nonEmpty('WhatsApp Chat ID is required')),
  is_group: v.boolean(),
  is_activated: v.optional(v.boolean(), true),
});

export const EditWhatsappReceiverSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Name is required')),
  wa_chat_id: v.pipe(v.string(), v.trim(), v.nonEmpty('WhatsApp Chat ID is required')),
  is_group: v.optional(v.boolean(), undefined),
  is_activated: v.optional(v.boolean(), undefined),
});

export type IWhatsappReceiverItem = v.InferInput<typeof WhatsappReceiverItemSchema>;
export type IWhatsappReceiverDetail = v.InferInput<typeof WhatsappReceiverDetailSchema>;
export type ICreateWhatsappReceiver = v.InferInput<typeof CreateWhatsappReceiverSchema>;
export type IEditWhatsappReceiver = v.InferInput<typeof EditWhatsappReceiverSchema>;
