import React from 'react';
import { Sparkles, Footprints, Flame, Egg, Award } from 'lucide-react';

const CATEGORY_ICONS = {
  transport: Footprints,
  food: Egg,
  home: Flame,
};

const CATEGORY_COLORS = {
  transport: 'text-amber-600 bg-amber-50 border-amber-100',
  food: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  home: 'text-orange-600 bg-orange-50 border-orange-100',
};

const IMPACT_COLORS = {
  High: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Medium: 'bg-amber-50 text-amber-600 border-amber-100',
  Low: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function InsightsPanel({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden text-slate-800">
      
      {/* Decorative background glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          Personalized Reduction Tips
        </h2>
        <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-emerald-500" />
          Monthly Carbon Savings
        </span>
      </div>

      <div className="space-y-4">
        {insights.map((tip, index) => {
          const IconComponent = CATEGORY_ICONS[tip.category] || Sparkles;
          
          return (
            <div 
              key={index}
              className="relative bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 group hover:border-emerald-500/20"
            >
              <div className="flex items-start gap-3.5">
                {/* Category Icon */}
                <div className={`p-3 rounded-xl border shrink-0 ${CATEGORY_COLORS[tip.category] || 'bg-slate-100 border-slate-200 text-slate-800'}`}>
                  <IconComponent className="w-4 h-4" />
                </div>

                <div className="text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-xs">
                      {tip.title}
                    </h3>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-extrabold ${IMPACT_COLORS[tip.impact] || 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                      {tip.impact}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed max-w-xl font-medium">
                    {tip.description}
                  </p>
                </div>
              </div>

              {/* Quantified Savings Badge */}
              <div className="sm:text-right shrink-0 bg-white border border-slate-100 p-2.5 rounded-xl flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-0 shadow-sm min-w-[100px]">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
                  Saves
                </span>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-lg font-black text-emerald-600 font-display">
                    -{tip.savings.toFixed(0)}
                  </span>
                  <span className="text-slate-400 font-bold text-[10px]">kg</span>
                </div>
                <span className="text-[8px] text-slate-400 font-bold block">
                  per month
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
