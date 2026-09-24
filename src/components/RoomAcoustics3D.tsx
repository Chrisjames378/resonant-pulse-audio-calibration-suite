import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Eye, Sparkles, ShieldCheck, HelpCircle, RefreshCw, Layers } from 'lucide-react';

export const RoomAcoustics3D: React.FC = () => {
  // Room Dimensions (Meters)
  const [lengthM, setLengthM] = useState<number>(5.2); // ~17 ft
  const [widthM, setWidthM] = useState<number>(3.8);   // ~12.5 ft
  const [heightM, setHeightM] = useState<number>(2.6);  // ~8.5 ft

  const [showReflections, setShowReflections] = useState<boolean>(true);
  const [showRoomModes, setShowRoomModes] = useState<boolean>(true);
  const [showPanels, setShowPanels] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculate Acoustic Physics Parameters
  const roomVolume = lengthM * widthM * heightM;
  const surfaceArea = 2 * (lengthM * widthM + lengthM * heightM + widthM * heightM);

  // Speed of sound c = 343 m/s
  const speedOfSound = 343;

  // Axial Modes
  const lengthMode1 = (speedOfSound / (2 * lengthM)).toFixed(1);
  const widthMode1 = (speedOfSound / (2 * widthM)).toFixed(1);
  const heightMode1 = (speedOfSound / (2 * heightM)).toFixed(1);

  // Estimated Schroeder Frequency fs = 2000 * sqrt(RT60 / V) ~ assuming RT60=0.35s
  const schroederFreq = Math.round(2000 * Math.sqrt(0.35 / Math.max(1, roomVolume)));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Slate-950

    const camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    camera.position.set(lengthM * 1.8, heightM * 2.2, widthM * 2.2);
    camera.lookAt(0, 0, 0);

    // Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // 1. Studio Room Box Wireframe
    const roomGeo = new THREE.BoxGeometry(lengthM, heightM, widthM);
    const roomEdges = new THREE.EdgesGeometry(roomGeo);
    const roomLineMat = new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 2 });
    const roomWireframe = new THREE.LineSegments(roomEdges, roomLineMat);
    scene.add(roomWireframe);

    // Room Floor Grid
    const floorGrid = new THREE.GridHelper(Math.max(lengthM, widthM) * 1.2, 10, 0x475569, 0x1e293b);
    floorGrid.position.y = -heightM / 2;
    scene.add(floorGrid);

    // 2. Mix Desk & Producer Position
    const deskGeo = new THREE.BoxGeometry(1.6, 0.75, 0.9);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const deskMesh = new THREE.Mesh(deskGeo, deskMat);
    deskMesh.position.set(-lengthM * 0.15, -heightM / 2 + 0.375, 0);
    scene.add(deskMesh);

    // Listener / Mix Chair Target (Sphere marker for listener ears)
    const listenerGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const listenerMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.6 });
    const listenerMesh = new THREE.Mesh(listenerGeo, listenerMat);
    const listenerPos = new THREE.Vector3(-lengthM * 0.1, -heightM / 2 + 1.2, 0);
    listenerMesh.position.copy(listenerPos);
    scene.add(listenerMesh);

    // 3. Left & Right Studio Monitor Speakers
    const speakerGeo = new THREE.BoxGeometry(0.25, 0.4, 0.3);
    const speakerMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.3 });

    const leftSpeakerPos = new THREE.Vector3(-lengthM * 0.35, -heightM / 2 + 1.1, -widthM * 0.25);
    const rightSpeakerPos = new THREE.Vector3(-lengthM * 0.35, -heightM / 2 + 1.1, widthM * 0.25);

    const leftSpeaker = new THREE.Mesh(speakerGeo, speakerMat);
    leftSpeaker.position.copy(leftSpeakerPos);
    scene.add(leftSpeaker);

    const rightSpeaker = new THREE.Mesh(speakerGeo, speakerMat);
    rightSpeaker.position.copy(rightSpeakerPos);
    scene.add(rightSpeaker);

    // 4. First Reflection Rays (Side Walls, Ceiling, Desk)
    if (showReflections) {
      // Reflection point on left wall
      const leftWallZ = -widthM / 2;
      const reflLeftZ = (leftSpeakerPos.z + listenerPos.z) / 2; // Midpoint approximation
      const reflLeftPos = new THREE.Vector3(listenerPos.x, listenerPos.y, leftWallZ);

      // Ray left speaker -> wall -> listener
      const rayMat = new THREE.LineDashedMaterial({ color: 0x06b6d4, dashSize: 0.15, gapSize: 0.1 });
      
      const leftRayGeo = new THREE.BufferGeometry().setFromPoints([leftSpeakerPos, reflLeftPos, listenerPos]);
      const leftRayLine = new THREE.Line(leftRayGeo, rayMat);
      leftRayLine.computeLineDistances();
      scene.add(leftRayLine);

      // Reflection point on right wall
      const reflRightPos = new THREE.Vector3(listenerPos.x, listenerPos.y, widthM / 2);
      const rightRayGeo = new THREE.BufferGeometry().setFromPoints([rightSpeakerPos, reflRightPos, listenerPos]);
      const rightRayLine = new THREE.Line(rightRayGeo, rayMat);
      rightRayLine.computeLineDistances();
      scene.add(rightRayLine);
    }

    // 5. Standing Wave Pressure Nodes (Hotspots in room corners)
    if (showRoomModes) {
      const cornerGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const cornerMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.55 });

      const corners = [
        new THREE.Vector3(-lengthM / 2, -heightM / 2, -widthM / 2),
        new THREE.Vector3(-lengthM / 2, -heightM / 2, widthM / 2),
        new THREE.Vector3(lengthM / 2, -heightM / 2, -widthM / 2),
        new THREE.Vector3(lengthM / 2, -heightM / 2, widthM / 2),
      ];

      corners.forEach((cPos) => {
        const cMesh = new THREE.Mesh(cornerGeo, cornerMat);
        cMesh.position.copy(cPos);
        scene.add(cMesh);
      });
    }

    // 6. Recommended Acoustic Panels (Side Reflection & Bass Traps)
    if (showPanels) {
      const panelGeo = new THREE.BoxGeometry(0.8, 1.2, 0.08);
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.9 });

      // Left Wall Absorber Panel
      const leftPanel = new THREE.Mesh(panelGeo, panelMat);
      leftPanel.position.set(listenerPos.x, listenerPos.y, -widthM / 2 + 0.04);
      scene.add(leftPanel);

      // Right Wall Absorber Panel
      const rightPanel = new THREE.Mesh(panelGeo, panelMat);
      rightPanel.position.set(listenerPos.x, listenerPos.y, widthM / 2 - 0.04);
      scene.add(rightPanel);
    }

    // Simple Orbit Animation Rotation
    let animId: number;
    let angle = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      angle += 0.003;

      const radius = Math.sqrt(lengthM * lengthM + widthM * widthM) * 1.3;
      camera.position.x = Math.sin(angle) * radius;
      camera.position.z = Math.cos(angle) * radius;
      camera.position.y = heightM * 1.4;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [lengthM, widthM, heightM, showReflections, showRoomModes, showPanels]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Interactive 3D Room Acoustic & Standing Wave Visualizer
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                WEBGL 3D PHYSICS
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Visualizes 1st reflection ray traces, axial standing wave pressure nodes, and acoustic panel placement
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D WebGL Canvas */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 relative h-80 overflow-hidden shadow-inner flex flex-col justify-between">
          <canvas ref={canvasRef} className="w-full h-full block rounded-xl" />

          {/* Canvas Controls Overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] text-slate-300 font-mono">
              3D Orbiting View (343m/s Wave Velocity)
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setShowReflections(!showReflections)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  showReflections
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Rays: {showReflections ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setShowRoomModes(!showRoomModes)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  showRoomModes
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Nodes: {showRoomModes ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setShowPanels(!showPanels)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  showPanels
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Traps: {showPanels ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Room Parameters & Physics Diagnostics */}
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-white block">Room Geometry Inputs</span>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Length (m)</span>
                <span className="font-mono font-bold text-cyan-400">{lengthM} m (~{(lengthM * 3.28084).toFixed(1)} ft)</span>
              </div>
              <input
                type="range"
                min="2.5"
                max="10.0"
                step="0.1"
                value={lengthM}
                onChange={(e) => setLengthM(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Width (m)</span>
                <span className="font-mono font-bold text-indigo-400">{widthM} m (~{(widthM * 3.28084).toFixed(1)} ft)</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="8.0"
                step="0.1"
                value={widthM}
                onChange={(e) => setWidthM(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Height (m)</span>
                <span className="font-mono font-bold text-purple-400">{heightM} m (~{(heightM * 3.28084).toFixed(1)} ft)</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="5.0"
                step="0.1"
                value={heightM}
                onChange={(e) => setHeightM(parseFloat(e.target.value))}
                className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Modal Frequency Diagnostics */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-white block">Fundamental Axial Room Modes</span>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Length Mode</span>
                <span className="font-bold text-red-400">{lengthMode1} Hz</span>
              </div>

              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Width Mode</span>
                <span className="font-bold text-red-400">{widthMode1} Hz</span>
              </div>

              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Height Mode</span>
                <span className="font-bold text-red-400">{heightMode1} Hz</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-1 flex justify-between">
              <span>Schroeder Cutoff Frequency ($f_s$):</span>
              <strong className="text-emerald-400 font-mono">{schroederFreq} Hz</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
