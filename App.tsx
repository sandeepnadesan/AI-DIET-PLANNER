
import React, { useState, useEffect, useRef } from 'react';
import { 
  DietGoal, 
  UserProfile, 
  MealRecord, 
  AgentDecision, 
  FoodAnalysis,
  Language,
  Theme
} from './types';
import { analyzeFoodImage, getAgentDecision, askAgent } from './services/geminiService';
import { translations } from './translations';
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
  Award,
  Sparkles,
  Utensils,
  Globe,
  Moon,
  Sun
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

  const [lang, setLang] = useState<Language>((localStorage.getItem('diet_lang') as Language) || Language.ENGLISH);
  const [theme, setTheme] = useState<Theme>((localStorage.getItem('diet_theme') as Theme) || Theme.DARK);
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'dash' | 'strategy' | 'history' | 'profile'>('dash');
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzedFood, setAnalyzedFood] = useState<FoodAnalysis | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userDescription, setUserDescription] = useState('');
  const [agentFeedback, setAgentFeedback] = useState<AgentDecision | null>(null);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'agent', text: string }[]>([]);
  const [isChatting, setIsChatting] = useState(false);
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
      if (meals.length > 0) triggerAgentUpdate();
    }
  }, [meals, profile, currentUser]);

  useEffect(() => {
    localStorage.setItem('diet_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('diet_theme', theme);
  }, [theme]);

  const triggerAgentUpdate = async () => {
    if (!profile) return;
    setIsAgentThinking(true);
    try {
      const decision = await getAgentDecision(profile, meals, lang);
      setAgentFeedback(decision);
    } catch (e) {
      console.error("Agent strategy error", e);
    } finally {
      setIsAgentThinking(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startAnalysis = async () => {
    if (!imagePreview) return;
    setLoading(true);
    try {
      const base64 = imagePreview.split(',')[1];
      const analysis = await analyzeFoodImage(base64, userDescription, lang);
      setAnalyzedFood(analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-500 ${theme === Theme.LIGHT ? 'theme-light bg-app-primary' : 'bg-[#0a0a0a]'}`}>
        <div className="max-w-md w-full bg-app-secondary border border-app rounded-[2.5rem] p-10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-600/20"><BrainCircuit className="text-white" size={32} /></div>
            <h1 className="text-3xl font-black text-app-primary tracking-tight italic">{t.appName}</h1>
            <p className="text-app-secondary mt-2 font-medium">{t.tagline}</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setCurrentUser(loginInput); localStorage.setItem('diet_active_user', loginInput); }} className="space-y-4">
            <input 
              type="text" placeholder={t.identityKey} 
              value={loginInput} onChange={(e) => setLoginInput(e.target.value)} 
              className="w-full px-6 py-4 bg-app-tertiary border border-app rounded-2xl text-app-primary outline-none focus:border-indigo-500 transition-all font-bold tracking-tight"
            />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black tracking-widest uppercase text-sm hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">{t.syncIdentity}</button>
          </form>
          
          <div className="mt-8 flex justify-center gap-4">
            <button onClick={() => setLang(Language.ENGLISH)} className={`px-3 py-1 rounded-lg text-xs font-bold ${lang === Language.ENGLISH ? 'bg-indigo-600 text-white' : 'text-app-secondary hover:text-app-primary'}`}>EN</button>
            <button onClick={() => setLang(Language.TAMIL)} className={`px-3 py-1 rounded-lg text-xs font-bold ${lang === Language.TAMIL ? 'bg-indigo-600 text-white' : 'text-app-secondary hover:text-app-primary'}`}>TA</button>
            <button onClick={() => setLang(Language.FRENCH)} className={`px-3 py-1 rounded-lg text-xs font-bold ${lang === Language.FRENCH ? 'bg-indigo-600 text-white' : 'text-app-secondary hover:text-app-primary'}`}>FR</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${theme === Theme.LIGHT ? 'theme-light bg-app-primary text-app-secondary' : 'bg-[#0a0a0a] text-slate-300'}`}>
      {/* Sidebar */}
      <aside className="w-72 border-r border-app bg-app-secondary hidden lg:flex flex-col p-8 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"><Zap size={20} className="text-white" /></div>
          <span className="font-black text-app-primary text-lg tracking-tight">{t.appName}</span>
        </div>
        <nav className="space-y-2 flex-1">
          {[
            { id: 'dash', icon: LayoutDashboard, label: t.bioOverview },
            { id: 'strategy', icon: BrainCircuit, label: t.strategicAudit },
            { id: 'history', icon: History, label: t.dataSequence },
            { id: 'profile', icon: Settings, label: t.bioProfile }
          ].map(item => (
            <button 
              key={item.id} onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'text-app-secondary hover:text-app-primary hover:bg-white/5'}`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 space-y-4">
          <div className="flex items-center justify-between px-4 py-2 bg-app-tertiary rounded-2xl border border-app">
            <button onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)} className="p-2 text-app-secondary hover:text-app-primary transition-colors">
              {theme === Theme.DARK ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="h-4 w-px bg-app-secondary" />
            <div className="flex gap-2">
              <button onClick={() => setLang(Language.ENGLISH)} className={`text-[10px] font-black ${lang === Language.ENGLISH ? 'text-indigo-500' : 'text-app-secondary'}`}>EN</button>
              <button onClick={() => setLang(Language.TAMIL)} className={`text-[10px] font-black ${lang === Language.TAMIL ? 'text-indigo-500' : 'text-app-secondary'}`}>TA</button>
              <button onClick={() => setLang(Language.FRENCH)} className={`text-[10px] font-black ${lang === Language.FRENCH ? 'text-indigo-500' : 'text-app-secondary'}`}>FR</button>
            </div>
          </div>
          <button onClick={() => { setCurrentUser(null); localStorage.removeItem('diet_active_user'); }} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-app-secondary hover:text-rose-500 hover:bg-rose-500/5 transition-all">
            <LogOut size={20} /> {t.terminate}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 lg:ml-72 min-h-screen">
        <header className="p-8 flex justify-between items-center bg-app-primary/80 backdrop-blur-md sticky top-0 z-30 border-b border-app">
          <h2 className="text-2xl font-black text-app-primary tracking-tighter">
            {activeTab === 'dash' && t.bioDashboard}
            {activeTab === 'strategy' && t.strategicAudit}
            {activeTab === 'history' && t.sequenceLogs}
            {activeTab === 'profile' && t.biometricCore}
          </h2>
          <div className="flex gap-4">
             <button onClick={() => setChatOpen(true)} className="p-4 bg-app-tertiary rounded-2xl hover:bg-white/10 border border-app relative">
                <MessageSquare size={20} className="text-app-secondary" />
                <div className="absolute top-3 right-3 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
             </button>
             <button onClick={() => {setIsCapturing(true); setImagePreview(null); setAnalyzedFood(null); setUserDescription('');}} className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-sm hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                <Plus size={20} /> {t.addInput}
             </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'dash' && (
            <div className="space-y-8 animate-in fade-in duration-700">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                 <div className="lg:col-span-8 bg-app-secondary border border-app rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="relative w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{v: totals.cal}, {v: Math.max(0, calTarget - totals.cal)}]} innerRadius={70} outerRadius={90} paddingAngle={4} dataKey="v" stroke="none">
                            <PCell fill="#6366f1" />
                            <PCell fill={theme === Theme.LIGHT ? '#e2e8f0' : '#1a1a1a'} />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-app-primary tracking-tighter">{totals.cal}</span>
                        <span className="text-[10px] font-black text-app-secondary uppercase tracking-widest">Kcal</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-6">
                       <div>
                         <h3 className="text-xl font-bold text-app-primary mb-1">{t.metabolicLoad}</h3>
                         <p className="text-app-secondary text-sm font-medium tracking-tight">Cap: {calTarget} kcal • Load: {Math.round((totals.cal / calTarget) * 100)}%</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-app-tertiary rounded-2xl border border-app">
                             <div className="text-[10px] font-black text-app-secondary uppercase mb-1">{t.proteinYield}</div>
                             <div className="text-lg font-black text-indigo-400">{totals.prot}<span className="text-xs text-slate-600 font-bold ml-1">/ {protTarget}g</span></div>
                             <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
                               <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${Math.min(100, (totals.prot/protTarget)*100)}%` }} />
                             </div>
                          </div>
                          <div className="p-4 bg-app-tertiary rounded-2xl border border-app">
                             <div className="text-[10px] font-black text-app-secondary uppercase mb-1">{t.lipidDensity}</div>
                             <div className="text-lg font-black text-amber-400">{totals.fat}g</div>
                             <div className="text-[8px] text-slate-600 font-bold uppercase mt-1">Total Daily Fats</div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="lg:col-span-4 bg-app-tertiary border border-app rounded-[2.5rem] p-10 flex flex-col justify-center relative overflow-hidden">
                   <div className="absolute -top-10 -right-10 opacity-5 text-app-primary"><Activity size={200} /></div>
                   <h3 className="text-lg font-bold text-app-primary mb-6 flex items-center gap-2"><Navigation size={18} className="text-indigo-500" /> {t.trajectory}</h3>
                   <div className="space-y-6">
                      <div className="flex justify-between text-sm">
                         <span className="text-app-secondary font-medium">{t.hourlyBurn}</span>
                         <span className="text-app-primary font-bold">{Math.round(totals.cal / (new Date().getHours() || 1))} kcal</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-app-secondary font-medium">{t.projectedEnd}</span>
                         <span className={`font-bold ${totals.cal > calTarget ? 'text-rose-500' : 'text-emerald-500'}`}>{Math.round((totals.cal / (new Date().getHours() || 1)) * 24)} kcal</span>
                      </div>
                      <button onClick={() => setActiveTab('strategy')} className="w-full py-4 bg-white/5 hover:bg-white/10 text-app-primary rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">{t.openStrategyHub} <ArrowUpRight size={14} /></button>
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 bg-app-secondary border border-app rounded-[2.5rem] p-8">
                     <h3 className="font-bold text-app-primary mb-6 flex items-center gap-2 uppercase tracking-widest text-xs"><History size={16} className="text-indigo-500" /> {t.sequenceStream}</h3>
                     <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {meals.length === 0 ? (
                          <div className="py-20 text-center opacity-20"><History size={32} className="mx-auto mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">Memory Segment Empty</p></div>
                        ) : meals.map(m => (
                          <div key={m.id} className="flex items-center gap-4 p-4 bg-app-tertiary rounded-2xl border border-app group transition-all">
                             <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden border border-app">
                                {m.image ? <img src={m.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Flame size={16} className="text-slate-700" /></div>}
                             </div>
                             <div className="flex-1">
                                <div className="text-sm font-bold text-app-primary truncate tracking-tight">{m.foodName}</div>
                                <div className="text-[10px] text-app-secondary font-black uppercase">{m.nutrition.calories} kcal • {m.nutrition.protein}g P</div>
                             </div>
                             <button onClick={() => setMeals(meals.filter(x => x.id !== m.id))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-rose-500 transition-all"><X size={16} /></button>
                          </div>
                        )).reverse()}
                     </div>
                  </div>

                  <div className="lg:col-span-8 bg-app-secondary border border-app rounded-[2.5rem] p-10">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-xl font-bold text-app-primary flex items-center gap-2"><PieIcon size={20} className="text-emerald-500" /> {t.compositionAudit}</h3>
                          <p className="text-[10px] text-app-secondary mt-1 font-black tracking-widest uppercase">{t.bioChemicalMapping}</p>
                        </div>
                        <div className="flex gap-4">
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-400"><div className="w-2 h-2 rounded-full bg-indigo-500" /> PRO</div>
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500" /> CHO</div>
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-400"><div className="w-2 h-2 rounded-full bg-amber-500" /> FAT</div>
                        </div>
                     </div>
                     <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={macroData} layout="vertical" margin={{ left: -30 }}>
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" hide />
                              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: theme === Theme.LIGHT ? '#fff' : '#141414', border: 'none', borderRadius: '12px', color: theme === Theme.LIGHT ? '#000' : '#fff' }} />
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
               <div className="bg-app-tertiary border border-indigo-500/20 rounded-[3rem] p-12 relative overflow-hidden shadow-2xl">
                  <div className="absolute -top-20 -right-20 p-12 text-indigo-500/5 rotate-12 pointer-events-none"><BrainCircuit size={400} /></div>
                  <div className="relative z-10">
                     <div className="flex items-center gap-4 mb-10">
                        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-lg"><BrainCircuit size={32} className="text-white" /></div>
                        <div>
                           <h3 className="text-3xl font-black text-app-primary tracking-tighter italic">{t.biologicalStrategist}</h3>
                           <div className="flex items-center gap-2 mt-1">
                              {isAgentThinking ? (
                                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" /><span className="text-[10px] font-black text-app-secondary uppercase tracking-widest">{t.auditingBioSequence}</span></div>
                              ) : (
                                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full" /><span className="text-[10px] font-black text-app-secondary uppercase tracking-widest">{t.logicOptimized}</span></div>
                              )}
                           </div>
                        </div>
                     </div>

                     {!agentFeedback && !isAgentThinking ? (
                       <div className="py-24 text-center space-y-6">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10"><Sparkles className="text-indigo-400" /></div>
                          <p className="text-app-secondary font-medium italic text-lg">{t.initialDataRequired}</p>
                          <button onClick={triggerAgentUpdate} className="px-8 py-4 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-indigo-600 hover:text-white transition-all shadow-lg">{t.initializeReasoning}</button>
                       </div>
                     ) : isAgentThinking ? (
                        <div className="py-24 text-center">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-app-secondary">{t.decodingStructure}</p>
                        </div>
                     ) : (
                       <div className="space-y-12 animate-in fade-in duration-500">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="p-8 bg-white/5 rounded-[2.5rem] border border-app backdrop-blur-md">
                                <h4 className="text-[10px] font-black text-app-secondary uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Info size={12} /> {t.biometricAudit}</h4>
                                <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black mb-6 uppercase ${agentFeedback.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-500' : agentFeedback.status === 'WARNING' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                   {agentFeedback.status} STATUS
                                </div>
                                <p className="text-lg font-bold text-app-primary leading-relaxed tracking-tight">{agentFeedback.reasoning}</p>
                             </div>
                             <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-800 opacity-90" />
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                   <div>
                                      <h4 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Award size={12} /> {t.tacticalAction}</h4>
                                      <p className="text-2xl font-black text-white leading-tight tracking-tighter">{agentFeedback.suggestion}</p>
                                   </div>
                                   <div className="pt-8"><Zap size={24} className="text-white/20 group-hover:scale-125 transition-transform duration-500" /></div>
                                </div>
                             </div>
                          </div>

                          {agentFeedback.suggestedRecipes && agentFeedback.suggestedRecipes.length > 0 && (
                            <div className="space-y-8">
                               <div className="flex items-center gap-4">
                                  <div className="h-px flex-1 bg-white/5" />
                                  <h4 className="text-[10px] font-black text-app-secondary uppercase tracking-[0.4em]">{t.groundedResources}</h4>
                                  <div className="h-px flex-1 bg-white/5" />
                               </div>
                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                  {agentFeedback.suggestedRecipes.map((r, i) => (
                                    <a key={i} href={r.uri} target="_blank" rel="noreferrer" className="flex flex-col justify-between p-8 bg-white/5 hover:bg-white/10 rounded-[2rem] border border-app transition-all group min-h-[180px]">
                                       <Search size={16} className="text-indigo-400 mb-6" />
                                       <span className="text-sm font-bold text-app-primary group-hover:text-indigo-400 leading-snug line-clamp-2 tracking-tight">{r.title}</span>
                                       <div className="flex items-center gap-2 mt-6 text-[10px] font-black text-app-secondary group-hover:text-app-primary transition-colors">ACCESS DATA <ChevronRight size={10} /></div>
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
               <div className="bg-app-secondary border border-app rounded-[3rem] p-12 shadow-2xl">
                  <div className="flex items-center gap-4 mb-12">
                     <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10"><Settings size={32} className="text-slate-400" /></div>
                     <div>
                        <h3 className="text-3xl font-black text-app-primary tracking-tighter italic">{t.biometricBlueprint}</h3>
                        <p className="text-app-secondary text-sm font-medium">{t.calibrateParameters}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                     <div className="space-y-6">
                        <div>
                           <label className="text-[10px] font-black text-app-secondary uppercase mb-2 block tracking-widest">{t.biologicalPriority}</label>
                           <select value={profile?.goal} onChange={e => setProfile(p => p ? {...p, goal: e.target.value as DietGoal} : null)} className="w-full p-4 bg-white/5 border border-app rounded-2xl font-bold text-app-primary outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                              {Object.values(DietGoal).map(v => <option key={v} value={v} className="bg-app-secondary">{v}</option>)}
                           </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-[10px] font-black text-app-secondary uppercase mb-2 block tracking-widest">{t.age}</label>
                              <input type="number" value={profile?.age} onChange={e => setProfile(p => p ? {...p, age: parseInt(e.target.value)} : null)} className="w-full p-4 bg-white/5 border border-app rounded-2xl font-bold text-app-primary outline-none focus:border-indigo-500 transition-all" />
                           </div>
                           <div>
                              <label className="text-[10px] font-black text-app-secondary uppercase mb-2 block tracking-widest">{t.weight}</label>
                              <input type="number" value={profile?.weight} onChange={e => setProfile(p => p ? {...p, weight: parseInt(e.target.value)} : null)} className="w-full p-4 bg-white/5 border border-app rounded-2xl font-bold text-app-primary outline-none focus:border-indigo-500 transition-all" />
                           </div>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div>
                           <label className="text-[10px] font-black text-app-secondary uppercase mb-2 block tracking-widest">{t.temporalIntensity}</label>
                           <select value={profile?.activityLevel} onChange={e => setProfile(p => p ? {...p, activityLevel: parseFloat(e.target.value) as any} : null)} className="w-full p-4 bg-white/5 border border-app rounded-2xl font-bold text-app-primary outline-none appearance-none cursor-pointer">
                              <option value={1.2} className="bg-app-secondary">Sedentary (1.2)</option>
                              <option value={1.375} className="bg-app-secondary">Light (1.375)</option>
                              <option value={1.55} className="bg-app-secondary">Moderate (1.55)</option>
                              <option value={1.725} className="bg-app-secondary">High Intensity (1.725)</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-app-secondary uppercase mb-2 block tracking-widest">{t.height}</label>
                           <input type="number" value={profile?.height} onChange={e => setProfile(p => p ? {...p, height: parseInt(e.target.value)} : null)} className="w-full p-4 bg-white/5 border border-app rounded-2xl font-bold text-app-primary outline-none focus:border-indigo-500 transition-all" />
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
                    className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-sm tracking-widest uppercase shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                  >
                    {t.calibrateNodes}
                  </button>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Multimodal Capture Modal */}
      {isCapturing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
           <div className={`absolute inset-0 backdrop-blur-2xl ${theme === Theme.LIGHT ? 'bg-slate-200/80' : 'bg-[#0a0a0a]/95'}`} onClick={() => setIsCapturing(false)} />
           <div className={`max-w-3xl w-full border border-app rounded-[3rem] p-10 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar ${theme === Theme.LIGHT ? 'bg-white' : 'bg-[#141414]'}`}>
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black text-app-primary tracking-tighter">{t.multimodalCapture}</h3>
                 <button onClick={() => setIsCapturing(false)} className="p-3 text-app-secondary hover:text-app-primary transition-colors"><X size={32} /></button>
              </div>

              {!analyzedFood && !loading ? (
                <div className="space-y-10">
                   {!imagePreview ? (
                      <div className="flex flex-col items-center py-16">
                         <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-app shadow-inner"><Camera size={48} className="text-indigo-500" /></div>
                         <p className="text-app-secondary mb-10 text-center max-w-sm font-medium">Input meal data via multimodal scan.variety, prep, and nutritional payload will be audited.</p>
                         <button onClick={() => fileInputRef.current?.click()} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black tracking-widest uppercase text-xs shadow-xl hover:bg-indigo-500 transition-all active:scale-95">{t.uploadPhoto}</button>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-6">
                            <div className="rounded-[2rem] overflow-hidden border-4 border-app shadow-2xl bg-black aspect-square">
                               <img src={imagePreview} className="w-full h-full object-cover" />
                            </div>
                            <button onClick={() => setImagePreview(null)} className="w-full py-4 text-app-secondary font-bold uppercase text-[10px] tracking-widest hover:text-app-primary transition-colors">REMOVE PHOTO</button>
                         </div>
                         <div className="flex flex-col justify-center space-y-8">
                            <div>
                               <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 block">{t.specifyVariety}</label>
                               <textarea 
                                 value={userDescription}
                                 onChange={e => setUserDescription(e.target.value)}
                                 placeholder="e.g. 'Fried Tilapia fish', 'Pan-seared Salmon with olive oil', 'Deep fried cod fish fry'..."
                                 className="w-full h-32 p-5 bg-white/5 border border-app rounded-2xl text-app-primary outline-none focus:border-indigo-500 transition-all font-bold text-sm tracking-tight placeholder:text-slate-700 resize-none"
                               />
                               <p className="text-[10px] text-app-secondary mt-2 font-medium italic">Adding specific details helps the AI categorize nutrients more accurately.</p>
                            </div>
                            <button onClick={startAnalysis} className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black tracking-widest uppercase text-sm shadow-xl hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-3">
                               <Sparkles size={20} /> {t.startAnalysis}
                            </button>
                         </div>
                      </div>
                   )}
                </div>
              ) : analyzedFood && !loading ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-5">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {imagePreview && <div className="rounded-[2rem] overflow-hidden border-4 border-app shadow-2xl bg-black aspect-square"><img src={imagePreview} className="w-full h-full object-cover" /></div>}
                      <div className="flex flex-col justify-center">
                         <div className="text-3xl font-black text-app-primary mb-2 leading-tight tracking-tighter">{analyzedFood.foodName}</div>
                         <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.4em] mb-8 flex items-center gap-2"><Award size={14} /> {t.scanConfirmed}: {Math.round(analyzedFood.confidence * 100)}%</div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-white/5 rounded-[1.5rem] border border-app">
                               <div className="text-[10px] font-bold text-app-secondary uppercase mb-1">{t.energy}</div>
                               <div className="text-xl font-black text-app-primary">{analyzedFood.nutrition.calories} <span className="text-[10px] text-app-secondary font-bold">KCAL</span></div>
                            </div>
                            <div className="p-5 bg-white/5 rounded-[1.5rem] border border-app">
                               <div className="text-[10px] font-bold text-app-secondary uppercase mb-1">{t.protein}</div>
                               <div className="text-xl font-black text-app-primary">{analyzedFood.nutrition.protein}g</div>
                            </div>
                            <div className="p-5 bg-white/5 rounded-[1.5rem] border border-app">
                               <div className="text-[10px] font-bold text-app-secondary uppercase mb-1">{t.carbs}</div>
                               <div className="text-xl font-black text-app-primary">{analyzedFood.nutrition.carbs}g</div>
                            </div>
                            <div className="p-5 bg-white/5 rounded-[1.5rem] border border-app">
                               <div className="text-[10px] font-bold text-app-secondary uppercase mb-1">{t.fat}</div>
                               <div className="text-xl font-black text-app-primary">{analyzedFood.nutrition.fat}g</div>
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => setAnalyzedFood(null)} className="flex-1 py-6 bg-white/5 text-app-secondary rounded-[2rem] font-black text-sm tracking-widest uppercase hover:text-app-primary transition-all">{t.reScan}</button>
                      <button onClick={() => {
                        const m: MealRecord = { id: crypto.randomUUID(), timestamp: Date.now(), foodName: analyzedFood.foodName, nutrition: analyzedFood.nutrition, image: imagePreview || undefined };
                        setMeals([...meals, m]); setAnalyzedFood(null); setImagePreview(null); setIsCapturing(false);
                      }} className="flex-[2] py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-sm tracking-widest uppercase shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">{t.commitToSequence}</button>
                   </div>
                </div>
              ) : (
                <div className="py-24 flex flex-col items-center">
                   <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                   <p className="font-black text-app-primary mt-8 tracking-[0.4em] uppercase text-[10px]">{t.decodingStructure}</p>
                   <p className="text-[10px] text-app-secondary mt-2 font-medium">Analyzing variety and preparation methods...</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Sidebar Chat */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] border-l border-app shadow-2xl z-50 transition-transform duration-500 ease-in-out transform ${chatOpen ? 'translate-x-0' : 'translate-x-full'} ${theme === Theme.LIGHT ? 'bg-white' : 'bg-[#0d0d0d]'}`}>
         <div className="flex flex-col h-full">
            <div className={`p-8 border-b border-app flex items-center justify-between ${theme === Theme.LIGHT ? 'bg-slate-50' : 'bg-[#111]'}`}>
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><MessageSquare size={24} className="text-white" /></div>
                  <div>
                    <h3 className="font-black text-app-primary tracking-widest uppercase text-xs italic">{t.strategicAgent}</h3>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-black text-app-secondary uppercase">{t.contextSynchronized}</span></div>
                  </div>
               </div>
               <button onClick={() => setChatOpen(false)} className="p-2 text-app-secondary hover:text-app-primary transition-colors"><X size={28} /></button>
            </div>
            <div className={`flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar ${theme === Theme.LIGHT ? 'bg-slate-100' : 'bg-[#0a0a0a]'}`}>
               {chatHistory.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-20 px-10">
                    <BrainCircuit size={64} className="mb-6 text-indigo-500" />
                    <h4 className="font-black text-app-primary mb-2 uppercase text-[10px] tracking-[0.4em]">{t.readyForQuery}</h4>
                    <p className="text-xs leading-relaxed font-medium">Consult the Stratos Agent for bio-sequence optimization.</p>
                 </div>
               )}
               {chatHistory.map((msg, i) => (
                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed tracking-tight ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-lg' : 'bg-app-tertiary border border-app text-app-primary rounded-bl-none shadow-xl'}`}>
                       {msg.text}
                    </div>
                 </div>
               ))}
               {isChatting && (
                 <div className="flex justify-start animate-in fade-in slide-in-from-left-2">
                    <div className="bg-app-tertiary border border-app p-4 rounded-2xl rounded-bl-none">
                       <div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" /></div>
                    </div>
                 </div>
               )}
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault(); if (!chatInput.trim() || !profile) return;
                const m = chatInput.trim(); setChatInput('');
                setChatHistory([...chatHistory, {role: 'user', text: m}]);
                setIsChatting(true);
                try {
                  const res = await askAgent(profile, meals, m, lang);
                  setChatHistory(prev => [...prev, {role: 'agent', text: res}]);
                } catch (e) { setChatHistory(prev => [...prev, {role: 'agent', text: "Bio-Logic Relay Failure. Confirm API Credential."}]); }
                finally { setIsChatting(false); }
              }} 
              className={`p-8 border-t border-app flex gap-3 ${theme === Theme.LIGHT ? 'bg-white' : 'bg-[#0d0d0d]'}`}
            >
               <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={t.consultStrategist} className="flex-1 px-6 py-4 bg-app-tertiary border border-app rounded-2xl text-app-primary outline-none focus:border-indigo-500 transition-all font-bold text-sm tracking-tight" />
               <button type="submit" className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-500 transition-all active:scale-90"><Send size={20} /></button>
            </form>
         </div>
      </div>
    </div>
  );
};

export default App;
