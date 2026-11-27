import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const HydraulicContent: React.FC<{
  playing: boolean;
  f1: number;
  a1: number;
  a2: number;
  resetSignal: number;
}> = ({ playing, f1, a1, a2, resetSignal }) => {
  const leftPistonRef = useRef<THREE.Group>(null);
  const rightPistonRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const safeA1 = Math.max(0.0001, a1);
  const safeA2 = Math.max(0.0001, a2);
  const pressurePa = f1 / safeA1;
  const f2 = f1 * (safeA2 / safeA1);
  const r1 = THREE.MathUtils.clamp(Math.sqrt(safeA1 / Math.PI) * 1.6, 0.22, 0.95);
  const r2 = THREE.MathUtils.clamp(Math.sqrt(safeA2 / Math.PI) * 1.05, 0.35, 1.35);

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      phaseRef.current = 0;
    }
    if (playing) {
      phaseRef.current += Math.min(delta, 0.05) * 1.4;
    }

    const d1 = 0.35 * Math.sin(phaseRef.current);
    const d2 = THREE.MathUtils.clamp(d1 * (safeA1 / safeA2), -0.45, 0.45);

    if (leftPistonRef.current) {
      leftPistonRef.current.position.y = 2.0 - d1;
    }
    if (rightPistonRef.current) {
      rightPistonRef.current.position.y = 1.6 + d2;
    }

    setPinDisplay(
      pinRef.current,
      `P=${(pressurePa / 1000).toFixed(1)} kPa\nF_2=${f2.toFixed(0)} N (${(a2 / a1).toFixed(1)}× gain)`
    );
  });

  return (
    <>
      {/* Connecting horizontal oil channel */}
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.5, 1.0]} />
        <meshStandardMaterial color="#0284c7" transparent opacity={0.42} depthWrite={false} />
      </mesh>

      {/* Left narrow cylinder */}
      <mesh position={[-2.0, 1.35, 0]} renderOrder={2}>
        <cylinderGeometry args={[r1 + 0.08, r1 + 0.08, 2.2, 24]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.28} depthWrite={false} />
      </mesh>

      {/* Right wide cylinder */}
      <mesh position={[2.0, 1.15, 0]} renderOrder={2}>
        <cylinderGeometry args={[r2 + 0.08, r2 + 0.08, 1.8, 28]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.28} depthWrite={false} />
      </mesh>

      {/* Input piston + F1 arrow */}
      <group ref={leftPistonRef} position={[-2.0, 2.0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[r1, r1, 0.25, 24]} />
          <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
        </mesh>
        <Arrow3D origin={[0, 0.9, 0]} direction={[0, -1, 0]} length={0.75} color="#ef4444" />
      </group>

      {/* Output piston + load crate + pinned equation */}
      <group ref={rightPistonRef} position={[2.0, 1.6, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[r2, r2, 0.25, 28]} />
          <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[1.1, 0.7, 0.9]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.38} metalness={0.2} />
        </mesh>
        <Arrow3D origin={[0, 0.95, 0]} direction={[0, 1, 0]} length={1.0} color="#10b981" />
        <PhysicsPin
          position={[0, 1.65, 0]}
          title="$F_2 = F_1(A_2 / A_1)$"
          textRef={pinRef}
          valueText={`F_2=${f2.toFixed(0)} N`}
          accentClass="border-emerald-400"
        />
      </group>
    </>
  );
};

export const HydraulicScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [f1, setF1] = useState(120);
  const [a1, setA1] = useState(0.05);
  const [a2, setA2] = useState(0.45);

  const pressureKpa = f1 / a1 / 1000;
  const f2 = f1 * (a2 / a1);
  const gain = a2 / a1;

  const paramValues = useMemo(
    () => ({ f1, a1, a2 }),
    [f1, a1, a2]
  );

  const handleApplyParams = useCallback((next: Record<string, number | string>) => {
    if (typeof next.f1 === 'number' && Number.isFinite(next.f1)) setF1(next.f1);
    if (typeof next.a1 === 'number' && Number.isFinite(next.a1)) setA1(Math.max(0.0005, next.a1));
    if (typeof next.a2 === 'number' && Number.isFinite(next.a2)) setA2(Math.max(0.01, next.a2));
    setResetSignal((n) => n + 1);
  }, []);

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0, 3.2, 8.2]}
      cameraTarget={[0, 1.5, 0]}
      sceneId="p2-hydraulics"
      paramValues={paramValues}
      onApplyParams={handleApplyParams}
      controls={
        <>
          <SliderControl
            label="Input Force ($F_1$)"
            value={f1}
            min={20}
            max={400}
            customMin={1}
            customMax={5000}
            step={5}
            unit="N"
            onChange={setF1}
          />
          <SliderControl
            label="Input Piston Area ($A_1$)"
            value={a1}
            min={0.02}
            max={0.15}
            customMin={0.0005}
            customMax={1.0}
            step={0.005}
            unit="m²"
            onChange={setA1}
          />
          <SliderControl
            label="Output Piston Area ($A_2$)"
            value={a2}
            min={0.2}
            max={1.0}
            customMin={0.01}
            customMax={5.0}
            step={0.02}
            unit="m²"
            onChange={setA2}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Fluid Pressure (<MathInline text="$P$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {pressureKpa.toFixed(2)} kPa
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Output Force (<MathInline text="$F_2$" />)
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {f2.toFixed(0)} N
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Mechanical Advantage (<MathInline text="$A_2 / A_1$" />)
            </p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-400">
              {gain.toFixed(1)}× force multiplier
            </p>
          </div>
        </div>
      }
    >
      <HydraulicContent
        playing={playing}
        f1={f1}
        a1={a1}
        a2={a2}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default HydraulicScene;
