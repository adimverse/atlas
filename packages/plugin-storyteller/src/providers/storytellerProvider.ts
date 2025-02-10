import { Provider, IAgentRuntime, Memory, State, UUID, embed, elizaLogger, knowledge, Content, AgentRuntime } from "@elizaos/core";

// Helper to sanitize text for output
const sanitizeOutput = (text: string): string => {
    return text.replace(/[^\x20-\x7E]/g, ''); // Keep basic ASCII only
};

const getRelevantStories = async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    if (!message?.content?.text || !state?.roomId) {
        elizaLogger.debug("Missing data for story retrieval");
        return "";
    }

    try {
        const embedding = await embed(runtime, message.content.text.trim());
        const relevantStories = (await runtime.messageManager.searchMemoriesByEmbedding(
            embedding,
            {
                roomId: state.roomId as UUID,
                count: 10,
                match_threshold: 0.7,
                unique: true
            }
        )).filter(memory => memory.content.type === 'story').slice(0, 3);

        return relevantStories
            .map(memory => sanitizeOutput(`Previous story: ${memory.content.text}`))
            .join('\n\n');
    } catch (error) {
        elizaLogger.error("Error getting relevant stories:", error);
        return "";
    }
};

export const storytellerProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        if (!state?.actionName || state.actionName !== 'storyteller') {
            return "";
        }
        if (!message?.content?.text || !state?.roomId) {
            elizaLogger.debug("Missing required data for storyteller");
            return "";
        }

        try {
            // Get recent messages using messageManager
            const recentMessages = await runtime.messageManager.getMemories({
                roomId: state.roomId as UUID,
                count: 3,
                unique: true,
            });
            elizaLogger.debug("Recent messages retrieved:", {
                count: recentMessages.length,
                messages: recentMessages.map(msg => ({
                    id: msg.id,
                    text: msg.content.text?.substring(0, 100),
                    type: msg.content.type
                }))
            });

            // Get knowledge for each message including current
            const knowledgePromises = [message, ...recentMessages].map(async (msg) => {
                if (!msg?.content?.text) return [];
                return await knowledge.getFragments(runtime as AgentRuntime, msg, 2);
            });

            // Get relevant stories
            const relevantStories = await getRelevantStories(runtime, message, state);

            // Wait for all knowledge queries
            const allKnowledge = (await Promise.all(knowledgePromises))
                .flat()
                .filter(Boolean);

            // Deduplicate knowledge by content
            const uniqueKnowledge = Array.from(
                new Map(allKnowledge.map(item => [item.content.text, item]))
                .values()
            );

            elizaLogger.debug("Retrieved context:", {
                knowledgeCount: uniqueKnowledge.length,
                hasStories: !!relevantStories
            });

            // If we have no context, return empty
            if (!uniqueKnowledge.length && !relevantStories) {
                elizaLogger.debug("No context available");
                return "";
            }

            // Format the context
            const sections = [
                "# Canon Reference Material",
                "The following fragments are taken from established canon in the Emergence Universe and can be used as context and inspiration:",
                uniqueKnowledge.map(k => `- ${sanitizeOutput(k.content.text)}`).join('\n'),
            ];

            if (relevantStories) {
                sections.push(
                    "",
                    "# Previous Stories",
                    "You can draw inspiration from these related stories:",
                    relevantStories
                );
            }

            const formattedContent = sections.filter(Boolean).join('\n');
            
            elizaLogger.debug("Storyteller provider output:", {
                contentLength: formattedContent.length,
                knowledgeCount: uniqueKnowledge.length,
                hasStories: !!relevantStories,
                preview: formattedContent.substring(0, 100)
            });

            return formattedContent;

        } catch (error) {
            elizaLogger.error("Error in storyteller provider:", error);
            return "";
        }
    }
};