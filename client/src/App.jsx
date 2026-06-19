import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Leaf, LayoutDashboard, Footprints, ListTodo, 
  Lightbulb, Settings, MapPin, Check, AlertCircle, RefreshCw, Trash2 
} from 'lucide-react';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import CarbonDashboard from './components/CarbonDashboard';
import BillScanner from './components/BillScanner';
import InsightsPanel from './components/InsightsPanel';
import GoalTracker from './components/GoalTracker';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [toast, setToast] = useState(null);
  const [clearing, setClearing] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAppData = async (showNotification = false) => {
    try {
      // Validate current token / fetch current user profile
      const meResponse = await axios.get('/api/auth/me');
      setUser(meResponse.data.user);
      
      const dbResponse = await axios.get('/api/dashboard');
      setDashboardData(dbResponse.data);
      setIsOnboarded(dbResponse.data.isOnboarded);
      
      if (dbResponse.data.isOnboarded) {
        // Fetch recommendations
        const insightsResponse = await axios.get('/api/insights');
        setInsights(insightsResponse.data);

        // Fetch logs history
        const logsResponse = await axios.get('/api/logs');
        setLogs(logsResponse.data);

        if (showNotification) {
          showToast("📍 Location contexts and carbon indicators re-synchronized!");
        }
      }
    } catch (err) {
      console.error('Failed to load application data', err);
      if (err.response?.status === 401) {
        // Session expired or invalid
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Configure Axios headers on token change
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchAppData();
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setDashboardData(null);
      setLogs([]);
      setInsights([]);
      setLoading(false);
    }
  }, [token]);

  const handleOnboardingComplete = (userData) => {
    setUser(userData);
    setIsOnboarded(true);
    fetchAppData();
    showToast("🎉 Geolocation authorized! Region defaults configured.");
  };

  const handleScanComplete = () => {
    fetchAppData();
    showToast("🧾 Bill scanned and footprint calculated successfully!");
  };

  const handleGoalUpdated = (newGoal) => {
    setDashboardData(prev => ({
      ...prev,
      monthlyGoal: newGoal
    }));
    showToast(`🎯 Monthly goal updated to ${newGoal} kg CO₂e`);
  };

  const handleDeleteLog = async (id) => {
    try {
      await axios.delete(`/api/logs/${id}`);
      fetchAppData();
      showToast("🗑️ Carbon log entry removed.");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete log entry.", "error");
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("Are you sure you want to delete all logs and reset your home location? This will completely clear your history.")) {
      return;
    }
    setClearing(true);
    try {
      await axios.post('/api/logs/clear');
      setIsOnboarded(false);
      setDashboardData(null);
      setLogs([]);
      setInsights([]);
      showToast("🗑️ User profile reset. Please re-onboard.");
    } catch (err) {
      console.error(err);
      showToast("Failed to reset history.", "error");
    } finally {
      setClearing(false);
    }
  };

  // 1. Loading state
  if (loading && !dashboardData && token) {
    return (
      <div class="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-900 min-h-screen">
        <Leaf class="w-12 h-12 text-emerald-500 animate-bounce mb-4" />
        <p class="text-sm font-semibold tracking-wider text-slate-500">Loading EcoTrack...</p>
      </div>
    );
  }

  // 2. Unauthenticated state (Authentication Portal)
  if (!token) {
    return (
      <div class="min-h-screen bg-slate-50 flex flex-col justify-between">
        <header class="p-6 border-b border-slate-200/60 bg-white/80 backdrop-blur">
          <div class="max-w-6xl mx-auto flex items-center gap-2 text-emerald-600 font-extrabold text-xl font-display">
            <Leaf class="w-6 h-6 text-emerald-500" /> EcoTrack
          </div>
        </header>
        <Auth onAuthSuccess={(data) => {
          setToken(data.token);
          setUser(data.user);
        }} />
        <footer class="p-6 text-center text-slate-400 text-xs border-t border-slate-200/50 bg-white">
          EcoTrack Carbon Tracker &copy; 2026. Zero Manual Input.
        </footer>
      </div>
    );
  }

  // 3. Authenticated but not onboarded state (Location Calibration)
  if (!isOnboarded) {
    return (
      <div class="min-h-screen bg-slate-50 flex flex-col justify-between">
        <header class="p-6 border-b border-slate-200/60 bg-white/80 backdrop-blur">
          <div class="max-w-6xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-2 text-emerald-600 font-extrabold text-xl font-display">
              <Leaf class="w-6 h-6 text-emerald-500" /> EcoTrack
            </div>
            <button
              onClick={() => setToken(null)}
              class="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition-all border border-slate-200"
            >
              Sign Out
            </button>
          </div>
        </header>
        <Onboarding onComplete={handleOnboardingComplete} />
        <footer class="p-6 text-center text-slate-400 text-xs border-t border-slate-200/50 bg-white">
          EcoTrack Carbon Tracker &copy; 2026. Zero Manual Input.
        </footer>
      </div>
    );
  }

  // 4. Authenticated and onboarded state (Core Dashboard)
  return (
    <div class="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      
      {/* Toast Notification Container */}
      {toast && (
        <div class="fixed top-4 right-4 z-[9999] animate-slideIn flex items-center gap-2.5 p-4 rounded-2xl border bg-white shadow-xl max-w-sm border-slate-100">
          {toast.type === 'error' ? (
            <AlertCircle class="w-5 h-5 text-red-500 shrink-0" />
          ) : (
            <Check class="w-5 h-5 text-emerald-500 shrink-0 bg-emerald-50 p-0.5 rounded-full" />
          )}
          <span class="text-xs font-semibold text-slate-800 leading-snug">
            {toast.message}
          </span>
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <aside class="w-full md:w-64 shrink-0 bg-white border-r border-slate-100 flex flex-col justify-between p-6">
        <div class="space-y-8">
          {/* Logo Header */}
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100/50">
              <Leaf class="w-6 h-6" />
            </div>
            <div>
              <h1 class="font-extrabold text-lg text-slate-900 font-display tracking-tight leading-none">EcoTrack</h1>
              <p class="text-[10px] font-semibold text-emerald-600 tracking-wider mt-1 uppercase">Track. Reduce. Impact.</p>
            </div>
          </div>

          {/* Nav List */}
          <nav class="space-y-1.5">
            {[
              { name: 'Dashboard', icon: LayoutDashboard },
              { name: 'My Footprint', icon: Footprints },
              { name: 'Log Activity', icon: ListTodo },
              { name: 'Recommendations', icon: Lightbulb },
              { name: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.name;
              return (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  class={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600 font-bold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon class={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Card with Logout */}
        <div class="border-t border-slate-100 pt-5 mt-6 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-lg">
              👤
            </div>
            <div class="text-left min-w-0">
              <h4 class="text-xs font-bold text-slate-800 leading-tight truncate max-w-[100px]" title={user?.name || user?.email}>
                {user?.name || user?.email?.split('@')[0] || 'Eco Tracker'}
              </h4>
              <p class="text-[10px] font-medium text-emerald-600 uppercase tracking-wider mt-0.5">Eco Warrior</p>
            </div>
          </div>
          <button
            onClick={() => setToken(null)}
            class="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all shrink-0 border border-transparent hover:border-red-100"
            title="Sign Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </button>
        </div>
      </aside>

      {/* Main Tab View Area */}
      <div class="flex-1 flex flex-col justify-between min-h-screen">
        
        {/* Top Navbar */}
        <header class="h-16 border-b border-slate-100 bg-white/70 backdrop-blur px-6 sm:px-8 flex items-center justify-between sticky top-0 z-40">
          <div>
            <span class="text-xs font-medium text-slate-400 uppercase tracking-widest">Workspace</span>
            <h2 class="text-sm font-bold text-slate-800 leading-none mt-1">EcoTrack Dashboard</h2>
          </div>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/50 px-3 py-1.5 rounded-xl">
              <MapPin class="w-3.5 h-3.5 text-emerald-500" />
              <span>Region: {dashboardData?.country || 'US'}</span>
            </div>

            <button
              onClick={() => fetchAppData(true)}
              class="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 text-slate-500 hover:text-slate-800 rounded-xl transition-all"
              title="Refresh Data"
            >
              <RefreshCw class="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Tab Render */}
        <main class="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'Dashboard' && dashboardData && (
            <CarbonDashboard 
              data={dashboardData} 
              insights={insights}
              onScanComplete={handleScanComplete}
            />
          )}

          {activeTab === 'My Footprint' && (
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-2xl font-bold text-slate-900">My Carbon Footprint</h2>
                  <p class="text-xs text-slate-500 mt-1">View the breakdown of all scanned items and travel logs.</p>
                </div>
              </div>

              {/* Table representation */}
              <div class="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-sm text-slate-500">
                    <thead class="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th class="px-6 py-4">Date</th>
                        <th class="px-6 py-4">Store</th>
                        <th class="px-6 py-4">Address</th>
                        <th class="px-6 py-4">Travel (km)</th>
                        <th class="px-6 py-4">Travel Emissions</th>
                        <th class="px-6 py-4">Product Emissions</th>
                        <th class="px-6 py-4">Total</th>
                        <th class="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan="8" class="text-center py-12 text-slate-400 text-xs">
                            No logs recorded. Go to the dashboard to scan a receipt!
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr key={log.id} class="hover:bg-slate-50/50 transition-colors">
                            <td class="px-6 py-4 font-semibold text-slate-800">
                              {new Date(log.scannedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td class="px-6 py-4 font-bold text-slate-800">{log.shopName}</td>
                            <td class="px-6 py-4 text-xs truncate max-w-[150px]">{log.shopAddress || 'N/A'}</td>
                            <td class="px-6 py-4 font-medium">{log.distance?.toFixed(1) || '0.0'} km ({log.travelMode})</td>
                            <td class="px-6 py-4 font-medium text-amber-600">{log.travelEmissions.toFixed(1)} kg</td>
                            <td class="px-6 py-4 font-medium text-emerald-600">{log.productEmissions.toFixed(1)} kg</td>
                            <td class="px-6 py-4 font-extrabold text-slate-900">{log.totalEmissions.toFixed(1)} kg</td>
                            <td class="px-6 py-4 text-center">
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                class="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                title="Delete Log"
                              >
                                <Trash2 class="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Log Activity' && (
            <div class="max-w-2xl mx-auto">
              <BillScanner onScanComplete={handleScanComplete} />
            </div>
          )}

          {activeTab === 'Recommendations' && (
            <div class="space-y-6">
              <div>
                <h2 class="text-2xl font-bold text-slate-900">Personalized Insights</h2>
                <p class="text-xs text-slate-500 mt-1">Recommendations prioritized by potential carbon savings.</p>
              </div>
              <InsightsPanel insights={insights} />
            </div>
          )}

          {activeTab === 'Settings' && (
            <div class="max-w-xl space-y-8">
              <div>
                <h2 class="text-2xl font-bold text-slate-900">Application Settings</h2>
                <p class="text-xs text-slate-500 mt-1">Manage target budgets and clean application logs.</p>
              </div>

              {/* Goal Config */}
              {dashboardData && (
                <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 class="font-bold text-slate-800 text-sm">Carbon Budget Goal</h3>
                  <p class="text-xs text-slate-400 leading-relaxed">
                    Set a monthly carbon target budget. Adjust limits using stepper clicks.
                  </p>
                  <GoalTracker
                    currentEmissions={dashboardData.thisMonth}
                    targetGoal={dashboardData.monthlyGoal}
                    onGoalUpdated={handleGoalUpdated}
                  />
                </div>
              )}

              {/* Reset User History */}
              <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 class="font-bold text-slate-800 text-sm text-red-600">Danger Zone</h3>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Resetting your history will permanently delete all your logged footprint entries and location coordinates.
                </p>
                <button
                  onClick={handleResetDatabase}
                  disabled={clearing}
                  class="py-3 px-5 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-100 hover:border-red-200 text-red-600 font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-2"
                >
                  {clearing ? "Wiping Profile History..." : "Reset Log History & Onboarding"}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer class="border-t border-slate-100 bg-white p-6 text-center text-xs text-slate-400">
          <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>EcoTrack Footprint Tracker &copy; 2026. Zero Manual Input.</p>
            <div class="flex gap-4">
              <span class="hover:text-slate-600 cursor-pointer">Privacy Policy</span>
              <span>&middot;</span>
              <span class="hover:text-slate-600 cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}
