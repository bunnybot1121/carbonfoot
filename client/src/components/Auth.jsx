import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Leaf, Mail, Lock, User, AlertCircle, RefreshCw } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(null);

  // 1. Fetch Google Client ID and initialize SDK
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await axios.get('/api/auth/config');
        setGoogleClientId(response.data.googleClientId);
      } catch (err) {
        console.error('Failed to load Google Auth configuration', err);
      }
    }
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!googleClientId) return;

    // Helper to initialize Google button
    const initGoogle = () => {
      /* global google */
      if (window.google) {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
        google.accounts.id.renderButton(
          document.getElementById('googleSignInDiv'),
          { 
            theme: 'outline', 
            size: 'large', 
            width: '100%',
            text: 'signin_with',
            shape: 'rectangular'
          }
        );
      }
    };

    // Retry checking window.google if the script is still loading
    const interval = setInterval(() => {
      if (window.google) {
        initGoogle();
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [googleClientId, isLogin]); // Re-render button if tab switches

  // 2. Handle Google ID Token Callback
  const handleGoogleCredentialResponse = async (googleResponse) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/auth/google', {
        credential: googleResponse.credential
      });
      onAuthSuccess(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Google Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Email/Password Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { email, password, name };

    try {
      const response = await axios.post(url, payload);
      onAuthSuccess(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex-1 flex items-center justify-center p-4 min-h-[80vh] bg-slate-50">
      <div class="max-w-md w-full glass rounded-3xl p-8 border border-slate-200/50 shadow-2xl relative overflow-hidden bg-white/85">
        
        {/* Decorative background glow */}
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl"></div>

        {/* Logo and Header */}
        <div class="text-center relative z-10 mb-6">
          <div class="inline-flex items-center justify-center p-4 bg-emerald-50 rounded-2xl text-emerald-600 mb-4 border border-emerald-100/50 shadow-sm">
            <Leaf class="w-8 h-8 animate-pulse" />
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            EcoTrack
          </h1>
          <p class="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">
            Zero-Effort Carbon Footprint Tracking
          </p>
        </div>

        {/* Authentication Switch Tabs */}
        <div class="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 relative z-10 mb-6">
          <button
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            class={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
              isLogin 
                ? 'bg-white text-slate-800 shadow-md font-extrabold' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            class={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
              !isLogin 
                ? 'bg-white text-slate-800 shadow-md font-extrabold' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div class="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs flex gap-2.5 items-start text-left mb-5 relative z-10">
            <AlertCircle class="w-5 h-5 shrink-0 text-red-500" />
            <div>
              <span class="font-bold">Error:</span> {error}
            </div>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} class="space-y-4 relative z-10 text-left">
          
          {/* Name Field (Register Mode Only) */}
          {!isLogin && (
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Full Name</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User class="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl focus:outline-none transition-all text-xs font-semibold text-slate-800 shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div class="space-y-1.5">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Email Address</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail class="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl focus:outline-none transition-all text-xs font-semibold text-slate-800 shadow-sm"
              />
            </div>
          </div>

          {/* Password Field */}
          <div class="space-y-1.5">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Password</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock class="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl focus:outline-none transition-all text-xs font-semibold text-slate-800 shadow-sm"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            class="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all text-xs shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20"
          >
            {loading ? (
              <>
                <RefreshCw class="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              isLogin ? 'Sign In with Email' : 'Create EcoTrack Account'
            )}
          </button>
        </form>

        {/* Divider */}
        {googleClientId && (
          <div class="relative my-6 z-10 flex items-center justify-center">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <span class="relative px-3 text-[10px] text-slate-400 bg-white font-black uppercase tracking-wider">
              Or continue with
            </span>
          </div>
        )}

        {/* Google OAuth Button Container */}
        {googleClientId && (
          <div class="relative z-10 flex justify-center w-full">
            <div id="googleSignInDiv" class="w-full"></div>
          </div>
        )}

      </div>
    </div>
  );
}
