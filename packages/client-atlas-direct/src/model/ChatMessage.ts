import type { Memory, UUID } from "@elizaos/core"
import type { ChatMessage, PostMemoryRouteInput } from "../utils/schema"


export const mapPostMemoryToPartialMemory = (input: PostMemoryRouteInput, agentId: UUID): Omit<Memory, 'createdAt' | 'similarity' | 'embedding'> => ({
  id: input.message.id as UUID,
  userId: input.userId as UUID,
  agentId,
  roomId: input.message.sessionId as UUID,
  content: {
    text: input.message.text,
    responseType: input.message.type,
    paths: input.message.paths,
    style: input.message.attributes,
    codex: input.message.codex,
    action: undefined,
    actor: input.message.source,
    source: 'direct',
  },
  unique: true,
})

export const mapMemoryToChatMessage = (input: Memory): ChatMessage => ({
  id: input.id as UUID,
  sessionId: input.roomId as string,
  type: input.content.responseType as ChatMessage['type'],
  source: input.content.actor as ChatMessage['source'],
  text: input.content.text,
  attributes: input.content.style,
  codex: input.content.codex,
  paths: input.content.paths,
  createdAt: input.createdAt,
})