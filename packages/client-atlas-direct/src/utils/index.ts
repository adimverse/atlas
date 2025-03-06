import { validateUuid, type UUID } from "@elizaos/core";
import express from "express";

export interface UUIDParams {
  agentId: UUID;
  roomId?: UUID;
}

export function validateUUIDParams(
  params: { agentId: string; roomId?: string; },
  res: express.Response): UUIDParams | null {
  const agentId = validateUuid(params.agentId);
  if (!agentId) {
    res.status(400).json({
      error: "Invalid AgentId format. Expected to be a UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    });
    return null;
  }

  if (params.roomId) {
    const roomId = validateUuid(params.roomId);
    if (!roomId) {
      res.status(400).json({
        error: "Invalid RoomId format. Expected to be a UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      });
      return null;
    }
    return { agentId, roomId };
  }

  return { agentId };
}

