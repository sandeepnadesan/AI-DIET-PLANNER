
import React, { useState, useEffect, useRef } from 'react';
import { 
  DietGoal, 
  UserProfile, 
  MealRecord, 
  AgentDecision, 
  FoodAnalysis 
} from './types';
import { analyzeFoodImage, getAgentDecision, askAgent } from './services/geminiService';
import { 
  Camera, 
  LayoutDashboard, 
  BrainCircuit, 
  History, 
  Settings, 
  TrendingUp, 
  ExternalLink, 
  MessageSquare, 
  Plus, 
  X, 
  LogOut, 
  Zap, 
  Search,
  ArrowUpRight,
  Flame,
  ChevronRight,
  RefreshCw,
  Send,
  PieChart as PieIcon,
  Navigation,
  Info,
  Activity,
  Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell as PCell 
} from 'recharts';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('diet_active_user'));
  const [loginInput, setLoginInput] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealRecord[]>([]);

  const [activeTab, setActiveTab] = useState<'dash' | 'strategy' | 'history' | 'profile'>('dash');
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzedFood, setAnalyzedFood] = useState<FoodAnalysis | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [agentFeedback, setAgentFeedback] = useState<AgentDecision | null>(null);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'agent', text: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    const profileKey = `diet_pro_${currentUser}_profile`;
    const saved = localStorage.getItem(profileKey);
    const today = new Date().toDateString();
    
    let p: UserProfile;
    if (saved) {
      p = JSON.parse(saved);
    } else {
      p = {
        username: currentUser, goal: DietGoal.MAINTENANCE, age: 30, weight: 75, height: 180, 
        gender: 'male', activityLevel: 1.375, dailyCalorieTarget: 2400, dailyProteinTarget: 150, 
        lastActiveDate: today
      };
    }

    const mealKey = `diet_pro_${currentUser}_meals`;
    const savedMeals = localStorage.getItem(mealKey);
    let m: MealRecord[] = savedMeals ? JSON.parse(savedMeals) : [];

    if (p.lastActiveDate !== today) {
      m = [];
      p.lastActiveDate = today;
    }

    setProfile(p);
    setMeals(m);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && profile) {
      localStorage.setItem(`diet_pro_${currentUser}_profile`, JSON.stringify(profile));
      localStorage.setItem(`diet_pro_${currentUser}_meals`, JSON.stringify(meals));
      triggerAgentUpdate();
    }
  }, [meals, profile, currentUser]);

  const triggerAgentUpdate = async () => {
    if (!profile) return;
    setIsAgentThinking(true);
    try {
      const decision = await getAgentDecision(profile, meals);
      setAgentFeedback(decision);
    } catch (e) {
      console.error("Agent strategy error", e);
    } finally {
      setIsAgentThinking(false);
    }
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const totals = meals.reduce((acc, m) => ({
    cal: acc.cal + m.nutrition.calories,
    prot: acc.prot + m.nutrition.protein,
    carbs: acc.carbs + m.nutrition.carbs,
    fat: acc.fat + m.nutrition.fat
  }), { cal: 0, prot: 0, carbs: 0, fat: 0 });

  const calTarget = profile?.dailyCalorieTarget || 2000;
  const protTarget = profile?.dailyProteinTarget || 150;

  const macroData = [
    { name: 'Protein', value: totals.prot * 4, fill: '#6366f1' },
    { name: 'Carbs', value: totals.carbs * 4, fill: '#10b981' },
    { name: 'Fat', value: totals.fat * 9, fill: '#f59e0b' }
  ];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#141414] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-600/20"><BrainCircuit className="text-white" size={32} /></div>
            <h1 className="text-3xl font-black text-white tracking-tight">DIET AI</h1>
            <p className="text-slate-500 mt-2">Precision Bio-Intelligence Command.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setCurrentUser(loginInput); }} className="space-y-4">
            <input 
              type="text" placeholder="Access Identifier" 
              value={loginInput} onChange={(e) => setLoginInput(e.target.value)} 
              className="w-full px-6 py-4 bg-[#1a1a1a] border border-white/5 rounded-2xl text-white outline-none focus:border-indigo-500/50 transition-all font-medium"
            />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black tracking-wide hover:bg-indigo-500 transition-all">Initialize Protocol</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex text-slate-300">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 bg-[#0d0d0d] hidden lg:flex flex-col p-8 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"><Zap size={20} className="text-white" /></div>
          <span className="font-black text-white text-lg tracking-tight">STRATOS AI</span>
        </div>
        <nav className="space-y-2 flex-1">
          {[
            { id: 'dash', icon: LayoutDashboard, label: 'Bio-Overview' },
            { id: 'strategy', icon: BrainCircuit, label: 'Strategic Audit' },
            { id: 'history', icon: History, label: 'Data Sequence' },
            { id: 'profile', icon: Settings, label: 'Bio-Profile' }
          ].map(item => (
            <button 
              key={item.id} onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => setCurrentUser(null)} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 transition-all">
          <LogOut size={20} /> Terminate Session
        </button>
      </aside>

      {/* Content */}
      <main className="flex-1 lg:ml-72 min-h-screen">
        <header className="p-8 flex justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-30 border-b border-white/5">
          <h2 className="text-2xl font-black text-white capitalize tracking-tight">
            {activeTab === 'dash' && 'Command Dashboard'}
            {activeTab === 'strategy' && 'Strategic Intelligence'}
            {activeTab === 'history' && 'Sequence Timeline'}
            {activeTab === 'profile' && 'Biometric Settings'}
          </h2>
          <div className="flex gap-4">
             <button onClick={() => setChatOpen(true)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 relative group">
                <MessageSquare size={20} className="text-slate-400 group-hover:text-indigo-400" />
                <div className="absolute top-3 right-3 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
             </button>
             <button onClick={() => setIsCapturing(true)} className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-sm hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                <Plus size={20} /> New Input
             </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'dash' && (
            <div className="space-y-8 animate-in fade-in duration-700">
               {/* Dashboard Cards */}
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                 <div className="lg:col-span-8 bg-[#0d0d0d] border border-white/5 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="relative w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{v: totals.cal}, {v: Math.max(0, calTarget - totals.cal)}]} innerRadius={70} outerRadius={90} paddingAngle={4} dataKey="v" stroke="none">
                            <PCell fill="#6366f1" />
                            <PCell fill="#1a1a1a" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-white">{totals.cal}</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kcal</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-6">
                       <div>
                         <h3 className="text-xl font-bold text-white mb-1">Energy Utilization</h3>
                         <p className="text-slate-500 text-sm">Target: {calTarget} kcal • Efficiency: {Math.round((totals.cal / calTarget) * 100)}%</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                             <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Protein Yield</div>
                             <div className="text-lg font-black text-indigo-400">{totals.prot} / {protTarget}g</div>
                             <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
                               <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, (totals.prot/protTarget)*100)}%` }} />
                             </div>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                             <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Fat Density</div>
                             <div className="text-lg font-black text-amber-400">{totals.fat}g</div>
                             <p className="text-[8px] text-slate-600 mt-1 uppercase font-bold tracking-tighter">Current Lipid Load</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="lg:col-span-4 bg-[#141414] border border-white/5 rounded-[2.5rem] p-10 flex flex-col justify-center relative overflow-hidden">
                   <div className="absolute -top-10 -right-10 opacity-5"><Activity size={200} /></div>
                   <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Navigation size={18} className="text-indigo-500" /> Bio-Trajectory</h3>
                   <div className="space-y-6">
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Hourly Burn</span>
                         <span className="text-white font-bold">{Math.round(totals.cal / (new Date().getHours() || 1))} kcal</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Projected Total</span>
                         <span className={`font-bold ${totals.cal > calTarget ? 'text-rose-500' : 'text-emerald-500'}`}>{Math.round((totals.cal / (new Date().getHours() || 1)) * 24)} kcal</span>
                      </div>
                      <button onClick={() => setActiveTab('strategy')} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2">Intelligence Audit <ArrowUpRight size={14} /></button>
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 bg-[#0d0d0d] border border-white/5 rounded-[2.5rem] p-8">
                     <h3 className="font-bold text-white mb-6 flex items-center gap-2"><History size={18} className="text-indigo-500" /> Sequence Stream</h3>
                     <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {meals.length === 0 ? (
                          <div className="py-20 text-center opacity-20"><History size={32} className="mx-auto mb-2" /><p className="text-xs font-black">Memory Empty</p></div>
                        ) : meals.map(m => (
                          <div key={m.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group transition-all">
                             <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden border border-white/5">
                                {m.image ? <img src={m.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Flame size={16} className="text-slate-700" /></div>}
                             </div>
                             <div className="flex-1">
                                <div className="text-sm font-bold text-white truncate">{m.foodName}</div>
                                <div className="text-[10px] text-slate-500 font-black uppercase">{m.nutrition.calories} kcal • {m.nutrition.protein}g Prot</div>
                             </div>
                             <button onClick={() => setMeals(meals.filter(x => x.id !== m.id))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-rose-500 transition-all"><X size={16} /></button>
                          </div>
                        )).reverse()}
                     </div>
                  </div>

                  <div className="lg:col-span-8 bg-[#0d0d0d] border border-white/5 rounded-[2.5rem] p-10">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2"><PieIcon size={20} className="text-emerald-500" /> Composition Audit</h3>
                          <p className="text-xs text-slate-500 mt-1 font-black tracking-widest uppercase">Macro-Nutrient Density Analysis</p>
                        </div>
                        <div className="flex gap-4">
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-400"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Protein</div>
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Carbs</div>
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-400"><div className="w-2 h-2 rounded-full bg-amber-500" /> Lipids</div>
                        </div>
                     </div>
                     <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={macroData} layout="vertical" margin={{ left: -30 }}>
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" hide />
                              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#141414', border: 'none', borderRadius: '12px' }} />
                              <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'strategy' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-700">
               <div className="bg-[#141414] border border-indigo-500/20 rounded-[3rem] p-12 relative overflow-hidden shadow-2xl">
                  <div className="absolute -top-20 -right-20 p-12 text-indigo-500/5 rotate-12 pointer-events-none"><BrainCircuit size={400} /></div>
                  <div className="relative z-10">
                     <div className="flex items-center gap-4 mb-10">
                        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-lg"><BrainCircuit size={32} className="text-white" /></div>
                        <div>
                           <h3 className="text-3xl font-black text-white">Biological Strategist</h3>
                           <div className="flex items-center gap-2 mt-1">
                              {isAgentThinking ? (
                                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auditing Nutrient Sequences...</span></div>
                              ) : (
                                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Strategy Finalized • Grounded</span></div>
                              )}
                           </div>
                        </div>
                     </div>

                     {!agentFeedback ? (
                       <div className="py-20 text-center space-y-4 opacity-40">
                          <p className="italic">Data density insufficient for tactical audit.</p>
                          <button onClick={triggerAgentUpdate} className="text-xs font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">Force Manual Reasoning</button>
                       </div>
                     ) : (
                       <div className="space-y-12">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Info size={12} /> Biological Assessment</h4>
                                <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black mb-6 uppercase ${agentFeedback.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-500' : agentFeedback.status === 'WARNING' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                   {agentFeedback.status} Level Analysis
                                </div>
                                <p className="text-lg font-bold text-white leading-relaxed">{agentFeedback.reasoning}</p>
                             </div>
                             <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-800 opacity-90" />
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                   <div>
                                      <h4 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Award size={12} /> Tactical Action</h4>
                                      <p className="text-2xl font-black text-white leading-tight">{agentFeedback.suggestion}</p>
                                   </div>
                                   <div className="pt-8"><Zap size={24} className="text-white/20 group-hover:scale-125 transition-transform duration-500" /></div>
                                </div>
                             </div>
                          </div>

                          {agentFeedback.suggestedRecipes && agentFeedback.suggestedRecipes.length > 0 && (
                            <div className="space-y-8">
                               <div className="flex items-center gap-4">
                                  <div className="h-px flex-1 bg-white/5" />
                                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Web-Search Grounding</h4>
                                  <div className="h-px flex-1 bg-white/5" />
                               </div>
                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                  {agentFeedback.suggestedRecipes.map((r, i) => (
                                    <a key={i} href={r.uri} target="_blank" rel="noreferrer" className="flex flex-col justify-between p-8 bg-white/5 hover:bg-white/10 rounded-[2rem] border border-white/5 transition-all group min-h-[180px]">
                                       <Search size={16} className="text-indigo-400 mb-6" />
                                       <span className="text-sm font-bold text-white group-hover:text-indigo-400 leading-snug line-clamp-2">{r.title}</span>
                                       <div className="flex items-center gap-2 mt-6 text-[10px] font-black text-slate-500 uppercase group-hover:text-white transition-colors">Access Logic <ChevronRight size={10} /></div>
                                    </a>
                                  ))}
                               </div>
                            </div>
                          )}
                       </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
               <div className="bg-[#0d0d0d] border border-white/5 rounded-[3rem] p-12">
                  <div className="flex items-center gap-4 mb-12">
                     <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10"><Settings size={32} className="text-slate-400" /></div>
                     <div>
                        <h3 className="text-3xl font-black text-white">Biometric Blueprint</h3>
                        <p className="text-slate-500 text-sm">Fine-tune the STRATOS bio-feedback parameters.</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                     <div className="space-y-6">
                        <div>
                           <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Biological Priority</label>
                           <select value={profile?.goal} onChange={e => setProfile(p => p ? {...p, goal: e.target.value as DietGoal} : null)} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl font-bold text-white outline-none focus:border-indigo-500 transition-all appearance-none">
                              {Object.values(DietGoal).map(v => <option key={v} value={v} className="bg-[#0d0d0d]">{v}</option>)}
                           </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Age</label>
                              <input type="number" value={profile?.age} onChange={e => setProfile(p => p ? {...p, age: parseInt(e.target.value)} : null)} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl font-bold text-white" />
                           </div>
                           <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Weight (kg)</label>
                              <input type="number" value={profile?.weight} onChange={e => setProfile(p => p ? {...p, weight: parseInt(e.target.value)} : null)} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl font-bold text-white" />
                           </div>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div>
                           <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Temporal Intensity</label>
                           <select value={profile?.activityLevel} onChange={e => setProfile(p => p ? {...p, activityLevel: parseFloat(e.target.value) as any} : null)} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl font-bold text-white outline-none appearance-none">
                              <option value={1.2} className="bg-[#0d0d0d]">Sedentary</option>
                              <option value={1.375} className="bg-[#0d0d0d]">Light Activity</option>
                              <option value={1.55} className="bg-[#0d0d0d]">Moderate Load</option>
                              <option value={1.725} className="bg-[#0d0d0d]">High Load</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Height (cm)</label>
                           <input type="number" value={profile?.height} onChange={e => setProfile(p => p ? {...p, height: parseInt(e.target.value)} : null)} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl font-bold text-white" />
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (!profile) return;
                      let bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age);
                      bmr = profile.gender === 'male' ? bmr + 5 : bmr - 161;
                      const tdee = bmr * profile.activityLevel;
                      let tc = tdee;
                      if (profile.goal === DietGoal.WEIGHT_LOSS) tc -= 500;
                      if (profile.goal === DietGoal.MUSCLE_GAIN) tc += 300;
                      const tp = profile.goal === DietGoal.MUSCLE_GAIN ? profile.weight * 2.2 : profile.weight * 1.6;
                      setProfile({...profile, dailyCalorieTarget: Math.round(tc), dailyProteinTarget: Math.round(tp)});
                      setActiveTab('dash');
                    }}
                    className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                  >
                    Calibrate Biometrics
                  </button>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Input Drawer */}
      {isCapturing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-2xl" onClick={() => setIsCapturing(false)} />
           <div className="max-w-2xl w-full bg-[#141414] border border-white/10 rounded-[3rem] p-10 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-2xl font-black text-white">Multimodal Vision</h3>
                 <button onClick={() => setIsCapturing(false)} className="p-3 text-slate-500 hover:text-white transition-colors"><X size={32} /></button>
              </div>

              {!analyzedFood && !loading ? (
                <div className="flex flex-col items-center py-16">
                   <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/10 shadow-inner"><Camera size={48} className="text-indigo-500" /></div>
                   <p className="text-slate-400 mb-10 text-center max-w-sm font-medium">Input meal data via multimodal scan. Identify variety, prep method, and caloric load.</p>
                   <button onClick={() => fileInputRef.current?.click()} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-500 transition-all active:scale-95">Initiate Scan</button>
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCapture} />
                </div>
              ) : analyzedFood && !loading ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-5">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {imagePreview && <div className="rounded-[2rem] overflow-hidden border-4 border-white/5 shadow-2xl"><img src={imagePreview} className="w-full h-64 object-cover" /></div>}
                      <div className="flex flex-col justify-center">
                         <div className="text-3xl font-black text-white mb-2 leading-tight">{analyzedFood.foodName}</div>
                         <div className="text-xs text-emerald-500 font-bold uppercase tracking-widest mb-8 flex items-center gap-2"><Award size={14} /> Confidence: {Math.round(analyzedFood.confidence * 100)}%</div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-white/5 rounded-[1.5rem] border border-white/5">
                               <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Yield</div>
                               <div className="text-xl font-black text-white">{analyzedFood.nutrition.calories} <span className="text-[10px] text-slate-600">kcal</span></div>
                            </div>
                            <div className="p-5 bg-white/5 rounded-[1.5rem] border border-white/5">
                               <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Protein</div>
                               <div className="text-xl font-black text-white">{analyzedFood.nutrition.protein}g</div>
                            </div>
                         </div>
                      </div>
                   </div>
                   <button onClick={() => {
                     const m: MealRecord = { id: crypto.randomUUID(), timestamp: Date.now(), foodName: analyzedFood.foodName, nutrition: analyzedFood.nutrition, image: imagePreview || undefined };
                     setMeals([...meals, m]); setAnalyzedFood(null); setImagePreview(null); setIsCapturing(false);
                   }} className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">Push to Bio-Sequence</button>
                </div>
              ) : (
                <div className="py-24 flex flex-col items-center">
                   <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                   <p className="font-black text-white mt-8 tracking-widest uppercase text-xs">Decoding Biological Data...</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Sidebar Chat */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#0d0d0d] border-l border-white/5 shadow-2xl z-50 transition-transform duration-500 ease-in-out transform ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="flex flex-col h-full">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20"><MessageSquare size={24} className="text-white" /></div>
                  <div>
                    <h3 className="font-black text-white tracking-tight uppercase text-sm">Strategic Agent</h3>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-black text-slate-500 uppercase">Context Synchronized</span></div>
                  </div>
               </div>
               <button onClick={() => setChatOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#0a0a0a] custom-scrollbar">
               {chatHistory.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-10">
                    <BrainCircuit size={64} className="mb-6 text-indigo-500" />
                    <h4 className="font-black text-white mb-2 uppercase text-xs tracking-widest">Awaiting Command</h4>
                    <p className="text-xs leading-relaxed">Ask about biological recovery, nutrient gaps, or specific dietary adjustments.</p>
                 </div>
               )}
               {chatHistory.map((msg, i) => (
                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-lg' : 'bg-[#141414] border border-white/5 text-slate-300 rounded-bl-none shadow-xl'}`}>
                       {msg.text}
                    </div>
                 </div>
               ))}
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault(); if (!chatInput.trim() || !profile) return;
                const m = chatInput.trim(); setChatInput('');
                setChatHistory([...chatHistory, {role: 'user', text: m}]);
                setLoading(true);
                try {
                  const res = await askAgent(profile, meals, m);
                  setChatHistory(prev => [...prev, {role: 'agent', text: res}]);
                } catch (e) { setChatHistory(prev => [...prev, {role: 'agent', text: "Bio-logic failure."}]); }
                finally { setLoading(false); }
              }} 
              className="p-8 border-t border-white/5 flex gap-3 bg-[#0d0d0d]"
            >
               <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Consult the Strategist..." className="flex-1 px-6 py-4 bg-[#141414] border border-white/5 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium text-sm" />
               <button type="submit" className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90"><Send size={20} /></button>
            </form>
         </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};

export default App;
