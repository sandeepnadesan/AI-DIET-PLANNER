
import React, { useState, useEffect, useRef } from 'react';
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
  User as UserIcon,
  Settings,
  PlusCircle,
  XCircle,
  LogOut,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const App: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('diet_active_user'));
  const [loginInput, setLoginInput] = useState('');

  // --- User Data State ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealRecord[]>([]);

  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [analyzedFood, setAnalyzedFood] = useState<FoodAnalysis | null>(null);
  const [agentFeedback, setAgentFeedback] = useState<AgentDecision | null>(null);
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Login Handler ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    const username = loginInput.trim().toLowerCase();
    setCurrentUser(username);
    localStorage.setItem('diet_active_user', username);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('diet_active_user');
    setProfile(null);
    setMeals([]);
  };

  // --- Data Initialization & Daily Reset Logic ---
  useEffect(() => {
    if (!currentUser) return;

    // 1. Load Profile
    const profileKey = `diet_user_${currentUser}_profile`;
    const savedProfile = localStorage.getItem(profileKey);
    let currentProfile: UserProfile;

    if (savedProfile) {
      currentProfile = JSON.parse(savedProfile);
    } else {
      currentProfile = {
        username: currentUser,
        goal: DietGoal.WEIGHT_LOSS,
        dailyCalorieTarget: 2000,
        dailyProteinTarget: 150,
        lastActiveDate: new Date().toDateString()
      };
    }

    // 2. Load Meals & Check Daily Reset
    const mealKey = `diet_user_${currentUser}_meals`;
    const savedMeals = localStorage.getItem(mealKey);
    const todayStr = new Date().toDateString();
    
    let activeMeals: MealRecord[] = [];
    if (savedMeals) {
      const parsedMeals: MealRecord[] = JSON.parse(savedMeals);
      
      // Automatic Daily Reset: Only keep meals from today
      if (currentProfile.lastActiveDate !== todayStr) {
        console.log("New day detected! Resetting daily routine.");
        activeMeals = []; // Clear for new day
        currentProfile.lastActiveDate = todayStr; // Update marker
      } else {
        activeMeals = parsedMeals;
      }
    }

    setProfile(currentProfile);
    setMeals(activeMeals);
    localStorage.setItem(profileKey, JSON.stringify(currentProfile));
  }, [currentUser]);

  // --- Persistence Listeners ---
  useEffect(() => {
    if (currentUser && profile) {
      localStorage.setItem(`diet_user_${currentUser}_profile`, JSON.stringify(profile));
    }
  }, [profile, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`diet_user_${currentUser}_meals`, JSON.stringify(meals));
      if (meals.length > 0 && profile) {
        updateAgentReasoning();
      } else {
        setAgentFeedback(null);
      }
    }
  }, [meals, currentUser, profile]);

  const updateAgentReasoning = async () => {
    if (!profile) return;
    try {
      const decision = await getAgentDecision(profile, meals);
      setAgentFeedback(decision);
    } catch (e) {
      console.error("Agent reasoning failed", e);
    }
  };

  // --- Food Logic ---
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

  // --- Calculations ---
  const totalCalories = meals.reduce((sum, m) => sum + m.nutrition.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.nutrition.protein, 0);
  
  const calorieTarget = profile?.dailyCalorieTarget || 2000;
  const proteinTarget = profile?.dailyProteinTarget || 150;

  const calProgress = Math.min((totalCalories / calorieTarget) * 100, 100);
  const protProgress = Math.min((totalProtein / proteinTarget) * 100, 100);

  const chartData = [
    { name: 'Calories', value: totalCalories, target: calorieTarget },
    { name: 'Protein (g)', value: totalProtein, target: proteinTarget },
  ];

  // --- Auth Render ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden p-8 border border-white/10 glass">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-lg">
              <BrainCircuit className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Diet Agent</h1>
            <p className="text-slate-500">Autonomous personalized nutrition assistant</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Enter User ID</label>
              <input 
                type="text" 
                placeholder="e.g. nutrition_warrior"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-lg font-medium"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl hover:shadow-indigo-200"
            >
              Start Routine
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">Data is stored locally on this device for privacy.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{new Date().toDateString()}</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="text-indigo-600" />
            Hello, <span className="capitalize">{currentUser}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setView(view === 'dashboard' ? 'settings' : 'dashboard')}
            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            title="Settings"
          >
            {view === 'dashboard' ? <Settings size={20} /> : <History size={20} />}
          </button>
          <button 
            onClick={handleLogout}
            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shadow-sm"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {view === 'dashboard' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center relative overflow-hidden">
              {!analyzedFood && !loading ? (
                <>
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera size={32} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Identify Your Meal</h3>
                  <p className="text-slate-500 mb-6">Capture your plate to start the analysis</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto"
                  >
                    <Upload size={18} />
                    Upload Image
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </>
              ) : analyzedFood && !loading ? (
                <div className="text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">{analyzedFood.foodName}</h3>
                    <button onClick={() => setAnalyzedFood(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
                  </div>
                  {imagePreview && <img src={imagePreview} className="w-full h-48 object-cover rounded-xl mb-4 shadow-sm" alt="Preview" />}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                      <div className="text-[10px] text-orange-600 font-bold uppercase">Kcal</div>
                      <div className="text-lg font-bold">{analyzedFood.nutrition.calories}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                      <div className="text-[10px] text-blue-600 font-bold uppercase">Prot</div>
                      <div className="text-lg font-bold">{analyzedFood.nutrition.protein}g</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                      <div className="text-[10px] text-green-600 font-bold uppercase">Carbs</div>
                      <div className="text-lg font-bold">{analyzedFood.nutrition.carbs}g</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                      <div className="text-[10px] text-purple-600 font-bold uppercase">Fat</div>
                      <div className="text-lg font-bold">{analyzedFood.nutrition.fat}g</div>
                    </div>
                  </div>
                  <button onClick={confirmMeal} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2">
                    <CheckCircle2 size={20} /> Add to Today
                  </button>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-medium text-slate-700">Agent Analysis...</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <History size={18} className="text-slate-400" /> Today's Log
                </h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                {meals.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">No logs for {new Date().toLocaleDateString()}.</div>
                ) : (
                  meals.map((meal) => (
                    <div key={meal.id} className="p-4 flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden">
                        {meal.image ? <img src={meal.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400"><PlusCircle /></div>}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800">{meal.foodName}</h4>
                        <div className="text-xs text-slate-500">{meal.nutrition.calories} cal • {meal.nutrition.protein}g protein</div>
                      </div>
                      <button onClick={() => setMeals(prev => prev.filter(m => m.id !== meal.id))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"><XCircle size={18} /></button>
                    </div>
                  )).reverse()
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Target size={18} className="text-indigo-500" /> Current Goal
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-bold uppercase tracking-tight">
                    <span className="text-slate-400">Calories</span>
                    <span className={totalCalories > calorieTarget ? 'text-red-500' : 'text-slate-600'}>{totalCalories} / {calorieTarget}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${totalCalories > calorieTarget ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${calProgress}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1 font-bold uppercase tracking-tight">
                    <span className="text-slate-400">Protein</span>
                    <span className="text-slate-600">{totalProtein}g / {proteinTarget}g</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${protProgress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl shadow-lg p-6 border transition-all duration-500 ${
              agentFeedback 
                ? agentFeedback.status === 'OPTIMAL' ? 'bg-emerald-50 border-emerald-100' : 
                  agentFeedback.status === 'WARNING' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <BrainCircuit size={18} className="text-indigo-600" /> Agent Decision
              </h3>
              {!agentFeedback ? (
                <p className="text-sm text-slate-500 italic leading-relaxed">Agent is observing your meal patterns. Log your first meal of the day to trigger adaptive reasoning.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-800 leading-relaxed">{agentFeedback.reasoning}</p>
                  <div className="pt-3 border-t border-slate-200/50">
                    <p className="text-sm font-bold text-indigo-700">Action: {agentFeedback.suggestion}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} fontSize={10} stroke="#94a3b8" />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > entry.target ? '#f43f5e' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><UserIcon className="text-indigo-600" /> {currentUser}'s Profile</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Primary Fitness Goal</label>
              <select value={profile?.goal} onChange={(e) => setProfile(p => p ? {...p, goal: e.target.value as DietGoal} : null)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                {Object.values(DietGoal).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1"><Flame size={14} className="text-orange-500" /> Calories</label>
                <input type="number" value={profile?.dailyCalorieTarget} onChange={(e) => setProfile(p => p ? {...p, dailyCalorieTarget: parseInt(e.target.value)} : null)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1"><PieChart size={14} className="text-blue-500" /> Protein (g)</label>
                <input type="number" value={profile?.dailyProteinTarget} onChange={(e) => setProfile(p => p ? {...p, dailyProteinTarget: parseInt(e.target.value)} : null)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
            </div>
            <button onClick={() => setView('dashboard')} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
