
import { GoogleGenAI, Type } from "@google/genai";
import { FoodAnalysis, AgentDecision, UserProfile, MealRecord } from "../types";

/**
 * Safely retrieves the API key from potential global locations.
 * Prevents ReferenceError: process is not defined.
 */
const getApiKey = (): string => {
  try {
    // Check window.process (our shim) or the native process if it exists
    const envKey = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
    return envKey || "";
  } catch (e) {
    return "";
  }
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

/**
 * Analyzes an image of food to extract nutritional information.
 * Uses Gemini 3 Flash for fast vision recognition.
 */
export async function analyzeFoodImage(base64Image: string): Promise<FoodAnalysis> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const prompt = `Identify the food in this image and provide its nutritional data per typical serving size. 
  If it's not food, set isFood to false. Provide the response strictly in JSON format.`;

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
          foodName: { type: Type.STRING },
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

  const text = response.text || "{}";
  return JSON.parse(text) as FoodAnalysis;
}

/**
 * Agentic Reasoning Module: Observes meal history vs goals and makes a decision.
 */
export async function getAgentDecision(
  profile: UserProfile,
  history: MealRecord[]
): Promise<AgentDecision> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const totalCalories = history.reduce((sum, m) => sum + m.nutrition.calories, 0);
  const totalProtein = history.reduce((sum, m) => sum + m.nutrition.protein, 0);

  const systemInstruction = `You are an Agentic AI Diet Planner. 
  Your goal is to help users reach their target: ${profile.goal}.
  Current user targets: ${profile.dailyCalorieTarget} kcal, ${profile.dailyProteinTarget}g protein.
  
  Observe the user's consumption history, compare it against their goal, and decide on the next course of action.
  Provide your response in JSON format.`;

  const mealList = history.map(m => `- ${m.foodName}: ${m.nutrition.calories}cal, ${m.nutrition.protein}g protein`).join('\n');

  const userPrompt = `History:
  ${mealList}
  
  Daily Totals: ${totalCalories} calories, ${totalProtein}g protein.
  User Goal: ${profile.goal}.
  
  Think step-by-step:
  1. Observe: Is the calorie/protein intake on track?
  2. Decide: What should the user do for their next meal?
  3. Adapt: If they are over, suggest lighter options. If under, suggest nutrient-dense foods.`;

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["OPTIMAL", "WARNING", "CRITICAL"] },
          reasoning: { type: Type.STRING },
          suggestion: { type: Type.STRING }
        },
        required: ["status", "reasoning", "suggestion"]
      }
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text) as AgentDecision;
}
