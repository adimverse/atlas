import { z } from 'zod'

/**
 * To be used if attachments are included.
 */
const mediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  source: z.string(),
  description: z.string(),
  text: z.string(),
  contentType: z.string().optional()
})

/**
 * Required elements for inserting a content memory from external chats.
 */
export const memoryContentSchema = z.object({
  text: z.string(),
  responseType: z.string(),
  paths: z.any().optional(),
  style: z.any().optional(),
  codex: z.any().optional(),
  source: z.string().optional(),
  actor: z.union([z.literal("ai"), z.literal("human")]),
  attachments: z.array(mediaSchema).optional()
})

export const roomUpdateSchema = z.object({
  excerpt: z.string().optional(),
  action: z.boolean().optional(),
})