import { evaluateAIPrompt } from './src/server/services/ai-evaluator';
import prisma from './src/lib/prisma';

async function main() {
  const prompt = await prisma.aiPrompt.findFirst();
  if (!prompt) {
    console.log("No prompt to evaluate");
    return;
  }
  console.log("Evaluating prompt:", prompt.id);
  const result = await evaluateAIPrompt(prompt.id);
  console.log(result);
}

main().catch(console.error);
