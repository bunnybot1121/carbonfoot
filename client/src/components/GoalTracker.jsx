import React, { useState } from 'react';
import axios from 'axios';
import { Target, ChevronUp, ChevronDown, CheckCircle, Flame } from 'lucide-react';

export default function GoalTracker({ currentEmissions, targetGoal, onGoalUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  const adjustGoal = async (amount) => {
    const newGoal = Math.max(50, targetGoal + amount);
    setUpdating(true);
    setSuccess(false);
    try {
      const response = await axios.post('/api/user/goal', { monthlyGoal: newGoal });
      onGoalUpdated(response.data.monthlyGoal);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
    } catch (err) {
      console.error('Failed to update target goal', err);
    } finally {
      setUpdating(false);
    }
  };

  const percentage = Math.min(100, (currentEmissions / targetGoal) * 100);

  // Status-based formatting
  const getProgressColor = () => {
    if (percentage < 70) return 'bg-emerald-500 shadow-sm';
    if (percentage < 90) return 'bg-amber-500 shadow-sm';
    return 'bg-red-500 shadow-sm';
  };

  const getTextColor = () => {
    if (percentage < 70) return 'text-emerald-600';
    if (percentage < 90) return 'text-amber-600';
    return 'text-red-600 font-bold';
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden text-slate-800">
      
      {/* Decorative background glow */}
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100/50">
            <Target className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Monthly Target Goal</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Keep your total monthly emissions below your target limit.
            </p>
          </div>
        </div>

        {/* Incremental Target Adjusters (Stepper, No Typing Needed!) */}
        <div className="bg-slate-50 border border-slate-100 p-1.5 rounded-2xl flex items-center gap-3">
          <span className="text-slate-400 text-xs font-semibold pl-2 select-none">Goal:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => adjustGoal(-50)}
              disabled={updating || targetGoal <= 50}
              className="p-1 bg-white border border-slate-200 hover:border-slate-300 active:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg disabled:opacity-30 transition-all"
              title="Decrease Goal"
              aria-label="Decrease Goal"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black text-slate-800 w-12 text-center font-display">
              {targetGoal} kg
            </span>
            <button
              onClick={() => adjustGoal(50)}
              disabled={updating}
              className="p-1 bg-white border border-slate-200 hover:border-slate-300 active:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg disabled:opacity-30 transition-all"
              title="Increase Goal"
              aria-label="Increase Goal"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {success && (
            <span className="text-emerald-500 flex items-center pr-2 transition-opacity">
              <CheckCircle className="w-4 h-4 fill-emerald-50 animate-bounce" />
            </span>
          )}
        </div>
      </div>

      {/* Progress representation */}
      <div className="space-y-2.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-500">
            Current Usage: <strong className="text-slate-800 font-bold">{currentEmissions.toFixed(1)} kg</strong>
          </span>
          <span className={getTextColor()}>
            {percentage.toFixed(0)}% Utilized
          </span>
        </div>

        {/* Progress tracks */}
        <div className="w-full h-3 bg-slate-100 border border-slate-200/50 rounded-full overflow-hidden p-0.5">
          <div 
            className={`h-full rounded-full transition-all duration-700 ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider px-1">
          <span>0 kg (Zero-Emissions)</span>
          {percentage >= 90 && (
            <span className="text-red-500 flex items-center gap-1 animate-pulse">
              <Flame className="w-3 h-3 fill-red-50" /> Target limit breached!
            </span>
          )}
          <span>Goal: {targetGoal} kg</span>
        </div>
      </div>

    </div>
  );
}
