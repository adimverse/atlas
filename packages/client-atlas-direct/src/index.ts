import { randomBytes } from "crypto";
import * as path from "path";
import * as fs from "fs";
import { z } from 'zod';

import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import multer from "multer";

import {
  type AgentRuntime,
  type Client,
  composeContext,
  type Content,
  elizaLogger,
  generateMessageResponse,
  getEmbeddingZeroVector,
  type IAgentRuntime,
  type Media,
  type Memory,
  ModelClass,
  settings,
  stringToUuid,
  UUID,
  validateUuid
} from "@elizaos/core";
import { createApiRouter } from "./api.ts";
import { makeApiKeyAuthMiddleware } from "./middleware/apiKeyAuth.ts";
import { memoryContentSchema, roomUpdateSchema } from './utils/schema'

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "data", "uploads");
        // Create the directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

// some people have more memory than disk.io
const upload = multer({ storage /*: multer.memoryStorage() */ });

export const messageHandlerTemplate = `
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

The "action" field should be one of the options in [Available Actions].
`

export class DirectClient {
    public app: express.Application;
    private agents: Map<string, AgentRuntime>; // container management
    private server: any; // Store server instance

    constructor() {
        elizaLogger.log("DirectClient constructor");
        this.app = express();
        this.app.use(cors());
        this.app.use(makeApiKeyAuthMiddleware)
        this.agents = new Map();

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        // Serve both uploads and generated images
        this.app.use(
            "/media/uploads",
            express.static(path.join(process.cwd(), "/data/uploads"))
        );
        this.app.use(
            "/media/generated",
            express.static(path.join(process.cwd(), "/generatedImages"))
        );

        const apiRouter = createApiRouter(this.agents, this);
        this.app.use(apiRouter);

        this.app.get("/:agentId/user/:userId/rooms", async (req: express.Request, res: express.Response) => {
          const agentId = req.params.agentId as UUID
          const userId = req.params.userId as UUID
          let runtime = this.agents.get(agentId)
          if (!userId || !agentId || !runtime) {
            res.status(404).send("Missing required params.")
            return
          }
          const rooms = await runtime.databaseAdapter.getRoomsForParticipant(userId)
          res.json(rooms)
        })

        this.app.get("/:agentId/rooms/:roomId/memories", async (req: express.Request, res: express.Response) => {
          const roomId = req.params.roomId as UUID
          const agentId = req.params.agentId as UUID
          let runtime = this.agents.get(agentId)
          if (!roomId || !agentId || !runtime) {
            res.status(404).send("Missing required params.")
            return
          }
          const memories = await runtime.messageManager.getMemoriesByRoomIds({ roomIds: [roomId]})
          res.json(memories)
        })

        this.app.post(
            "/:agentId/message",
            /* @ts-ignore */
            upload.single("file"),
            async (req: express.Request, res: express.Response) => {
                const agentId = req.params.agentId as UUID
                const userId = req.body.userId as UUID
                let roomId = req.body.roomId as UUID
                const runtime = this.agents.get(agentId);
                if (!runtime) {
                  res.status(500)
                  return;
                }
                if (!agentId || !runtime || !userId || roomId ? !validateUuid(roomId) : false) {
                    res.status(404).send("Missing or invalid params.");
                    return;
                }

                if (!roomId ) {
                  roomId = stringToUuid(randomBytes(Math.ceil(32 / 2)).toString('hex').slice(0, 32))
                }

                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );

                const text = req.body.text;
                // if empty text, directly return
                if (!text) {
                    res.json([]);
                    return;
                }

                const messageId = stringToUuid(Date.now().toString());

                const attachments: Media[] = [];
                if (req.file) {
                    const filePath = path.join(
                        process.cwd(),
                        "data",
                        "uploads",
                        req.file.filename
                    );
                    attachments.push({
                        id: Date.now().toString(),
                        url: filePath,
                        title: req.file.originalname,
                        source: "direct",
                        description: `Uploaded file: ${req.file.originalname}`,
                        text: "",
                        contentType: req.file.mimetype,
                    });
                }

                const content: Content = {
                    text,
                    attachments,
                    source: "direct",
                    inReplyTo: undefined,
                };

                const userMessage = {
                    content,
                    userId,
                    roomId,
                    agentId: runtime.agentId,
                };

                const memory: Memory = {
                    id: stringToUuid(messageId + "-" + userId),
                    ...userMessage,
                    agentId: runtime.agentId,
                    userId,
                    roomId,
                    content,
                    createdAt: Date.now(),
                };

                await runtime.messageManager.addEmbeddingToMemory(memory);
                await runtime.messageManager.createMemory(memory);

                let state = await runtime.composeState(userMessage, {
                    agentName: runtime.character.name,
                });

                const context = composeContext({
                    state,
                    template: messageHandlerTemplate,
                });

                console.log('RECENT MESSAGES')
                console.log(state.recentMessages)

                const response = await generateMessageResponse({
                    runtime: runtime,
                    context,
                    modelClass: ModelClass.LARGE,
                });
                response.roomId = roomId
                response.userId = userId

                if (!response) {
                    res.status(500).send(
                        "No response from generateMessageResponse"
                    );
                    return;
                }

                // save response to memory
                const responseMessage: Memory = {
                    id: stringToUuid(messageId + "-" + runtime.agentId),
                    ...userMessage,
                    userId: runtime.agentId,
                    content: response,
                    embedding: getEmbeddingZeroVector(),
                    createdAt: Date.now(),
                };

                await runtime.messageManager.createMemory(responseMessage);

                state = await runtime.updateRecentMessageState(state);

                let message = null as Content | null;

                console.log('primary response', response)
                await runtime.processActions(
                    memory,
                    [responseMessage],
                    state,
                    async (newMessages) => {
                        message = newMessages;
                        return [memory];
                    }
                );

                await runtime.evaluate(memory, state);

                // Check if we should suppress the initial message
                const action = runtime.actions.find(
                    (a) => a.name === response.action
                );
                const shouldSuppressInitialMessage =
                    action?.suppressInitialMessage;

                if (!shouldSuppressInitialMessage) {
                    if (message) {
                        res.json(message);
                    } else {
                        res.json(response);
                    }
                } else {
                    if (message) {
                        res.json(message);
                    } else {
                        res.json({});
                    }
                }
            }
        );

