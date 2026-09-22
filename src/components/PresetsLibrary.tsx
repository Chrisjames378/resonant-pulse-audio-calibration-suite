import React, { useState, useEffect } from 'react';
import { 
  Bookmark, Plus, Check, Trash2, Sliders, Volume2, 
  Search, Shield, Star, Sparkles, RefreshCw, Layers 
} from 'lucide-react';
import { EQBandConfiguration } from '../App';
import { EQPresetDoc, savePresetToFirestore, getPresetsFromFirestore, deletePresetFromFirestore } from '../lib/firebase';

interface PresetsLibraryProps {
  userId: string;
  activeEqMatrix: EQBandConfiguration[];
  onApplyPreset: (matrix: EQBandConfiguration[], name: string, device: string) => void;
}

// Built-in Factory Standard Audio Reference Presets
const FACTORY_PRESETS: Array<{
  id: string;
  name: string;
  deviceType: string;
  description: string;
  matrix: EQBandConfiguration[];
}> = [
  {
    id: 'factory_flat',
    name: 'Flat Reference (0 dB)',
    deviceType: 'Studio Monitor',
    description: 'Uncolored linear response for precise acoustic mastering.',
    matrix: [
      { freq: 31, gain: 0 }, { freq: 62, gain: 0 }, { freq: 125, gain: 0 },
      { freq: 250, gain: 0 }, { freq: 500, gain: 0 }, { freq: 1000, gain: 0 },
      { freq: 2000, gain: 0 }, { freq: 4000, gain: 0 }, { freq: 8000, gain: 0 },
      { freq: 16000, gain: 0 }
    ]
  },
  {
    id: 'factory_harman',
    name: 'Harman Target Curve',
    deviceType: 'Headphones',
    description: 'Scientifically tuned bass boost with natural high-frequency roll-off.',
    matrix: [
      { freq: 31, gain: 5.5 }, { freq: 62, gain: 4.0 }, { freq: 125, gain: 1.5 },
      { freq: 250, gain: -1.0 }, { freq: 500, gain: 0.0 }, { freq: 1000, gain: 1.0 },
      { freq: 2000, gain: 3.0 }, { freq: 4000, gain: 1.5 }, { freq: 8000, gain: -1.0 },
      { freq: 16000, gain: -2.5 }
    ]
  },
  {
    id: 'factory_bass_boost',
    name: 'Sub-Bass Resonance Enhancement',
    deviceType: 'Subwoofer',
    description: 'Deep sub-bass extension for electronic and cinema soundtracks.',
    matrix: [
      { freq: 31, gain: 6.5 }, { freq: 62, gain: 5.0 }, { freq: 125, gain: 2.5 },
      { freq: 250, gain: 0.0 }, { freq: 500, gain: -1.0 }, { freq: 1000, gain: -1.5 },
      { freq: 2000, gain: 0.0 }, { freq: 4000, gain: 1.0 }, { freq: 8000, gain: 1.5 },
      { freq: 16000, gain: 2.0 }
    ]
  },
  {
    id: 'factory_vocal_clarity',
    name: 'Vocal Presence & Mid-Range',
    deviceType: 'Soundbar',
    description: 'Enhances dialogue intelligible frequencies (1kHz - 4kHz) for broadcast.',
    matrix: [
      { freq: 31, gain: -2.0 }, { freq: 62, gain: -1.5 }, { freq: 125, gain: -1.0 },
      { freq: 250, gain: 0.5 }, { freq: 500, gain: 1.5 }, { freq: 1000, gain: 3.5 },
      { freq: 2000, gain: 4.0 }, { freq: 4000, gain: 2.5 }, { freq: 8000, gain: 1.0 },
      { freq: 16000, gain: 0.0 }
    ]
  },
  {
    id: 'factory_air_detail',
    name: 'High-End Air & Crisp Sparkle',
    deviceType: 'Monitor',
    description: 'Smooth high-shelf lift at 8kHz - 16kHz for openness and soundstage.',
    matrix: [
      { freq: 31, gain: 0.0 }, { freq: 62, gain: 0.5 }, { freq: 125, gain: 0.0 },
      { freq: 250, gain: -0.5 }, { freq: 500, gain: 0.0 }, { freq: 1000, gain: 0.5 },
      { freq: 2000, gain: 1.5 }, { freq: 4000, gain: 2.5 }, { freq: 8000, gain: 4.0 },
      { freq: 16000, gain: 5.0 }
    ]
  }
];

