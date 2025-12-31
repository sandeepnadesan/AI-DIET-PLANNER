
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

export interface AgentObservation {
  timestamp: number;
  type: 'MEAL' | 'EXERCISE' | 'GOAL_UPDATE';
  content: string;
}

export interface AgentDecision {
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  reasoning: string;
  suggestion: string;
}

export interface UserProfile {
  name: string;
  goal: DietGoal;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
}