        /**
         * Allows insertion of a memory from other sources.
         */
        this.app.post(
          "/:agentId/memory",
        async (req: express.Request, res: express.Response) => {
          elizaLogger.log('Insert memory request received')
          const agentId = req.params.agentId as UUID
          const userId = req.body.userId as UUID
          const roomId = req.body.roomId as UUID
          const content = req.body.content as Content
          const isContentValid = memoryContentSchema.safeParse(content).success
          if (!agentId || !userId || !validateUuid(roomId) || !isContentValid) {
              res.status(400).send("Missing or invalid params.");
              return;
          }

          const runtime = this.agents.get(agentId);
          if (!runtime) {
            res.sendStatus(500)
            return;
          }

          // add source to content
          content.source = 'direct'

          await runtime.ensureConnection(
            userId,
            roomId,
            req.body.userName,
            req.body.name,
            content.source
          );

          const messageId = stringToUuid(Date.now().toString())
          const userMessage = {
            content,
            userId,
            roomId,
            agentId: runtime.agentId,
          }

          const memory: Memory = {
              id: stringToUuid(`${messageId}-${userId}`),
              ...userMessage,
              agentId: runtime.agentId,
              userId,
              roomId,
              content,
              createdAt: Date.now(),
          };

          await runtime.messageManager.addEmbeddingToMemory(memory);
          await runtime.messageManager.createMemory(memory);
          elizaLogger.info('Memory inserted', userId, roomId, content)

          res.sendStatus(200)
        })

        /**
         * Allows updating a room with new fields.
         */
        this.app.post('/:agentId/rooms/:roomId/update', async (req: express.Request, res: express.Response) => {
          const agentId = req.params.agentId as UUID
          const roomId = req.params.roomId as UUID
          const body = req.body
          const isBodyValid = roomUpdateSchema.safeParse(body).success
          if (!z.string().uuid().safeParse(agentId).success || !z.string().uuid().safeParse(roomId).success || !isBodyValid) {
              res.status(400).send("Missing or invalid params.");
              return;
          }

          const runtime = this.agents.get(agentId)
          if (!runtime) {
            res.sendStatus(500)
            return;
          }

          const result = await runtime.databaseAdapter.updateRoom(roomId, body)
          if (result) {
            res.json(result)
          } else {
            res.status(404).send('room not found')
          }
          return;
        })
    }

    // agent/src/index.ts:startAgent calls this
    public registerAgent(runtime: AgentRuntime) {
        // register any plugin endpoints?
        // but once and only once
        this.agents.set(runtime.agentId, runtime);
    }

    public unregisterAgent(runtime: AgentRuntime) {
        this.agents.delete(runtime.agentId);
    }

    public start(port: number) {
        this.server = this.app.listen(port, () => {
            elizaLogger.success(
                `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`
            );
        });

        // Handle graceful shutdown
        const gracefulShutdown = () => {
            elizaLogger.log("Received shutdown signal, closing server...");
            this.server.close(() => {
                elizaLogger.success("Server closed successfully");
                process.exit(0);
            });

            // Force close after 5 seconds if server hasn't closed
            setTimeout(() => {
                elizaLogger.error(
                    "Could not close connections in time, forcefully shutting down"
                );
                process.exit(1);
            }, 5000);
        };

        // Handle different shutdown signals
        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT", gracefulShutdown);
    }

    public stop() {
        if (this.server) {
            this.server.close(() => {
                elizaLogger.success("Server stopped");
            });
        }
    }
}

export const DirectClientInterface: Client = {
    start: async (_runtime: IAgentRuntime) => {
        elizaLogger.log("DirectClientInterface start");
        const client = new DirectClient();
        const serverPort = Number.parseInt(settings.SERVER_PORT || "3000");
        client.start(serverPort);
        return client;
    },
    stop: async (_runtime: IAgentRuntime, client?: Client) => {
        if (client instanceof DirectClient) {
            client.stop();
        }
    },
};

export default DirectClientInterface;
