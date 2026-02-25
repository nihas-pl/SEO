import OpenAI from 'openai';
import prisma from '@/lib/prisma';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Executes a single AI Prompt evaluation.
 * - Sends the user's saved prompt to an LLM.
 * - Checks if the target brand is in the response.
 * - Saves the evaluation results to the database.
 */
export async function evaluateAIPrompt(promptId: string) {
    // 1. Fetch the prompt details
    const promptData = await prisma.aIPrompt.findUnique({
        where: { id: promptId }
    });

    if (!promptData) {
        throw new Error(`AIPrompt with ID ${promptId} not found.`);
    }

    const { prompt, targetBrand } = promptData;
    const provider = "OpenAI";
    const modelUsed = "gpt-4o";

    try {
        console.log(`[AI Evaluator] Running prompt: "${prompt}" for brand "${targetBrand}"...`);

        // 2. Call the LLM
        // We simulate a neutral user asking for recommendations.
        const completion = await openai.chat.completions.create({
            model: modelUsed,
            temperature: 0.3, // Lower temperature for more consistent, factual software recommendations
            messages: [
                {
                    role: "system",
                    content: "You are a helpful AI assistant. Provide objective, high-quality recommendations based on the user's query. List the names of the tools, products, or brands you recommend."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
        });

        const rawResponse = completion.choices[0]?.message?.content || "";

        // 3. Analyze the response for the Target Brand
        // Simple case-insensitive match for now.
        const mentionedBrand = rawResponse.toLowerCase().includes(targetBrand.toLowerCase());

        console.log(`[AI Evaluator] Brand "${targetBrand}" mentioned: ${mentionedBrand}`);

        // 4. Save the evaluation to the database
        const evaluation = await prisma.aIEvaluation.create({
            data: {
                promptId: promptData.id,
                provider: provider,
                modelUsed: modelUsed,
                rawResponse: rawResponse,
                mentionedBrand: mentionedBrand,
            }
        });

        return evaluation;

    } catch (error: any) {
        console.error(`[AI Evaluator] Failed to evaluate prompt ${promptId}:`, error);
        throw error;
    }
}
