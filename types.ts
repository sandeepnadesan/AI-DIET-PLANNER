
export enum DietGoal {
  WEIGHT_LOSS = 'Weight Loss',
  MUSCLE_GAIN = 'Muscle Gain',
  MAINTENANCE = 'Maintenance',
  KETO = 'Keto Diet',
  VEGAN = 'Plant Based'
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface FoodAnalysis {
  foodName: string;
  nutrition: NutritionInfo;
  confidence: number;
  isFood: boolean;
}

export interface MealRecord {
  id: string;
  timestamp: number;
  foodName: string;
  nutrition: NutritionInfo;
  image?: string;
}

export interface AgentDecision {
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  reasoning: string;
  suggestion: string;
  suggestedRecipes?: Array<{title: string, uri: string}>;
}

export interface UserProfile {
  username: string;
  goal: DietGoal;
  age: number;
  weight: number; // in kg
  height: number; // in cm
  gender: 'male' | 'female';
  activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9; // Sedentary to Extra Active
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  lastActiveDate?: string;
}
