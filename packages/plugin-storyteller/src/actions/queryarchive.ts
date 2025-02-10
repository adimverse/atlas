import { z } from "zod";
import {
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    ModelClass,
    elizaLogger,
    HandlerCallback,
    generateObject,
    knowledge,
} from "@elizaos/core";
import { AgentRuntime } from "@elizaos/core";
import { randomUUID } from "crypto";

const QuerySchema = z.object({
    query: z.string().describe("The refined search query")
});
type QueryResult = z.infer<typeof QuerySchema>;

async function constructAIQuery(runtime: IAgentRuntime, message: Memory): Promise<string> {
    try {
        const recentMessages = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: 3,
            unique: false,
        });

        const context = `
Current query: "${message.content.text}"

Recent conversation:
${recentMessages.map(msg => msg.content.text).join('\n')}

Instructions: Based on the conversation context and current query, construct a focused search query to find the most relevant information. Include keywords and phrases that are relevant to the conversation.
`;

        const result = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
            schema: QuerySchema,
        });

        elizaLogger.debug("AI Query Construction:", {
            originalQuery: message.content.text,
            constructedQuery: (result.object as QueryResult).query
        });

        return (result.object as QueryResult).query;

    } catch (error) {
        elizaLogger.error("Error constructing AI query:", error);
        return message.content.text; // Fallback to original query
    }
}


export const queryArchiveAction: Action = {
    name: "QUERYARCHIVE",
    similes: [
        "SEARCH_ARCHIVE",
        "CHECK_RECORDS",
        "ACCESS_ARCHIVE"
    ],
    suppressInitialMessage: true,
    description:
        "Call this when you want to search the knowledge base for specific information about the Emergence Universe. Always call this before telling a story, or when you dont have enough context to resond, call it befoe the response. Use the query parameter to specify what information you're looking for. The results will be stored in state for use in your response.",
    validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
        return message?.content?.text?.length > 0;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            elizaLogger.info("Starting archive query handler with:", {
                query: message?.content?.text,
            });
    
            // Get relevant knowledge using our new function
            const aiQuery = await constructAIQuery(runtime, message);
            const relevantKnowledge = await knowledge.getFragments(runtime as AgentRuntime, {
                ...message,
                content: { 
                    ...message.content,
                    text: aiQuery
                }
            }, 3);
            
            // Format the knowledge for state
            const formattedKnowledge = relevantKnowledge
                .map(k => k.content.text)
                .join('\n\n');
    
            const memoryWithEmbedding = await runtime.messageManager.addEmbeddingToMemory({
                id: randomUUID(),
                roomId: message.roomId,
                userId: runtime.agentId,
                agentId: runtime.agentId,
                createdAt: Date.now(),
                content: {
                    text: `Query Results for "${message.content.text}":\n${formattedKnowledge}`,
                    type: 'archive_result'
                }
            });
                
            await runtime.messageManager.createMemory(memoryWithEmbedding);
    
            if (state) {
                state.lastQuery = message?.content?.text;
                state.queryResults = formattedKnowledge;
                
                if (callback) {
                    callback({
                        type: "archive_response",
                        action: "COMPLETE",
                        text: ""
                    });
                }
            }
    
            elizaLogger.info("Successfully queried archive");
            return true;
        } catch (error) {
            elizaLogger.error("Error querying archive:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "What do we know about the Shard's belief system?" },
            },
            {
                user: "{{user2}}",
                content: { 
                    text: "The Shard believe the White Fountain relics were sent here for a reason. They see themselves as chosen ones, believing that various races in our galaxy are being tested...",
                    action: "QUERYARCHIVE" 
                },
            },
        ],
        // ... other examples
    ] as ActionExample[][],
} as Action;