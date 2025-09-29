'use client';

import React, { useState } from 'react';
import { X, Activity, TrendingUp } from 'lucide-react';

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
}

const LogProgressModal: React.FC<LogProgressModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialDate
}) => {
  // Get today's date in local timezone as YYYY-MM-DD
  const getTodayLocalDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<ProgressData>({
    date: initialDate || getTodayLocalDate(),
    weight: '',
    bodyFat: '',
    muscleMass: '',
    mood: '',
    energy: '',
    sleep: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleInputChange = (field: keyof ProgressData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  // Inline styles with maximum specificity to guarantee visibility
  const headerStyle = {
    color: '#000000 !important',
    fontWeight: 'bold',
    opacity: '1',
    fontSize: '18px'
  } as React.CSSProperties;

  const labelStyle = {
    color: '#000000 !important',
    fontWeight: '600',
    opacity: '1',
    fontSize: '14px',
    marginBottom: '4px',
    display: 'block'
  } as React.CSSProperties;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ color: '#000000' }}
    >
      <div 
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ color: '#000000', backgroundColor: '#ffffff' }}
      >
        <div className="p-6" style={{ color: '#000000' }}>
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 style={headerStyle}>
              📊 Log Daily Progress
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              style={{ color: '#666666' }}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div>
              <label style={labelStyle}>
                📅 Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ color: '#000000', backgroundColor: '#ffffff' }}
                required
              />
            </div>

            {/* Body Measurements */}
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <h3 style={headerStyle} className="mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                🏋️ Body Measurements
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle}>
                    ⚖️ Weight (lbs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    placeholder="e.g., 150.5"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    📊 Body Fat %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.bodyFat}
                    onChange={(e) => handleInputChange('bodyFat', e.target.value)}
                    placeholder="e.g., 18.5"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    💪 Muscle Mass (lbs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.muscleMass}
                    onChange={(e) => handleInputChange('muscleMass', e.target.value)}
                    placeholder="e.g., 120.0"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>
            </div>

            {/* Daily Wellness */}
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <h3 style={headerStyle} className="mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                🌟 Daily Wellness
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle}>
                    😊 Mood (1-10)
                  </label>
                  <select
                    value={formData.mood}
                    onChange={(e) => handleInputChange('mood', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Select mood</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num} style={{ color: '#000000' }}>
                        {num} {num <= 3 ? "😞" : num <= 6 ? "😐" : "😊"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    ⚡ Energy Level (1-10)
                  </label>
                  <select
                    value={formData.energy}
                    onChange={(e) => handleInputChange('energy', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Select energy</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num} style={{ color: '#000000' }}>
                        {num} {num <= 3 ? "💤" : num <= 6 ? "⚡" : "🔥"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    😴 Sleep (hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.sleep}
                    onChange={(e) => handleInputChange('sleep', e.target.value)}
                    placeholder="e.g., 7.5"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <label style={labelStyle}>
                📝 Notes & Reflections
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="How are you feeling today? Any observations about your fitness journey?"
                rows={3}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                style={{ color: '#000000', backgroundColor: '#ffffff' }}
              />
            </div>

            {/* Progress Tips */}
            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
              <h4 style={headerStyle} className="mb-3">
                💡 Progress Tracking Tips
              </h4>
              <div style={{ color: '#000000', fontSize: '14px' }} className="space-y-2">
                <div style={{ color: '#000000' }}>
                  • <strong style={{ color: '#000000' }}>Weigh yourself at the same time each day</strong> (preferably morning)
                </div>
                <div style={{ color: '#000000' }}>
                  • <strong style={{ color: '#000000' }}>Track consistently</strong> for better trend analysis
                </div>
                <div style={{ color: '#000000' }}>
                  • <strong style={{ color: '#000000' }}>Focus on overall trends</strong> rather than daily fluctuations
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                style={{ color: '#374151' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
                style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              >
                💾 Save Progress
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LogProgressModal;