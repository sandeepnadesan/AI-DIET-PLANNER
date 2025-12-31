
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DietGoal, 
  UserProfile, 
  MealRecord, 
  AgentDecision, 
  FoodAnalysis 
} from './types';
import { analyzeFoodImage, getAgentDecision } from './services/geminiService';
import { 
  Camera, 
  Upload, 
  PieChart, 
  Target, 
  History, 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  User,
  Settings,
  PlusCircle,
  XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const App: React.FC = () => {
  // --- User Memory State ---
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('diet_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Alex',
      goal: DietGoal.WEIGHT_LOSS,
      dailyCalorieTarget: 2200,
      dailyProteinTarget: 160,
    };
  });

  const [meals, setMeals] = useState<MealRecord[]>(() => {
    const saved = localStorage.getItem('meal_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only keep today's meals
      const today = new Date().setHours(0, 0, 0, 0);
      return parsed.filter((m: MealRecord) => m.timestamp >= today);
    }
    return [];
  });

  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [analyzedFood, setAnalyzedFood] = useState<FoodAnalysis | null>(null);
  const [agentFeedback, setAgentFeedback] = useState<AgentDecision | null>(null);
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('diet_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('meal_history', JSON.stringify(meals));
    // Trigger Agent Adaptation Loop whenever meals change
    if (meals.length > 0) {
      updateAgentReasoning();
    } else {
      setAgentFeedback(null);
    }
  }, [meals]);

  const updateAgentReasoning = async () => {
    try {
      const decision = await getAgentDecision(profile, meals);
      setAgentFeedback(decision);
    } catch (e) {
      console.error("Agent reasoning failed", e);
    }
  };

  // --- Handlers ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setImagePreview(reader.result as string);
      try {
        const analysis = await analyzeFoodImage(base64);
        setAnalyzedFood(analysis);
      } catch (err) {
        console.error("Analysis failed", err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmMeal = () => {
    if (!analyzedFood || !analyzedFood.isFood) return;

    const newMeal: MealRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      foodName: analyzedFood.foodName,
      nutrition: analyzedFood.nutrition,
      image: imagePreview || undefined
    };

    setMeals(prev => [...prev, newMeal]);
    setAnalyzedFood(null);
    setImagePreview(null);
  };

  const deleteMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  // --- Calculations ---
  const totalCalories = meals.reduce((sum, m) => sum + m.nutrition.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.nutrition.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.nutrition.carbs, 0);
  const totalFat = meals.reduce((sum, m) => sum + m.nutrition.fat, 0);

  const calProgress = Math.min((totalCalories / profile.dailyCalorieTarget) * 100, 100);
  const protProgress = Math.min((totalProtein / profile.dailyProteinTarget) * 100, 100);

  const chartData = [
    { name: 'Calories', value: totalCalories, target: profile.dailyCalorieTarget },
    { name: 'Protein (g)', value: totalProtein, target: profile.dailyProteinTarget },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="text-indigo-600" />
            Diet Agent <span className="text-indigo-600 font-light italic">Lite</span>
          </h1>
          <p className="text-slate-500">Autonomous nutrition tracking & planning</p>
        </div>
        <button 
          onClick={() => setView(view === 'dashboard' ? 'settings' : 'dashboard')}
          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          {view === 'dashboard' ? <Settings size={20} /> : <History size={20} />}
        </button>
      </header>

      {view === 'dashboard' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Action Area */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Uploader */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center relative overflow-hidden">
              {!analyzedFood && !loading ? (
                <>
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera size={32} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Identify Your Meal</h3>
                  <p className="text-slate-500 mb-6">Take a photo or upload an image of your food</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto"
                  >
                    <Upload size={18} />
                    Upload Image
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                </>
              ) : analyzedFood && !loading ? (
                <div className="text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">{analyzedFood.foodName}</h3>
                    <button onClick={() => setAnalyzedFood(null)} className="text-slate-400 hover:text-slate-600">
                      <XCircle size={24} />
                    </button>
                  </div>
                  {imagePreview && (
                    <img src={imagePreview} className="w-full h-48 object-cover rounded-xl mb-4" alt="Preview" />
                  )}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-center">
                      <div className="text-xs text-orange-600 font-semibold uppercase">Cals</div>
                      <div className="text-lg font-bold">{analyzedFood.nutrition.calories}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                      <div className="text-xs text-blue-600 font-semibold uppercase">Prot</div>
                      <div className="text-lg font-bold">{analyzedFood.nutrition.protein}g</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                      <div className="text-xs text-green-600 font-semibold uppercase">Carbs</div>
                      <div className="text-lg font-bold">{analyzedFood.nutrition.carbs}g</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-center">
                      <div className="text-xs text-purple-600 font-semibold uppercase">Fat</div>
                      <div className="text-lg font-bold">{analyzedFood.nutrition.fat}g</div>
                    </div>
                  </div>
                  <button 
                    onClick={confirmMeal}
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} />
                    Add to Today's Journal
                  </button>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-medium text-slate-700">Agent Reasoning in progress...</p>
                  <p className="text-sm text-slate-400">Classifying ingredients & mapping nutrition</p>
                </div>
              )}
            </div>

            {/* Daily History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <History size={18} className="text-slate-400" />
                  Today's Timeline
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {meals.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    No meals logged today.
                  </div>
                ) : (
                  meals.map((meal) => (
                    <div key={meal.id} className="p-4 flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        {meal.image ? <img src={meal.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400"><PlusCircle /></div>}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800">{meal.foodName}</h4>
                        <div className="text-xs text-slate-500 flex gap-3">
                          <span>{meal.nutrition.calories} kcal</span>
                          <span>{meal.nutrition.protein}g protein</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteMeal(meal.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  )).reverse()
                )}
              </div>
            </div>

          </div>

          {/* Sidebar / Stats / Agent */}
          <div className="space-y-6">
            
            {/* Goal Progress */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Target size={18} className="text-indigo-500" />
                Goals: {profile.goal}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1 font-medium">
                    <span className="text-slate-500">Calories</span>
                    <span className={totalCalories > profile.dailyCalorieTarget ? 'text-red-500' : 'text-slate-900'}>
                      {totalCalories} / {profile.dailyCalorieTarget}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${totalCalories > profile.dailyCalorieTarget ? 'bg-red-500' : 'bg-indigo-500'}`}
                      style={{ width: `${calProgress}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1 font-medium">
                    <span className="text-slate-500">Protein</span>
                    <span className="text-slate-900">{totalProtein}g / {profile.dailyProteinTarget}g</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-1000"
                      style={{ width: `${protProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Feedback Agentic Decision Module */}
            <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-500 ${
              agentFeedback 
                ? agentFeedback.status === 'OPTIMAL' ? 'bg-emerald-50 border-emerald-100' : 
                  agentFeedback.status === 'WARNING' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <BrainCircuit size={18} className="text-indigo-600" />
                Agent Advice
              </h3>
              
              {!agentFeedback ? (
                <p className="text-sm text-slate-500 italic">
                  Log a meal to activate the Diet Agent's reasoning engine.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                    agentFeedback.status === 'OPTIMAL' ? 'text-emerald-600' : 
                    agentFeedback.status === 'WARNING' ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {agentFeedback.status === 'WARNING' && <AlertTriangle size={14} />}
                    {agentFeedback.status === 'OPTIMAL' && <CheckCircle2 size={14} />}
                    {agentFeedback.status}
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {agentFeedback.reasoning}
                  </p>
                  <div className="pt-3 border-t border-slate-200/50">
                    <p className="text-sm font-semibold text-indigo-700">
                      Recommendation: {agentFeedback.suggestion}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} fontSize={12} stroke="#64748b" />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > entry.target ? '#ef4444' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      ) : (
        /* Settings / Profile View */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <User className="text-indigo-600" />
            User Settings
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Display Name</label>
              <input 
                type="text" 
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Health Goal</label>
              <select 
                value={profile.goal}
                onChange={(e) => setProfile({...profile, goal: e.target.value as DietGoal})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                {Object.values(DietGoal).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Flame size={14} className="text-orange-500" /> Calorie Target
                </label>
                <input 
                  type="number" 
                  value={profile.dailyCalorieTarget}
                  onChange={(e) => setProfile({...profile, dailyCalorieTarget: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <PieChart size={14} className="text-blue-500" /> Protein Target (g)
                </label>
                <input 
                  type="number" 
                  value={profile.dailyProteinTarget}
                  onChange={(e) => setProfile({...profile, dailyProteinTarget: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <button 
              onClick={() => setView('dashboard')}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
            >
              Save Profile & Update Agent
            </button>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="mt-12 pt-8 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
          Powered by Gemini 3 Flash Vision & Reasoning Engine
        </p>
      </footer>
    </div>
  );
};

export default App;
