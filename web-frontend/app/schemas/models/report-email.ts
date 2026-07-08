import * as v from 'valibot';

export const EmailReceiverItemSchema = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  is_activated: v.boolean(),
  created_at: v.string(),
  updated_at: v.string(),
});

export const EmailReceiverDetailSchema = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  is_activated: v.boolean(),
  created_at: v.string(),
  updated_at: v.string(),
});

export const CreateEmailReceiverSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Name is required')),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Email is required'),
    v.email('Invalid email address')
  ),
  is_activated: v.optional(v.boolean(), true),
});

export const EditEmailReceiverSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Name is required')),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Email is required'),
    v.email('Invalid email address')
  ),
  is_activated: v.optional(v.boolean(), undefined),
});

export type IEmailReceiverItem = v.InferInput<typeof EmailReceiverItemSchema>;
export type IEmailReceiverDetail = v.InferInput<typeof EmailReceiverDetailSchema>;
export type ICreateEmailReceiver = v.InferInput<typeof CreateEmailReceiverSchema>;
export type IEditEmailReceiver = v.InferInput<typeof EditEmailReceiverSchema>;
