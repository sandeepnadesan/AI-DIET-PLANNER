
import { GoogleGenAI, Type } from "@google/genai";
import { FoodAnalysis, AgentDecision, UserProfile, MealRecord } from "../types";

const getApiKey = (): string => {
  // Use a more robust check for the environment variable
  const key = process.env.API_KEY;
  return key || "";
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

/**
 * High-precision vision analysis.
 * Identifies specific species and cooking methods to ensure accurate calorie/protein categorization.
 */
export async function analyzeFoodImage(base64Image: string): Promise<FoodAnalysis> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const prompt = `Perform a high-precision nutritional analysis on this image. 
  1. Identify the specific food item. 
  2. If it is fish, identify the exact variety/species (e.g., Salmon, Cod, Tilapia, Catfish).
  3. Identify the preparation method (e.g., Deep Fried, Pan Seared, Grilled, Breaded).
  4. Categorize Calories, Protein, Carbs, and Fat based on that specific variety and preparation.
  5. Provide the results strictly in JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          foodName: { type: Type.STRING, description: "Detailed name, e.g., 'Golden Fried Cod Fillet'" },
          isFood: { type: Type.BOOLEAN },
          confidence: { type: Type.NUMBER },
          nutrition: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER }
            },
            required: ["calories", "protein", "carbs", "fat"]
          }
        },
        required: ["foodName", "isFood", "confidence", "nutrition"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as FoodAnalysis;
}

/**
 * Strategic Audit Engine.
 * Cross-references daily logs with biometric targets.
 */
export async function getAgentDecision(
  profile: UserProfile,
  history: MealRecord[]
): Promise<AgentDecision> {
  const ai = getAI();
  // Using Flash for faster turn-around in the dashboard, but Pro-preview is also valid.
  const model = "gemini-3-flash-preview"; 

  const totalCalories = history.reduce((sum, m) => sum + m.nutrition.calories, 0);
  const totalProtein = history.reduce((sum, m) => sum + m.nutrition.protein, 0);

  const systemInstruction = `You are STRATOS-AI, an elite Biological Strategist.
  Context: User Goal is ${profile.goal}.
  Daily Target: ${profile.dailyCalorieTarget}kcal, ${profile.dailyProteinTarget}g Protein.
  
  Your Task:
  - Perform a 'Gap Analysis' on current intake.
  - Suggest a SPECIFIC meal or snack to balance the day's macros.
  - Use Google Search tool to find highly-rated recipe links if needed.

  Format:
  STATUS: [OPTIMAL/WARNING/CRITICAL]
  REASONING: [1 sentence analysis]
  ACTION: [Specific tactical instruction]`;

  const mealSummary = history.length > 0 
    ? history.map(m => `- ${m.foodName}: ${m.nutrition.calories}cal, ${m.nutrition.protein}g protein`).join('\n')
    : "No meals logged today yet.";

  const userPrompt = `Current Status:
  Total Calories: ${totalCalories} / ${profile.dailyCalorieTarget}
  Total Protein: ${totalProtein} / ${profile.dailyProteinTarget}
  Logs:\n${mealSummary}`;

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }]
    },
  });

  const text = response.text || "";
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  const suggestedRecipes = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title,
      uri: chunk.web.uri
    })).slice(0, 3);

  // More robust matching for the required format
  const status = text.match(/STATUS:\s*(\w+)/i)?.[1]?.toUpperCase() || "OPTIMAL";
  const reasoning = text.match(/REASONING:\s*([^\n]+)/i)?.[1] || "Maintaining baseline metabolic efficiency.";
  const suggestion = text.match(/ACTION:\s*([^\n]+)/i)?.[1] || "Proceed with standard nutritional schedule.";

  return {
    status: (status as any),
    reasoning,
    suggestion,
    suggestedRecipes
  };
}

export async function askAgent(
  profile: UserProfile,
  history: MealRecord[],
  question: string
): Promise<string> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const totalCalories = history.reduce((sum, m) => sum + m.nutrition.calories, 0);
  const systemInstruction = `You are the STRATOS Personal Diet Agent. 
  Answer the user's question about their diet, exercise, or cravings based on their current status.
  User Goal: ${profile.goal}. 
  Intake so far: ${totalCalories} kcal.`;

  const response = await ai.models.generateContent({
    model,
    contents: question,
    config: { systemInstruction }
  });

  return response.text || "Communication relay failure. Verify API connection.";
}
