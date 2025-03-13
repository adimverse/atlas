import { z } from 'zod'

export const PostMessageRouteInputSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  query: z.string(),
  userName: z.string().optional(),
  name: z.string().optional(),
})
export type PostMessageRouteInput = z.infer<typeof PostMessageRouteInputSchema>

export const ChatMessageSchema = z.object({
  id: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  type: z.union([z.literal('archive'), z.literal('simulate'), z.literal('story')]).optional(),
  source: z.union([z.literal('ai'), z.literal('human'), z.literal('pending'), z.literal('error')]),
  text: z.string(), 
  version: z.number().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  codex: z.record(z.string(), z.string()).optional(),
  paths: z.record(z.string(), z.string()).optional(),
  createdAt: z.string().optional(),
})
export type ChatMessage = z.infer<typeof ChatMessageSchema>

export const PostMemoryRouteInputSchema = z.object({
  userId: z.string().uuid(),
  message: ChatMessageSchema,
})
export type PostMemoryRouteInput = z.infer<typeof PostMemoryRouteInputSchema>

export const roomUpdateSchema = z.object({
  excerpt: z.string().optional(),
  action: z.boolean().optional(),
})