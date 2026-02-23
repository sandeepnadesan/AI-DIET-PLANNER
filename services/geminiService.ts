
import { GoogleGenAI, Type } from "@google/genai";
import { FoodAnalysis, AgentDecision, UserProfile, MealRecord, Language } from "../types";

const getApiKey = (): string => {
  const key = process.env.API_KEY;
  return key || "";
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

/**
 * High-precision multimodal vision analysis.
 * Uses government-standard nutritional data (USDA/WHO guidelines) for estimation.
 */
export async function analyzeFoodImage(
  base64Image: string, 
  userDescription?: string,
  lang: Language = Language.ENGLISH
): Promise<FoodAnalysis> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const descriptionPart = userDescription ? `The user provided this additional context: "${userDescription}". ` : "";

  const prompt = `Perform a high-precision nutritional analysis on this image. 
  ${descriptionPart}
  
  CRITICAL INSTRUCTIONS:
  1. Identify the specific food item. 
  2. Use official government nutritional databases (like USDA FoodData Central or WHO standards) as the primary reference for all estimations.
  3. If it is fish, identify the exact variety/species (e.g., Salmon, Cod, Tilapia, Catfish). If the user provided a description, prioritize their input.
  4. Identify the preparation method (e.g., Deep Fried, Pan Seared, Grilled, Breaded).
  5. Categorize Calories, Protein, Carbs, and Fat based on the variety and preparation.
  6. Provide the results strictly in JSON format.
  7. Ensure the foodName is descriptive and accurate.
  8. Language for foodName: ${lang === Language.TAMIL ? 'Tamil' : lang === Language.FRENCH ? 'French' : 'English'}.`;

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
          foodName: { type: Type.STRING, description: "Detailed name" },
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

export async function getAgentDecision(
  profile: UserProfile,
  history: MealRecord[],
  lang: Language = Language.ENGLISH
): Promise<AgentDecision> {
  const ai = getAI();
  const model = "gemini-3-flash-preview"; 

  const totalCalories = history.reduce((sum, m) => sum + m.nutrition.calories, 0);
  const totalProtein = history.reduce((sum, m) => sum + m.nutrition.protein, 0);

  const systemInstruction = `You are STRATOS-AI, an elite Biological Strategist.
  Context: User Goal is ${profile.goal}.
  Daily Target: ${profile.dailyCalorieTarget}kcal, ${profile.dailyProteinTarget}g Protein.
  
  Your Task:
  - Perform a 'Gap Analysis' on current intake based on WHO/USDA nutritional standards.
  - Suggest a SPECIFIC meal or snack to balance the day's macros.
  - Use Google Search tool to find highly-rated recipe links if needed.
  - RESPONSE LANGUAGE: ${lang === Language.TAMIL ? 'Tamil' : lang === Language.FRENCH ? 'French' : 'English'}.

  Format:
  STATUS: [OPTIMAL/WARNING/CRITICAL]
  REASONING: [1 sentence analysis in ${lang}]
  ACTION: [Specific tactical instruction in ${lang}]`;

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

  const statusMatch = text.match(/STATUS:\s*(\w+)/i);
  const reasoningMatch = text.match(/REASONING:\s*([^\n]+)/i);
  const actionMatch = text.match(/ACTION:\s*([^\n]+)/i);

  return {
    status: (statusMatch?.[1]?.toUpperCase() as any) || "OPTIMAL",
    reasoning: reasoningMatch?.[1] || "Maintaining baseline metabolic efficiency.",
    suggestion: actionMatch?.[1] || "Proceed with standard nutritional schedule.",
    suggestedRecipes
  };
}

export async function askAgent(
  profile: UserProfile,
  history: MealRecord[],
  question: string,
  lang: Language = Language.ENGLISH
): Promise<string> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const totalCalories = history.reduce((sum, m) => sum + m.nutrition.calories, 0);
  const systemInstruction = `You are the STRATOS Personal Diet Agent. 
  Answer the user's question about their diet, exercise, or cravings based on their current status.
  Use official nutritional data standards (USDA/WHO) for all advice.
  User Goal: ${profile.goal}. 
  Intake so far: ${totalCalories} kcal.
  
  LANGUAGE PROTOCOL:
  1. Detect the language and style of the user's input.
  2. Respond in the EXACT SAME language and style as the user.
  3. If the user uses "Tanglish" (Tamil words written in English/Latin script), you MUST respond in Tanglish.
  4. If the user uses English, respond in English.
  5. If the user uses Tamil script, respond in Tamil script.
  6. The default UI language is ${lang === Language.TAMIL ? 'Tamil' : lang === Language.FRENCH ? 'French' : 'English'}, but user input style takes precedence.`;

  const response = await ai.models.generateContent({
    model,
    contents: question,
    config: { systemInstruction }
  });

  return response.text || "Communication relay failure. Verify API connection.";
}

