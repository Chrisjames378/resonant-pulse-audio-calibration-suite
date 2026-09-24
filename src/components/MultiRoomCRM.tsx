import React, { useState, useEffect } from 'react';
import { Folder, Plus, Save, HardDrive } from 'lucide-react';
import { EQBandConfiguration } from '../App';
import { saveProfileToFirestore, getProfilesFromFirestore, SavedCalibrationDoc } from '../lib/firebase';

interface MultiRoomCRMProps {
  currentEqMatrix: EQBandConfiguration[];
  onLoadMatrix: (matrix: EQBandConfiguration[]) => void;
}

interface RoomProject {
  id: string;
  clientName: string;
  studioName: string;
  roomType: string;
  listeningPosition: string;
  notes: string;
  createdAt: string;
  eqMatrix: EQBandConfiguration[];
}

export const MultiRoomCRM: React.FC<MultiRoomCRMProps> = ({ currentEqMatrix, onLoadMatrix }) => {
  const [projects, setProjects] = useState<RoomProject[]>([]);
  const [clientName, setClientName] = useState<string>('Acme Mastering');
  const [studioName, setStudioName] = useState<string>('Control Room A');
  const [roomType, setRoomType] = useState<string>('Dolby Atmos 7.1.4 Stage');
  const [position, setPosition] = useState<string>('Mix Position Center');
  const [notes, setNotes] = useState<string>('Main monitors calibrated with Harman target curve');

  useEffect(() => {
    loadCloudProjects();
  }, []);

  const loadCloudProjects = async () => {
    try {
      const docs = await getProfilesFromFirestore('user_pro_01');
      if (docs && docs.length > 0) {
        const mapped: RoomProject[] = docs.map((d) => ({
          id: d.id || Math.random().toString(),
          clientName: 'Studio Client',
          studioName: d.profileName || 'Studio Room',
          roomType: d.deviceType || 'Stereo Control Room',
          listeningPosition: 'Mix Desk',
          notes: d.detectedAcousticIssues?.join(', ') || '',
          createdAt: typeof d.createdAt === 'string' ? d.createdAt : 'Recent',
          eqMatrix: d.eqMatrix || currentEqMatrix
        }));
        setProjects(mapped);
      }
    } catch (e) {
      console.warn('Local offline fallback for CRM projects');
    }
  };

  const handleSaveProject = async () => {
    const newProj: RoomProject = {
      id: Date.now().toString(),
      clientName,
      studioName,
      roomType,
      listeningPosition: position,
      notes,
      createdAt: new Date().toLocaleDateString(),
      eqMatrix: currentEqMatrix
    };

    setProjects([newProj, ...projects]);

    try {
      await saveProfileToFirestore({
        userId: 'user_pro_01',
        profileName: studioName,
        deviceType: roomType,
        detectedAcousticIssues: [clientName, position, notes],
        eqMatrix: currentEqMatrix,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Multi-Room Studio CRM & Project Workspace
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                Client Workspace
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              Manage client acoustic profiles, studio room dimensions, and multi-position calibration runs
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Project Form */}
        <div className="lg:col-span-1 bg-slate-950/80 rounded-xl border border-slate-800 p-5 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" /> Save Active Calibration Project
          </h4>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Client / Studio Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Room Name / ID</label>
            <input
              type="text"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Room Setup Type</label>
            <input
              type="text"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Listening Position / Spot</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Acoustic Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSaveProject}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Project to CRM
          </button>
        </div>

        {/* Saved Projects List */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
            Saved Client Projects & Calibration Logs
          </h4>

          {projects.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs font-mono">
              No saved client projects yet. Fill out the form on the left to save your current acoustic run.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {projects.map((proj) => (
                <div key={proj.id} className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{proj.clientName}</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-950 border border-blue-800 text-blue-300 rounded font-mono">
                        {proj.studioName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>{proj.roomType}</span>
                      <span>•</span>
                      <span>{proj.listeningPosition}</span>
                      <span>•</span>
                      <span>{proj.createdAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onLoadMatrix(proj.eqMatrix)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <HardDrive className="w-3.5 h-3.5" /> Load Calibration
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
