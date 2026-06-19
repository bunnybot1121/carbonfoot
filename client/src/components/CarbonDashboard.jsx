import React from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { 
  Car, Utensils, Zap, ShoppingBag, ArrowUpRight, 
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
  const radius = 52;
  const circumference = 2 * Math.PI * radius; // 326.7
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
    <div class="space-y-8 animate-fadeIn">
      
      {/* 1. Dashboard Header Section */}
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Welcome back! 👋
          </h2>
          <p class="text-sm text-slate-500 mt-1.5 font-medium">
            Here's your carbon footprint summary.
          </p>
        </div>

        {/* Dynamic leaf congratulations banner */}
        <div class="bg-emerald-50/70 border border-emerald-100/50 rounded-2xl p-4 flex items-center gap-4 max-w-md shadow-sm">
          <div class="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600 border border-emerald-500/20 shrink-0">
            <Leaf class="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 class="font-bold text-emerald-800 text-xs">
              {thisMonth > 0 ? "Emissions Reduced!" : "Get Started!"}
            </h4>
            <p class="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
              {thisMonth > 0 ? (
                <>
                  You've kept your footprint <strong class="font-black text-emerald-800">{saved_kg.toFixed(1)} kg CO₂e</strong> below the regional average baseline. Keep it up! 🍀
                </>
              ) : (
                <>
                  Scan a receipt below or authorize geolocation to start tracking your footprint with <strong class="font-black text-emerald-800">zero manual entry</strong>. 🍀
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Score | Breakdown | Scanner */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Your Carbon Score Card (Lg 4) */}
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between lg:col-span-4 min-h-[300px]">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              Your Carbon Score
              <Info class="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
            </h3>
          </div>

          <div class="flex items-center gap-5 my-auto py-2">
            {/* SVG Circle Gauge */}
            <div class="w-28 h-28 relative shrink-0">
              <svg class="w-full h-full transform -rotate-90">
                {/* Track circle */}
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  class="transition-all duration-700"
                />
              </svg>
              {/* Score label text inside */}
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-black text-slate-800 font-display">{score}</span>
                <span class="text-[9px] text-slate-400 uppercase tracking-widest font-bold">/ 100</span>
              </div>
            </div>

            {/* Score Text details */}
            <div class="text-left space-y-1.5">
              <span class="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {thisMonth > 0 ? "Good job!" : "Eco Starter"}
              </span>
              <p class="text-[11px] text-slate-500 leading-relaxed mt-1">
                {thisMonth > 0 ? (
                  <>
                    You're doing better than <strong class="text-slate-800 font-bold">{Math.min(99, Math.max(10, Math.round(100 - (thisMonth / monthlyGoal) * 50)))}%</strong> of local region users.
                  </>
                ) : (
                  "Scan receipts to personalize your score compared to your region."
                )}
              </p>
              {thisMonth > 0 && (
                <p class="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <ArrowUpRight class="w-3.5 h-3.5 text-emerald-500" />
                  {Math.round((saved_kg / baseline) * 100)}% lower than baseline average
                </p>
              )}
            </div>
          </div>

          <button class="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-1 transition-all border border-slate-100 mt-2">
            View Score Details <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Emissions Breakdown Card (Lg 4) */}
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between lg:col-span-4 min-h-[300px]">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              Emissions Breakdown
              <Info class="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
            </h3>
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-lg">
              This Month
            </span>
          </div>

          {/* Breakdown Items List */}
          <div class="space-y-3.5 my-auto py-1">
            
            {/* Transport */}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="p-1.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
                  <Car class="w-4 h-4" />
                </div>
                <span class="text-xs font-bold text-slate-700">Transport</span>
              </div>
              <div class="text-right">
                <span class="text-xs font-black text-slate-800">{transport_pct}%</span>
                <span class="text-[10px] text-slate-400 font-medium block">{transport_kg.toFixed(1)} kg CO₂e</span>
              </div>
            </div>

            {/* Food */}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="p-1.5 bg-orange-50 rounded-xl text-orange-600 border border-orange-100">
                  <Utensils class="w-4 h-4" />
                </div>
                <span class="text-xs font-bold text-slate-700">Food</span>
              </div>
              <div class="text-right">
                <span class="text-xs font-black text-slate-800">{food_pct}%</span>
                <span class="text-[10px] text-slate-400 font-medium block">{food_kg.toFixed(1)} kg CO₂e</span>
              </div>
            </div>

            {/* Home Energy */}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="p-1.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                  <Zap class="w-4 h-4" />
                </div>
                <span class="text-xs font-bold text-slate-700">Home Energy</span>
              </div>
              <div class="text-right">
                <span class="text-xs font-black text-slate-800">{home_pct}%</span>
                <span class="text-[10px] text-slate-400 font-medium block">{home_kg.toFixed(1)} kg CO₂e</span>
              </div>
            </div>

            {/* Shopping */}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="p-1.5 bg-purple-50 rounded-xl text-purple-600 border border-purple-100">
                  <ShoppingBag class="w-4 h-4" />
                </div>
                <span class="text-xs font-bold text-slate-700">Shopping</span>
              </div>
              <div class="text-right">
                <span class="text-xs font-black text-slate-800">{shopping_pct}%</span>
                <span class="text-[10px] text-slate-400 font-medium block">{shopping_kg.toFixed(1)} kg CO₂e</span>
              </div>
            </div>

          </div>

          <button class="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-1 transition-all border border-slate-100">
            View Full Breakdown <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Upload Receipt Card (Lg 4 - BillScanner inside!) */}
        <div class="lg:col-span-4">
          <BillScanner onScanComplete={onScanComplete} />
        </div>

      </div>

      {/* 3. Lower Row: Trend Line | AI Eco Coach */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* 14-Day Carbon Trend AreaChart (Lg 7) */}
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm lg:col-span-7 flex flex-col justify-between min-h-[350px]">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              14-Day Carbon Trend
              <Info class="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
            </h3>
            <span class="text-[10px] text-slate-400 font-bold uppercase bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-xl">
              Daily
            </span>
          </div>

          <div class="h-48 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#ffffff', 
                    borderColor: '#f1f5f9', 
                    borderRadius: '12px',
                    color: '#1e293b',
                    fontSize: '11px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="emissions" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#dashboardTrendColor)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div class="bg-emerald-50/50 border border-emerald-100/30 rounded-2xl p-3 flex items-center gap-2 mt-4 shadow-sm text-left">
            <Leaf class="w-4 h-4 text-emerald-500 shrink-0" />
            <p class="text-[11px] text-emerald-800 leading-snug">
              {thisMonth > 0 ? (
                <>
                  <strong class="font-bold">Great trend!</strong> Your average daily emissions decreased by <strong class="font-extrabold text-emerald-950">12%</strong> compared to the baseline average.
                </>
              ) : (
                <>
                  <strong class="font-bold">No logs scanned.</strong> Please scan your first receipt to start personalizing your daily trend charts.
                </>
              )}
            </p>
          </div>
        </div>

        {/* AI Eco Coach Card (Lg 5) */}
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm lg:col-span-5 flex flex-col justify-between min-h-[350px]">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                AI Eco Coach
                <span class="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 uppercase tracking-widest">
                  New
                </span>
              </h3>
            </div>

            <div class="flex gap-4 items-start py-3">
              {/* Cute Robot avatar representation */}
              <div class="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-3xl">
                🤖
              </div>
              <div class="text-left space-y-1">
                {thisMonth > 0 ? (
                  <>
                    <p class="text-xs font-semibold text-slate-500">
                      Carbon footprint tracking is active.
                    </p>
                    <p class="text-xs text-slate-700 font-medium">
                      Main source: <strong class="text-slate-900">{mainSource}</strong>
                    </p>
                    <p class="text-[11px] text-emerald-600 font-bold">
                      Potential saving: {topInsight.savings.toFixed(0)} kg CO₂e / month
                    </p>
                  </>
                ) : (
                  <>
                    <p class="text-xs font-semibold text-slate-500">
                      No logs scanned yet.
                    </p>
                    <p class="text-xs text-slate-700 font-medium">
                      Upload your first receipt to customize AI advice.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-1.5 mt-2">
              <span class="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">
                🌱 Suggested Action
              </span>
              <p class="text-xs text-slate-600 leading-relaxed">
                {thisMonth > 0 ? topInsight.description : "Once you scan a receipt, your AI Eco Coach will suggest specific actions to reduce your footprint."}
              </p>
            </div>
          </div>

          <button class="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-1 transition-all border border-slate-100 mt-4">
            View More Recommendations <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 4. Bottom Statistics strip */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Saved Carbon */}
        <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:border-emerald-500/10 transition-all duration-300">
          <div class="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100 shrink-0 text-2xl">
            🌳
          </div>
          <div class="text-left">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">This Month You Saved</span>
            <span class="text-xl font-black text-slate-800 font-display">{saved_kg.toFixed(1)} kg CO₂e</span>
          </div>
        </div>

        {/* Card 2: Miles Not Driven */}
        <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:border-emerald-500/10 transition-all duration-300">
          <div class="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100 shrink-0 text-2xl">
            🚗
          </div>
          <div class="text-left">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Miles Not Driven</span>
            <span class="text-xl font-black text-slate-800 font-display">{miles_saved} miles</span>
          </div>
        </div>

        {/* Card 3: Energy Saved */}
        <div class="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:border-emerald-500/10 transition-all duration-300">
          <div class="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100 shrink-0 text-2xl">
            ⚡
          </div>
          <div class="text-left">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">kWh Energy Saved</span>
            <span class="text-xl font-black text-slate-800 font-display">{kwh_saved} kWh</span>
          </div>
        </div>

      </div>

    </div>
  );
}
