import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, FileText, ShoppingBag, MapPin, 
  Car, Bike, Train, Footprints, AlertTriangle,
  Plus, Trash2, Check, RefreshCw
} from 'lucide-react';

const CATEGORIES = [
  { value: 'meat', label: '🥩 Meat', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'dairy', label: '🥛 Dairy', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'produce', label: '🥦 Produce', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'packaged_food', label: '🥫 Packaged Food', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'household', label: '🧼 Household', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'other', label: '📦 Other', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const TRAVEL_MODES = [
  { value: 'walking', label: '🚶 Walking', factor: 0, icon: Footprints },
  { value: 'cycling', label: '🚴 Cycling', factor: 0, icon: Bike },
  { value: 'transit', label: '🚊 Transit', factor: 0.035, icon: Train },
  { value: 'car', label: '🚗 Driving', factor: 0.170, icon: Car },
];

export default function BillScanner({ onScanComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
    setParsedData(null);
    setError(null);
  };

  const startParse = async () => {
    if (!file) return;
    setParsing(true);
    setError(null);

    const formData = new FormData();
    formData.append('bill', file);

    try {
      const response = await axios.post('/api/logs/parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setParsedData(response.data);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to parse the receipt image. Please ensure the receipt is clear and has readable items and prices.';
      setError(`Error parsing receipt: ${errMsg}`);
    } finally {
      setParsing(false);
    }
  };

  // Edit item actions
  const handleItemChange = (index, field, value) => {
    const updated = { ...parsedData };
    updated.items[index][field] = value;
    setParsedData(updated);
  };

  const deleteItem = (index) => {
    const updated = { ...parsedData };
    updated.items.splice(index, 1);
    setParsedData(updated);
  };

  const addItem = () => {
    const updated = { ...parsedData };
    updated.items.push({
      name: 'New Product',
      category: 'other',
      quantity: 1,
      unit: 'pcs'
    });
    setParsedData(updated);
  };

  const handleTravelModeChange = (mode) => {
    setParsedData({
      ...parsedData,
      travelMode: mode
    });
  };

  const saveLog = async () => {
    setSaving(true);
    try {
      const response = await axios.post('/api/logs', parsedData);
      onScanComplete();
      // Reset scanner
      setFile(null);
      setPreview(null);
      setParsedData(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save carbon footprint log.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden text-slate-800">
      
      {/* Glow highlight */}
      <div class="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>

      <h2 class="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FileText class="w-4 h-4 text-emerald-500" />
        Upload Receipt
      </h2>

      {!parsedData ? (
        <div>
          {/* Upload Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            class="border-2 border-dashed border-slate-200 hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-slate-50 group relative"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              class="hidden"
              accept="image/*"
            />
            {preview ? (
              <div class="relative max-h-48 flex justify-center overflow-hidden rounded-xl">
                <img src={preview} alt="Receipt preview" class="object-contain max-h-48 opacity-90" />
                <div class="absolute inset-0 bg-slate-900/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload class="w-8 h-8 text-white drop-shadow" />
                </div>
              </div>
            ) : (
              <div class="flex flex-col items-center justify-center py-6">
                <div class="p-3 bg-emerald-50 rounded-2xl text-emerald-500 mb-3 border border-emerald-100/50 group-hover:scale-105 transition-transform">
                  <Upload class="w-7 h-7" />
                </div>
                <p class="text-slate-700 font-bold text-xs mb-1">
                  Drag & drop your receipt here
                </p>
                <p class="text-slate-400 text-[10px]">
                  or click to <span class="text-emerald-600 font-bold">browse</span>
                </p>
                <p class="text-slate-400 text-[9px] mt-2">
                  Supports JPG, PNG, PDF (Max 5MB)
                </p>
              </div>
            )}
          </div>

          {file && (
            <button
              onClick={startParse}
              disabled={parsing}
              class="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-all text-xs"
            >
              {parsing ? (
                <>
                  <RefreshCw class="w-4 h-4 animate-spin" />
                  We're analyzing and estimating...
                </>
              ) : (
                <>
                  <ShoppingBag class="w-4 h-4" />
                  Upload & Analyze Receipt
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        /* Receipt Verification & Chips Editing */
        <div class="space-y-5 animate-fadeIn">
          {/* Shop Header */}
          <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
            <div>
              <h3 class="text-slate-800 font-extrabold text-sm">{parsedData.shopName}</h3>
              <p class="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5 font-medium">
                <MapPin class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {parsedData.shopAddress || 'Address Unknown'}
              </p>
            </div>
            
            {/* Travel mode chips */}
            <div class="bg-white p-1 rounded-xl border border-slate-100 flex flex-wrap gap-1">
              {TRAVEL_MODES.map((mode) => {
                const isSelected = parsedData.travelMode === mode.value;
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.value}
                    onClick={() => handleTravelModeChange(mode.value)}
                    class={`py-1 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon class="w-3 h-3" />
                    {mode.label.split(' ')[1]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Travel warning / verification indicator */}
          <div class="text-[10px] text-slate-500 bg-slate-50 p-2.5 border border-slate-100 rounded-xl flex items-center justify-between">
            <span class="flex items-center gap-1">
              🚗 Travel Distance: <strong class="text-slate-800">{parsedData.distance} km</strong>
            </span>
            <span class="text-slate-400 font-medium">
              Inferred from coords
            </span>
          </div>

          {/* Items checklist */}
          <div class="space-y-2">
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1 uppercase tracking-wider">
              <span>Items ({parsedData.items.length})</span>
              <span>Category / Qty</span>
            </div>

            <div class="max-h-48 overflow-y-auto pr-1 space-y-2">
              {parsedData.items.map((item, index) => (
                <div
                  key={index}
                  class="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs group"
                >
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    class="bg-transparent text-slate-800 font-bold focus:outline-none focus:border-b focus:border-emerald-500 pb-0.5 truncate flex-1"
                  />

                  {/* Chips controller */}
                  <div class="flex items-center gap-1.5 flex-wrap">
                    {/* Category Selector */}
                    <select
                      value={item.category}
                      onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                      class={`text-[10px] px-2 py-0.5 rounded-full border bg-white font-bold cursor-pointer focus:outline-none ${
                        CATEGORIES.find(c => c.value === item.category)?.color || 'border-slate-200 text-slate-400'
                      }`}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>

                    {/* Quantity Chip Control (no typing required) */}
                    <div class="flex items-center bg-white border border-slate-200 rounded-full py-0.5 px-1.5">
                      <button
                        onClick={() => handleItemChange(index, 'quantity', Math.max(0.1, parseFloat((item.quantity - 0.1).toFixed(1))))}
                        class="text-slate-400 hover:text-slate-800 font-black px-0.5 text-[10px]"
                      >
                        -
                      </button>
                      <span class="text-slate-700 text-[10px] px-1 font-extrabold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleItemChange(index, 'quantity', parseFloat((item.quantity + 0.1).toFixed(1)))}
                        class="text-slate-400 hover:text-slate-800 font-black px-0.5 text-[10px]"
                      >
                        +
                      </button>
                    </div>

                    {/* Unit Selector */}
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      class="text-[9px] bg-white border border-slate-200 rounded-lg py-0.5 px-1 text-slate-500 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="liter">liter</option>
                    </select>

                    {/* Delete Item Button */}
                    <button
                      onClick={() => deleteItem(index)}
                      class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              class="w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1 transition-all"
            >
              <Plus class="w-3 h-3" /> Add Product
            </button>
          </div>

          {/* Action buttons */}
          <div class="flex gap-2 pt-1.5">
            <button
              onClick={() => setParsedData(null)}
              class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs"
            >
              Clear
            </button>
            <button
              onClick={saveLog}
              disabled={saving}
              class="flex-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all text-xs"
            >
              {saving ? (
                <>
                  <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check class="w-3.5 h-3.5" />
                  Confirm & Save
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div class="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-[10px] flex gap-1.5 items-start">
          <AlertTriangle class="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