export const PresetsLibrary: React.FC<PresetsLibraryProps> = ({
  userId,
  activeEqMatrix,
  onApplyPreset,
}) => {
  const [customPresets, setCustomPresets] = useState<EQPresetDoc[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // New preset form state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newDeviceType, setNewDeviceType] = useState<string>('Studio Monitor');
  const [newRoomName, setNewRoomName] = useState<string>('Control Room');
  const [newDescription, setNewDescription] = useState<string>('');
  const [activeAppliedId, setActiveAppliedId] = useState<string>('factory_flat');
  const [saveStatusMsg, setSaveStatusMsg] = useState<string>('');

  // Fetch presets from Firestore on load or when userId changes
  useEffect(() => {
    loadPresets();
  }, [userId]);

  const loadPresets = async () => {
    setIsLoading(true);
    try {
      const presets = await getPresetsFromFirestore(userId);
      setCustomPresets(presets);
    } catch (e) {
      console.warn('Error fetching presets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCurrentAsPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    try {
      const newDoc: Omit<EQPresetDoc, 'id'> = {
        userId,
        presetName: newPresetName.trim(),
        deviceType: newDeviceType,
        roomName: newRoomName.trim(),
        description: newDescription.trim(),
        eqMatrix: activeEqMatrix,
      };

      const presetId = await savePresetToFirestore(newDoc);
      setSaveStatusMsg(`Saved preset "${newPresetName}" to library!`);
      setShowCreateModal(false);
      setNewPresetName('');
      setNewDescription('');
      loadPresets();
    } catch (err) {
      console.error('Error saving preset:', err);
    }
  };

  const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deletePresetFromFirestore(id);
      setCustomPresets((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Delete preset failed:', err);
    }
  };

  const handleSelectPreset = (
    id: string,
    matrix: EQBandConfiguration[],
    name: string,
    device: string
  ) => {
    setActiveAppliedId(id);
    onApplyPreset(matrix, name, device);
  };

  // Filter logic
  const allCategories = ['All', 'Factory', 'Custom', 'Studio Monitor', 'Headphones', 'Subwoofer', 'Soundbar'];

  const filteredFactory = FACTORY_PRESETS.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || selectedCategory === 'Factory' || p.deviceType.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const filteredCustom = customPresets.filter((p) => {
    const matchesSearch = p.presetName.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || selectedCategory === 'Custom' || p.deviceType.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-400" /> EQ Presets Library
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Save, tag, and recall global target curves across studio monitors, headphones & rooms</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Save Current Curve as Preset
          </button>
        </div>
      </div>

      {saveStatusMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-xs text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" /> {saveStatusMsg}
          </span>
          <button onClick={() => setSaveStatusMsg('')} className="text-[10px] text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search preset or device..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Presets Grid */}
      {(selectedCategory === 'All' || selectedCategory === 'Custom') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Your Saved Presets ({filteredCustom.length})
            </span>
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />}
          </div>

          {filteredCustom.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredCustom.map((preset) => {
                const isSelected = activeAppliedId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() =>
                      handleSelectPreset(preset.id || '', preset.eqMatrix, preset.presetName, preset.deviceType)
                    }
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs text-white group-hover:text-blue-300 transition-colors">
                          {preset.presetName}
                        </h4>
                        <button
                          onClick={(e) => handleDeletePreset(preset.id || '', e)}
                          className="text-slate-600 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                          {preset.deviceType}
                        </span>
                        {preset.roomName && (
                          <span className="text-[10px] text-slate-500">📍 {preset.roomName}</span>
                        )}
                      </div>

                      {preset.description && (
                        <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">{preset.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900/80">
                      <span className="text-[10px] text-slate-500">10-Band Curve</span>
                      <button
                        className={`text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 group-hover:bg-blue-600 group-hover:text-white'
                        }`}
                      >
                        {isSelected ? <Check className="w-3 h-3" /> : null}
                        {isSelected ? 'Active' : 'Apply'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              No custom presets saved yet. Adjust EQ gain sliders and click "Save Current Curve as Preset".
            </div>
          )}
        </div>
      )}

      {/* Factory Standard Reference Presets */}
      <div className="space-y-3">
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-indigo-400" /> Factory Calibration Presets ({filteredFactory.length})
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredFactory.map((preset) => {
            const isSelected = activeAppliedId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id, preset.matrix, preset.name, preset.deviceType)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-white">{preset.name}</h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      Factory
                    </span>
                  </div>

                  <span className="inline-block text-[10px] text-slate-400 mt-1 font-mono">
                    {preset.deviceType}
                  </span>

                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{preset.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900/80">
                  <span className="text-[10px] text-slate-500">Acoustic Reference</span>
                  <button
                    className={`text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3" /> : null}
                    {isSelected ? 'Active' : 'Apply'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Preset Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-blue-400" /> Save EQ Curve Preset Template
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCurrentAsPreset} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Preset Name *</label>
                <input
                  type="text"
                  required
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="e.g., Living Room TV Soundbar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Device Type</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Studio Monitor">Studio Monitor</option>
                    <option value="Headphones">Headphones</option>
                    <option value="Soundbar">Soundbar</option>
                    <option value="Subwoofer">Subwoofer</option>
                    <option value="Bluetooth Speaker">Bluetooth Speaker</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Room / Studio</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g., Main Control Room"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Acoustic Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g., Tames boundary reflection null at 62Hz and adds high-end air"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl shadow transition-all cursor-pointer"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
