import React, { useState } from 'react';
import axios from 'axios';
import { MapPin, Navigation, AlertCircle, Compass, CheckCircle } from 'lucide-react';

const REGIONS = [
  { code: 'US', name: '🇺🇸 United States (US)', lat: 37.7749, lng: -122.4194 },
  { code: 'DE', name: '🇩🇪 Germany (DE)', lat: 52.5200, lng: 13.4050 },
  { code: 'GB', name: '🇬🇧 United Kingdom (GB)', lat: 51.5074, lng: -0.1278 },
  { code: 'IN', name: '🇮🇳 India (IN)', lat: 12.9716, lng: 77.5946 },
  { code: 'CA', name: '🇨🇦 Canada (CA)', lat: 45.4215, lng: -75.6972 },
  { code: 'FR', name: '🇫🇷 France (FR)', lat: 48.8566, lng: 2.3522 },
];

export default function Onboarding({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Welcome, 2: Accessing, 3: Completed, 4: Manual selection
  const [geoData, setGeoData] = useState(null);

  const requestLocation = () => {
    setLoading(true);
    setError(null);
    setStep(2);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please select your region manually below:");
      setStep(4);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await axios.post('/api/onboarding', {
            lat: latitude,
            lng: longitude
          });
          setGeoData(response.data.geoInfo);
          setStep(3);
          setTimeout(() => {
            onComplete(response.data.user);
          }, 2000);
        } catch (err) {
          console.error(err);
          setError("Failed to geocode your location. Please select your region manually below:");
          setStep(4);
          setLoading(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setError("Location permission denied or unavailable. Please select your region manually below:");
        setStep(4);
        setLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const handleManualSelection = async (region) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/onboarding', {
        lat: region.lat,
        lng: region.lng
      });
      setGeoData(response.data.geoInfo);
      setStep(3);
      setTimeout(() => {
        onComplete(response.data.user);
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("Critical server error while processing selection. Please reload.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[70vh]">
      <div className="max-w-md w-full glass rounded-3xl p-8 border border-slate-200/50 shadow-2xl relative overflow-hidden bg-white/80">
        
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl"></div>

        {step === 1 && (
          <div className="text-center relative z-10">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-50 rounded-2xl text-emerald-600 mb-6 border border-emerald-100">
              <Compass className="w-10 h-10 animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2 font-display">
              EcoTrack
            </h1>
            <p className="text-slate-500 mb-8 leading-relaxed text-sm">
              Discover and reduce your carbon footprint with <span className="text-emerald-600 font-semibold">zero manual entry</span>. All estimates are computed automatically from location context and receipts.
            </p>
            <button
              onClick={requestLocation}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group"
            >
              <Navigation className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Get Started with GPS
            </button>
            <button
              onClick={() => {
                setError(null);
                setStep(4);
              }}
              className="w-full mt-3 py-3 px-6 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-2xl border border-slate-200 transition-all text-xs"
            >
              Configure Location Manually
            </button>
            <p className="text-xs text-slate-400 mt-4 text-center">
              Requires a one-tap location permission. We store your coordinates locally.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center relative z-10">
            <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-2xl text-emerald-500 mb-6 border border-slate-100">
              <MapPin className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Detecting Location...</h2>
            <p className="text-slate-500 mb-6 text-sm">
              Connecting with OpenStreetMap Nominatim for reverse-geocoding...
            </p>
            
            {loading && (
              <div className="flex justify-center items-center gap-1.5 my-6">
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs flex gap-2.5 items-start text-left mb-6">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <div>
                  <span className="font-semibold">Notice:</span> {error}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(4)}
              className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all mt-4"
            >
              Configure Manually
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center relative z-10 animate-fadeIn">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-50 rounded-2xl text-emerald-500 mb-6 border border-emerald-100">
              <CheckCircle className="w-10 h-10 text-emerald-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Location Configured!</h2>
            <p className="text-slate-700 font-semibold mb-1 text-sm">
              {geoData?.address?.split(',').slice(0, 3).join(',')}
            </p>
            <p className="text-xs text-emerald-600 bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-100 mt-2">
              Region Defaults: {geoData?.countryCode} ({geoData?.country})
            </p>
            <p className="text-slate-400 text-xs mt-6">
              Setting up your carbon footprint dashboard...
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="text-center relative z-10">
            <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-2xl text-emerald-500 mb-6 border border-slate-100">
              <MapPin className="w-10 h-10 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Select Your Region</h2>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              We calibrate carbon grid emission factors for your region. Choose your location:
            </p>

            {error && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-xs flex gap-2.5 items-start text-left mb-6">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                <div>
                  <span className="font-semibold">Notice:</span> {error}
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {REGIONS.map((region) => (
                <button
                  key={region.code}
                  disabled={loading}
                  onClick={() => handleManualSelection(region)}
                  className="w-full text-left p-3.5 bg-slate-50 hover:bg-emerald-50 active:bg-emerald-100 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-800 font-bold rounded-2xl text-xs flex items-center justify-between transition-all"
                  aria-label={`Select region: ${region.name}`}
                >
                  <span>{region.name}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200" aria-hidden="true">
                    Select
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setError(null);
                setStep(1);
              }}
              disabled={loading}
              className="w-full mt-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition-all"
            >
              Back to Start
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
