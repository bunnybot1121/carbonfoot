import React from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { 
  Car, Utensils, Zap, ShoppingBag, 
  Leaf, Info, ChevronRight 
} from 'lucide-react';
import BillScanner from './BillScanner';

export default function CarbonDashboard({ data, insights, onScanComplete }) {
  if (!data) return null;

  const { today, thisWeek, thisMonth, monthlyGoal, categoryBreakdown, trendData, country } = data;

  // Calculate Breakdown values dynamically matching mockup categories
  const transport_kg = categoryBreakdown.transport || 0.0;
  const food_kg = (categoryBreakdown.meat || 0) + (categoryBreakdown.dairy || 0) + (categoryBreakdown.produce || 0) + (categoryBreakdown.packaged_food || 0);
  const shopping_kg = (categoryBreakdown.household || 0) + (categoryBreakdown.other || 0);
  
  // Home Energy based on location defaults: US, GB, IN, CA, FR, DEFAULT
  const countryFactors = {
    US: 0.370, GB: 0.150, DE: 0.380, IN: 0.710, CA: 0.120, FR: 0.050, DEFAULT: 0.475
  };
  const electricityFactor = countryFactors[country] || countryFactors.DEFAULT;
  const home_kg = (280 * electricityFactor) + (350 * 0.180); // ~280 kWh + 350 kWh gas

  const total_kg = transport_kg + food_kg + home_kg + shopping_kg;

  // Percentages
  const transport_pct = total_kg > 0 ? Math.round((transport_kg / total_kg) * 100) : 35;
  const food_pct = total_kg > 0 ? Math.round((food_kg / total_kg) * 100) : 30;
  const home_pct = total_kg > 0 ? Math.round((home_kg / total_kg) * 100) : 20;
  const shopping_pct = total_kg > 0 ? Math.round((shopping_kg / total_kg) * 100) : 15;

  // Find highest category
  let mainSource = "Home Energy ⚡";
  let maxVal = home_kg;
  if (transport_kg > maxVal) {
    mainSource = "Transport 🚗";
    maxVal = transport_kg;
  }
  if (food_kg > maxVal) {
    mainSource = "Food 🥦";
    maxVal = food_kg;
  }
  if (shopping_kg > maxVal) {
    mainSource = "Shopping 🛍️";
    maxVal = shopping_kg;
  }

  // Carbon Score out of 100 (derived from thisMonth emissions vs monthlyGoal)
  const score = Math.max(35, Math.min(96, Math.round(100 - (thisMonth / monthlyGoal) * 45)));

  // SVG parameters for circular score progress bar
  const radius = 34;
  const circumference = 2 * Math.PI * radius; // 213.6
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // AI Eco Coach Insights binding
  const topInsight = insights && insights.length > 0 ? insights[0] : {
    title: "Optimize Home Energy",
    description: "Switch 30% of energy load to save ~12 kg CO2e.",
    savings: 12
  };

  // Saved values computation
  // baseline defaults is ~450 kg CO2e. Savings is baseline - actual
  const baseline = 450.0;
  const saved_kg = thisMonth > 0 ? Math.max(0.0, baseline - thisMonth) : 0.0;
  const miles_saved = thisMonth > 0 ? Math.round(saved_kg / 0.170) : 0;
  const kwh_saved = thisMonth > 0 ? Math.round(saved_kg / electricityFactor) : 0;

  return (
    <div className="space-y-4 animate-fadeIn text-slate-800">
      
      {/* 1. Dashboard Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
            Welcome back! 👋
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Here's your carbon footprint summary.
          </p>
        </div>

        {/* Dynamic leaf congratulations banner */}
        <div className="bg-emerald-50/70 border border-emerald-100/50 rounded-2xl p-2.5 flex items-center gap-3 max-w-sm shadow-sm">
          <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-600 border border-emerald-500/20 shrink-0">
            <Leaf className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-800 text-[10px] uppercase tracking-wider">
              {thisMonth > 0 ? "Emissions Reduced!" : "Get Started!"}
            </h4>
            <p className="text-[10px] text-emerald-700 leading-snug mt-0.5">
              {thisMonth > 0 ? (
                <>
                  You've kept your footprint <strong className="font-black text-emerald-800">{saved_kg.toFixed(0)} kg CO₂e</strong> below baseline. Keep it up! 🍀
                </>
              ) : (
                <>
                  Scan a receipt below with <strong className="font-black text-emerald-800">zero manual entry</strong> to personalize your score. 🍀
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Executive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Column 1: Score & Breakdown (Lg 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Your Carbon Score Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-[215px]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                Your Carbon Score
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
              </h3>
            </div>

            <div className="flex items-center gap-4 my-auto">
              {/* SVG Circle Gauge */}
              <div 
                className="w-20 h-20 relative shrink-0"
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Carbon Score: ${score} out of 100`}
              >
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                {/* Score label text inside */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-800 font-display">{score}</span>
                  <span className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">/ 100</span>
                </div>
              </div>

              {/* Score Text details */}
              <div className="text-left space-y-1">
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {thisMonth > 0 ? "Good job!" : "Eco Starter"}
                </span>
                <p className="text-[10px] text-slate-500 leading-snug">
                  {thisMonth > 0 ? (
                    <>
                      You're doing better than <strong className="text-slate-800 font-bold">{Math.min(99, Math.max(10, Math.round(100 - (thisMonth / monthlyGoal) * 50)))}%</strong> of local users.
                    </>
                  ) : (
                    "Scan receipts to personalize your score compared to your region."
                  )}
                </p>
              </div>
            </div>

            <button className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all border border-slate-100">
              View Score Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Emissions Breakdown Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-[260px]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                Emissions Breakdown
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
              </h3>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-lg">
                This Month
              </span>
            </div>

            {/* Breakdown Items List */}
            <div className="space-y-2.5 my-auto">
              {/* Transport */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                    <Car className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Transport</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-slate-800">{transport_pct}%</span>
                  <span className="text-[9px] text-slate-400 font-medium block">{transport_kg.toFixed(0)} kg CO₂e</span>
                </div>
              </div>

              {/* Food */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-orange-50 rounded-lg text-orange-600 border border-orange-100">
                    <Utensils className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Food</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-slate-800">{food_pct}%</span>
                  <span className="text-[9px] text-slate-400 font-medium block">{food_kg.toFixed(0)} kg CO₂e</span>
                </div>
              </div>

              {/* Home Energy */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Home Energy</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-slate-800">{home_pct}%</span>
                  <span className="text-[9px] text-slate-400 font-medium block">{home_kg.toFixed(0)} kg CO₂e</span>
                </div>
              </div>

              {/* Shopping */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-purple-50 rounded-lg text-purple-600 border border-purple-100">
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Shopping</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-slate-800">{shopping_pct}%</span>
                  <span className="text-[9px] text-slate-400 font-medium block">{shopping_kg.toFixed(0)} kg CO₂e</span>
                </div>
              </div>
            </div>

            <button className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all border border-slate-100">
              View Full Breakdown <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Column 2: Chart & AI Coach (Lg 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Trend Chart Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-[270px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                Carbon Trend
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
              </h3>
              <span className="text-[8px] text-slate-400 font-bold uppercase bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-lg">
                Daily
              </span>
            </div>

            <div className="h-32 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardTrendColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#ffffff', 
                      borderColor: '#f1f5f9', 
                      borderRadius: '8px',
                      fontSize: '9px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="emissions" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#dashboardTrendColor)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100/30 rounded-xl p-2 flex items-center gap-2 mt-2 shadow-sm text-left">
              <Leaf className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <p className="text-[9px] text-emerald-800 leading-snug">
                {thisMonth > 0 ? (
                  <>Your daily emissions average decreased by <strong className="font-extrabold text-emerald-950">12%</strong>.</>
                ) : (
                  <>No logs scanned. Chart will activate upon first upload.</>
                )}
              </p>
            </div>
          </div>

          {/* AI Eco Coach Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-[205px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  AI Eco Coach
                  <span className="text-[8px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 uppercase tracking-widest">
                    Active
                  </span>
                </h3>
              </div>

              <div className="flex gap-3 items-start py-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-xl">
                  🤖
                </div>
                <div className="text-left space-y-0.5">
                  {thisMonth > 0 ? (
                    <>
                      <p className="text-[10px] text-slate-700 font-medium">
                        Main source: <strong className="text-slate-900">{mainSource}</strong>
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold">
                        Potential saving: {topInsight.savings.toFixed(0)} kg CO₂e / month
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-700 font-medium">
                      Upload your first receipt to customize AI advice.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-left space-y-0.5 mt-1.5">
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider block">
                  🌱 Suggested Action
                </span>
                <p className="text-[10px] text-slate-600 leading-snug">
                  {thisMonth > 0 ? topInsight.description : "Your AI Eco Coach will suggest actions once you log purchases."}
                </p>
              </div>
            </div>

            <button className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all border border-slate-100">
              View Recommendations <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Column 3: Upload & Stats Stack (Lg 3) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Upload Receipt Card (BillScanner inside) */}
          <div className="flex-1">
            <BillScanner onScanComplete={onScanComplete} />
          </div>

          {/* Stats Stack Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-[205px] text-left">
            <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2">Saved Highlights</h3>
            
            <div className="flex items-center gap-3">
              <span className="text-xl">🌳</span>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Carbon Saved</span>
                <span className="text-sm font-black text-slate-800 font-display">{saved_kg.toFixed(1)} kg CO₂e</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xl">🚗</span>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Miles Avoided</span>
                <span className="text-sm font-black text-slate-800 font-display">{miles_saved} miles</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Energy Saved</span>
                <span className="text-sm font-black text-slate-800 font-display">{kwh_saved} kWh</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
