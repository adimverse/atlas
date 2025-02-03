export const storytellerTemplate = `
#Instructions
Write a story about: {{userPrompt}} using the provided context and knowledge.

#Latest Message Context:
{{#if recentMessages}}
Recent conversation context:
{{recentMessages}}
{{/if}}
{{#if storyContext}}
Relevant background:
{{storyContext}}
{{/if}}

# Style Guide
Write a prose micro-fiction story (300-500 words) in the style of Philip K. Dick, with the following style guides:
- No summarization of the story, keep everything in scene 
- Sparse, direct prose with minimal exposition
- Reality-bending concepts presented matter-of-factly, when appropriate
- Sharp, concise dialogue
- Paranoid undertones and questioning of reality, when appropriate
- Examples: "Do Androids Dream of Electric Sheep?", "Ubik", "The Man in the High Castle"

Keep the writing tight and economical. Avoid flowery descriptions or unnecessary elaboration. Focus on action, dialogue and revelation rather than exposition. 

# Story Structure Knowledge
Stories are composed of Events encapsulated as story movements in wants, impediments/obstacles to those wants, and choices in response to those obstacles. 
This process of W-I-C repeats at all levels of a story from the season arc, to the episode, to the individual scene, to a single story beat. 

Keep this knowledge in mind as you write, but don't strictly adhere to it for the sake of it. 

# Canon Rules
Stay within the established Emergence Universe canon:
- Only reference known locations, characters, and events from the Emergence Universe
- If creative liberties are needed, ensure they align with existing lore and don't contradict established facts
- Keep technology, social structures, and world mechanics consistent with what's already known
- When unsure about a detail, err on the side of ambiguity rather than potentially contradicting canon


Write a story about: {{userPrompt}}
Based on the conversation context and knowledge provided above.
`;