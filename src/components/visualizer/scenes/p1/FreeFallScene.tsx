import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin } from '../../PhysicsPin';
import type { SceneComponentProps } from '../../scenesCatalog';

const FreeFallContent: React.FC<{
  playing: boolean;
  height: number;
  gravity: number;
  mass: number;
  resetSignal: number;
}> = ({ playing, height, gravity, mass, resetSignal }) => {
  const scale = 4.5 / Math.max(height, 4);
  const tImpact = Math.sqrt((2 * height) / gravity);

  const ballRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const simTimeRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      simTimeRef.current = 0;
    }

    if (playing) {
      simTimeRef.current += Math.min(delta, 0.05);
      if (simTimeRef.current > tImpact + 0.8) {
        simTimeRef.current = 0;
      }
    }

    const t = Math.min(simTimeRef.current, tImpact);
    const y = Math.max(0, height - 0.5 * gravity * t * t);
    const v = -gravity * t;
    const ke = 0.5 * mass * v * v;
    const pe = mass * gravity * y;

    if (ballRef.current) {
      ballRef.current.position.set(0, y * scale + 0.28, 0);
    }

    if (pinRef.current) {
      pinRef.current.textContent = `y=${y.toFixed(2)} m  t=${t.toFixed(2)} s\nv=${v.toFixed(
        2
      )} m/s  KE=${ke.toFixed(0)} J  PE=${pe.toFixed(0)} J`;
    }
  });

  const poleH = height * scale + 0.3;

  return (
    <>
      {/* Vertical meter tower */}
      <mesh position={[-1.4, poleH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, poleH, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[-0.7, height * scale + 0.28, 0]} castShadow>
        <boxGeometry args={[1.4, 0.08, 0.25]} />
        <meshStandardMaterial color="#334155" metalness={0.45} roughness={0.4} />
      </mesh>

      {/* Landing pad */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.9, 0.96, 0.1, 24]} />
        <meshStandardMaterial color="#334155" metalness={0.3} roughness={0.55} />
      </mesh>

      <group ref={ballRef} position={[0, height * scale + 0.28, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.28, 28, 28]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.22} metalness={0.55} />
        </mesh>
        <Arrow3D
          origin={[0, -0.28, 0]}
          direction={[0, -1, 0]}
          length={Math.min(1.6, 0.4 + gravity * 0.05)}
          color="#ef4444"
        />
        <PhysicsPin
          position={[0.8, 0.35, 0]}
          title="$y = h_0 - \tfrac{1}{2}gt^2$"
          textRef={pinRef}
          valueText={`y=${height.toFixed(2)} m`}
          accentClass="border-blue-400"
        />
      </group>
    </>
  );
};

export const FreeFallScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [height, setHeight] = useState(12);
  const [gravity, setGravity] = useState(9.81);
  const [mass, setMass] = useState(2);

  const tImpact = Math.sqrt((2 * height) / gravity);
  const vImpact = gravity * tImpact;

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[2.4, 3.2, 7.5]}
      cameraTarget={[0, 2.2, 0]}
      controls={
        <>
          <SliderControl
            label="Drop Height ($h_0$)"
            value={height}
            min={4}
            max={25}
            step={1}
            unit="m"
            onChange={(v) => {
              setHeight(v);
              setResetSignal((n) => n + 1);
            }}
          />
          <SliderControl
            label="Gravity ($g$)"
            value={gravity}
            min={1.6}
            max={24.8}
            step={0.1}
            unit="m/s²"
            onChange={(v) => {
              setGravity(v);
              setResetSignal((n) => n + 1);
            }}
          />
          <SliderControl
            label="Object Mass ($m$)"
            value={mass}
            min={0.5}
            max={10}
            step={0.5}
            unit="kg"
            onChange={setMass}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-slate-50 dark:bg-neutral-950 p-3 border border-slate-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">Time to Ground</p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {tImpact.toFixed(2)} s
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-neutral-950 p-3 border border-slate-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">Impact Speed</p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {vImpact.toFixed(2)} m/s
            </p>
          </div>
        </div>
      }
    >
      <FreeFallContent
        playing={playing}
        height={height}
        gravity={gravity}
        mass={mass}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default FreeFallScene;
