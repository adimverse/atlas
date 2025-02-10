import { z } from "zod";

// Story Elements
export const StoryElementSchema = z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['act', 'scene', 'character', 'plotPoint', 'theme']),
});

// Act Structure
export const ActSchema = z.object({
    title: z.string(),
    scenes: z.array(z.string()),
    keyPoints: z.array(z.string()),
});

// Character Structure
export const CharacterSchema = z.object({
    name: z.string(),
    role: z.string(),
    arc: z.string(),
});

// Complete Story Structure
export const StoryStructureSchema = z.object({
    title: z.string(),
    genre: z.string().optional(),
    acts: z.array(ActSchema),
    characters: z.array(CharacterSchema),
    themes: z.array(z.string()),
    summary: z.string(),
});

// Type exports
export type StoryElement = z.infer<typeof StoryElementSchema>;
export type Act = z.infer<typeof ActSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type StoryStructure = z.infer<typeof StoryStructureSchema>;

// Type guards
export function isStoryStructure(obj: unknown): obj is StoryStructure {
    return StoryStructureSchema.safeParse(obj).success;
}