
import { GoogleGenAI, Type } from "@google/genai";
import { FoodAnalysis, AgentDecision, UserProfile, MealRecord } from "../types";

const getApiKey = (): string => {
  try {
    const envKey = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
    return envKey || "";
  } catch (e) {
    return "";
  }
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

/**
 * Analyzes food images with high specificity. 
 * Instructed to identify varieties (e.g., Cod vs Salmon) and prep methods (e.g., Fried, Grilled).
 */
export async function analyzeFoodImage(base64Image: string): Promise<FoodAnalysis> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const prompt = `Identify the specific food item in this image with high detail. 
  If it is fish, identify the variety (e.g., Salmon, Cod, Tilapia). 
  Analyze preparation method (e.g., Fried, Breaded, Steamed, Grilled). 
  Calculate nutrition based on this specific variety and preparation.
  Provide response strictly in JSON format.`;

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
          foodName: { type: Type.STRING, description: "Descriptive name including variety and prep (e.g., 'Crispy Fried Tilapia')" },
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
 * Agent reasoning engine. 
 * Performs a biological audit comparing intake to profile targets.
 */
export async function getAgentDecision(
  profile: UserProfile,
  history: MealRecord[]
): Promise<AgentDecision> {
  const ai = getAI();
  const model = "gemini-3-pro-preview";

  const totalCalories = history.reduce((sum, m) => sum + m.nutrition.calories, 0);
  const totalProtein = history.reduce((sum, m) => sum + m.nutrition.protein, 0);
  const totalFat = history.reduce((sum, m) => sum + m.nutrition.fat, 0);

  const systemInstruction = `You are the STRATOS-AI Biological Strategist. 
  Your job is to perform a high-level nutritional audit.
  User Goal: ${profile.goal}.
  Current Intake: ${totalCalories}kcal, ${totalProtein}g Protein, ${totalFat}g Fat.
  Target: ${profile.dailyCalorieTarget}kcal, ${profile.dailyProteinTarget}g Protein.

  Logic:
  1. Audit for quality: (e.g., "High fat content detected in Fried Fish").
  2. Perform Gap Analysis: How far are they from their protein ceiling?
  3. Grounding: Use Google Search to find a specific recipe or snack that fixes the current imbalance.

  Format:
  STATUS: [OPTIMAL/WARNING/CRITICAL]
  REASONING: [Clear audit result]
  ACTION: [Actionable tactical directive]`;

  const mealList = history.map(m => `- ${m.foodName} (${m.nutrition.calories}cal, ${m.nutrition.protein}g P, ${m.nutrition.fat}g F)`).join('\n') || "No data.";
  const userPrompt = `Intake history today:\n${mealList}\nRemaining: ${profile.dailyCalorieTarget - totalCalories}cal.`;

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }]
    },
  });

  const textOutput = response.text || "";
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  const suggestedRecipes = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title,
      uri: chunk.web.uri
    })).slice(0, 3);

  const statusMatch = textOutput.match(/STATUS:\s*(\w+)/);
  const reasoningMatch = textOutput.match(/REASONING:\s*([^\n]+)/);
  const actionMatch = textOutput.match(/ACTION:\s*([^\n]+)/);

  return {
    status: (statusMatch?.[1] as any) || "OPTIMAL",
    reasoning: reasoningMatch?.[1] || "Analyzing biological trends...",
    suggestion: actionMatch?.[1] || "Proceed with current protocol.",
    suggestedRecipes
  };
}

export async function askAgent(
  profile: UserProfile,
  history: MealRecord[],
  question: string
): Promise<string> {
  const ai = getAI();
  const model = "gemini-3-pro-preview";

  const totals = history.reduce((acc, m) => ({
    cal: acc.cal + m.nutrition.calories,
    prot: acc.prot + m.nutrition.protein
  }), { cal: 0, prot: 0 });

  const systemInstruction = `You are the STRATOS-AI Diet Agent. Respond as a performance coach.
  User Goal: ${profile.goal}.
  Today's Status: ${totals.cal}/${profile.dailyCalorieTarget} cal, ${totals.prot}/${profile.dailyProteinTarget}g protein.`;

  const response = await ai.models.generateContent({
    model,
    contents: question,
    config: { systemInstruction }
  });

  return response.text || "Reasoning engine timeout.";
}
