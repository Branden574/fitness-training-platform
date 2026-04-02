'use client';

import React, { useState, useRef } from 'react';
import { X, Scale, Heart, Moon, Camera, Plus, Trash2 } from 'lucide-react';

interface LogProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProgressData) => void;
  initialDate?: string;
}

interface ProgressData {
  date: string;
  weight: string;
  bodyFat: string;
  muscleMass: string;
  mood: string;
  energy: string;
  sleep: string;
  notes: string;
  photos?: File[];
}

export default function LogProgressModal({ isOpen, onClose, onSubmit, initialDate }: LogProgressModalProps) {
  const getTodayLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState<ProgressData>({
    date: initialDate || getTodayLocalDate(),
    weight: '', bodyFat: '', muscleMass: '',
    mood: '', energy: '', sleep: '', notes: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, photos });
    setFormData({
      date: initialDate || getTodayLocalDate(),
      weight: '', bodyFat: '', muscleMass: '',
      mood: '', energy: '', sleep: '', notes: '',
    });
    setPhotos([]);
    setPhotoPreview([]);
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024); // 10MB max
    setPhotos(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreview(prev => prev.filter((_, i) => i !== index));
  };

  const update = (field: keyof ProgressData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1f2e] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#2a3042]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log Progress</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242938] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => update('date', e.target.value)}
                max={getTodayLocalDate()}
                required
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#2a3042] rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Body Measurements */}
            <div className="bg-gray-50 dark:bg-[#111827] rounded-xl p-4 border border-gray-100 dark:border-[#2a3042]">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-500" />
                Body Measurements
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Weight (lbs)</label>
                  <input type="number" step="0.1" value={formData.weight} onChange={(e) => update('weight', e.target.value)}
                    placeholder="150.5"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#1a1f2e] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Body Fat %</label>
                  <input type="number" step="0.1" min="0" max="60" value={formData.bodyFat} onChange={(e) => update('bodyFat', e.target.value)}
                    placeholder="18.5"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#1a1f2e] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Muscle (lbs)</label>
                  <input type="number" step="0.1" value={formData.muscleMass} onChange={(e) => update('muscleMass', e.target.value)}
                    placeholder="120.0"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#1a1f2e] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
            </div>

            {/* Wellness */}
            <div className="bg-gray-50 dark:bg-[#111827] rounded-xl p-4 border border-gray-100 dark:border-[#2a3042]">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                Daily Wellness
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Mood (1-10)</label>
                  <select value={formData.mood} onChange={(e) => update('mood', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#1a1f2e] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">--</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Energy (1-10)</label>
                  <select value={formData.energy} onChange={(e) => update('energy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#1a1f2e] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">--</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sleep (hrs)</label>
                  <input type="number" step="0.5" min="0" max="24" value={formData.sleep} onChange={(e) => update('sleep', e.target.value)}
                    placeholder="7.5"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a3042] rounded-lg bg-white dark:bg-[#1a1f2e] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
            </div>

            {/* Progress Photos */}
            <div className="bg-gray-50 dark:bg-[#111827] rounded-xl p-4 border border-gray-100 dark:border-[#2a3042]">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-violet-500" />
                Progress Photos
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-auto">Optional</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {photoPreview.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-[#2a3042]">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white hover:bg-black/80">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 4 && (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-[#353d52] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                    <Plus className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Add</span>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoAdd} className="hidden" />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">Max 4 photos, 10MB each</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                <Moon className="w-4 h-4 text-amber-500" />
                Notes & Reflections
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="How are you feeling? Any observations about your fitness journey?"
                rows={3}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#2a3042] rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-200 dark:border-[#2a3042] flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242938] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3042] transition-colors text-sm font-medium">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium">
              Log Progress
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
