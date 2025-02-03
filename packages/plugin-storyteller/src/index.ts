import { Plugin } from "@elizaos/core";

import { storytellerAction } from "./actions/storyteller.ts";
import { factEvaluator } from "./evaluators/fact.ts";
import { goalEvaluator } from "./evaluators/goal.ts";
import { boredomProvider } from "./providers/boredom.ts";
import { factsProvider } from "./providers/facts.ts";
import { timeProvider } from "./providers/time.ts";
import { storytellerProvider } from "./providers/storytellerProvider";
import { queryArchiveAction } from "./actions/queryarchive";

export * as actions from "./actions/index.ts";
export * as evaluators from "./evaluators/index.ts";
export * as providers from "./providers/index.ts";

export const storytellerPlugin: Plugin = {
    name: "storyteller",
    description: "Agent storyteller with basic actions and evaluators",
    actions: [
        storytellerAction,
        queryArchiveAction
        
    ],
    evaluators: [factEvaluator, goalEvaluator],
    providers: [boredomProvider, timeProvider, factsProvider, storytellerProvider],
};

export default storytellerPlugin;
