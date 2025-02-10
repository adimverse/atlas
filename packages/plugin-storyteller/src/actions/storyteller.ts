import { z } from "zod";
import {
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    composeContext,
    generateObject,
    ModelClass,
    elizaLogger,
    HandlerCallback,
} from "@elizaos/core";
import { storytellerTemplate } from "../templates/storytellerTemplate";
import { v4 as uuidv4 } from "uuid";
import { randomUUID } from "crypto";
export const storytellerAction: Action = {
    name: "STORYTELLER",
    similes: [
        "STORY",
    ],
    suppressInitialMessage: true,
    validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
        // Only require a direct prompt
        return message?.content?.text?.length > 0;
    },
    description:
        "Call this when you want to tell a story set within the world of the Emergence Universe, or if the user directly requests an archive entry or fragment. The story must be in line with Emergence canon, meaning don't make up anything that directly contradicts canon. Do not call this action if the conversation does not call for a story.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            elizaLogger.info("Starting storyteller handler with:", {
                messageText: message?.content?.text,
                hasState: !!state
            });

            const context = composeContext({
                state: {
                    ...state,
                    userPrompt: message?.content?.text,
                    recentMessages: state?.recentMessages,
                    storyContext: state?.providers || ""
                },
                template: storytellerTemplate,
            });

            elizaLogger.debug("Generated context:", context);

            const StoryResponseSchema = z.object({ story: z.string() });
            type StoryResponse = z.infer<typeof StoryResponseSchema>;

            const storyContent = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.LARGE,
                schema: StoryResponseSchema,
            });

            elizaLogger.debug("Generated story content:", storyContent);

            // Log the raw response first
            elizaLogger.info("Raw story response:", {
                type: typeof storyContent.object,
                content: storyContent.object
            });

            if (state) {
                // Clean up the story text by removing extra newlines
                const story = (storyContent.object as StoryResponse).story.trim();
                const fragmentId = Math.random().toString(36).substring(2, 7).toUpperCase();
                const formattedStory = `Generating Archive Fragment ${fragmentId}:\n\n${story}`;


                // Create memory with embedding
                const memoryWithEmbedding = await runtime.messageManager.addEmbeddingToMemory({
                    id: randomUUID(),
                    roomId: message.roomId,
                    userId: runtime.agentId,
                    agentId: runtime.agentId,
                    createdAt: Date.now(),
                    content: {
                        text: formattedStory,
                        type: 'story',
                        metadata: {
                            prompt: message.content.text,
                            timestamp: Date.now()
                        }
                    }
                });
                // Save the story as a tagged memory
                await runtime.messageManager.createMemory(memoryWithEmbedding);


                state.generatedStory = formattedStory;
                state.lastStoryGeneratedAt = new Date().toISOString();
                elizaLogger.info("Story saved to state:", { 
                    storyLength: story.length,
                });

                // Use the callback to directly send the story response
                if (callback) {
                    callback({
                        type: "story",
                        text: formattedStory,
                        action: "COMPLETE"
                    });
                    elizaLogger.info("Story sent via callback");
                }
            }

            elizaLogger.info("Successfully generated story");
            return true;
        } catch (error) {
            elizaLogger.error("Error generating story:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Tell me a story about the Shard" },
            },
            {
                user: "{{user2}}",
                content: { text: "I'd love to share a tale about the Shards discovery of...", action: "STORYTELLING" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "The Kind probably recouped after the great battle..." },
            },
            {
                user: "{{user2}}",
                content: { 
                    text: "Let's tell a story about the Kind where...",
                    action: "STORYTELLING"
                },
            },
        ]
    ] as ActionExample[][],
} as Action;
