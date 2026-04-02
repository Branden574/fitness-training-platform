'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, CalendarDays, Camera } from 'lucide-react';
import ProgressCharts from '@/components/ProgressCharts';
import DailyProgressView from '@/components/DailyProgressView';

interface PhotoEntry {
  id: string;
  date: string;
  photos: string[];
  weight?: number | null;
  notes?: string | null;
}

interface ProgressTabProps {
  onLogProgress: () => void;
}

export default function ProgressTab({ onLogProgress }: ProgressTabProps) {
  const [view, setView] = useState<'charts' | 'daily' | 'photos'>('charts');
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (view === 'photos') {
      fetchPhotos();
    }
  }, [view]);

  const fetchPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const res = await fetch('/api/progress/photos');
      if (res.ok) {
        const data = await res.json();
        setPhotoEntries(data.entries || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingPhotos(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Progress</h2>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-[#111827] rounded-xl p-1">
            {([
              { key: 'charts' as const, icon: BarChart3, label: 'Analytics' },
              { key: 'daily' as const, icon: CalendarDays, label: 'Daily Log' },
              { key: 'photos' as const, icon: Camera, label: 'Photos' },
            ]).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  view === key
                    ? 'bg-white dark:bg-[#1a1f2e] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onLogProgress}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Log Progress</span>
            <span className="sm:hidden">Log</span>
          </button>
        </div>
      </div>

      {/* Analytics View */}
      {view === 'charts' && <ProgressCharts />}

      {/* Daily Log View */}
      {view === 'daily' && <DailyProgressView />}

      {/* Photos View */}
      {view === 'photos' && (
        <div className="space-y-4">
          {loadingPhotos ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full" />
            </div>
          ) : photoEntries.length === 0 ? (
            <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042] p-12 text-center">
              <Camera className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Progress Photos Yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Upload photos when you log your progress to track your transformation visually.
              </p>
              <button
                onClick={onLogProgress}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Log progress with photos
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {photoEntries.map((entry) => (
                <div key={entry.id} className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-gray-100 dark:border-[#2a3042] overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-[#2a3042] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(entry.date)}</p>
                      {entry.weight && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{entry.weight} lbs</p>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{entry.notes}</p>
                    )}
                  </div>
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {(entry.photos as string[]).map((photo, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedPhoto(photo)}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-[#111827] hover:opacity-90 transition-opacity"
                      >
                        <img src={photo} alt={`Progress ${formatDate(entry.date)}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={selectedPhoto}
            alt="Progress photo"
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </motion.div>
  );
}
