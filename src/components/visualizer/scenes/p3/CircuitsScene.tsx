import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { PhysicsPin } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const OUTER_BEADS = 6;
const BRANCH_BEADS = 4;

function sampleOuterLoop(tUnit: number): [number, number] {
  const p = ((tUnit % 1) + 1) % 1 * 4;
  if (p < 1) return [THREE.MathUtils.lerp(-2.6, 2.6, p), -1.4];
  if (p < 2) return [2.6, THREE.MathUtils.lerp(-1.4, 1.4, p - 1)];
  if (p < 3) return [THREE.MathUtils.lerp(2.6, -2.6, p - 2), 1.4];
  return [-2.6, THREE.MathUtils.lerp(1.4, -1.4, p - 3)];
}

const BulbAssembly: React.FC<{
  position: [number, number, number];
  glow: number;
  bandColor: string;
}> = ({ position, glow, bandColor }) => (
  <group position={position}>
    {/* Ceramic resistor collar */}
    <mesh castShadow>
      <cylinderGeometry args={[0.22, 0.22, 0.42, 20]} />
      <meshStandardMaterial color="#e2e8f0" roughness={0.45} metalness={0.1} />
    </mesh>
    {/* Resistor color band */}
    <mesh position={[0, 0.04, 0]}>
      <cylinderGeometry args={[0.225, 0.225, 0.08, 20]} />
      <meshStandardMaterial color={bandColor} roughness={0.4} />
    </mesh>
    {/* Brass screw socket */}
    <mesh position={[0, 0.26, 0]}>
      <cylinderGeometry args={[0.17, 0.19, 0.14, 18]} />
      <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.22} />
    </mesh>
    {/* Glowing filament coil */}
    <mesh position={[0, 0.48, 0]}>
      <torusGeometry args={[0.09, 0.022, 10, 20]} />
      <meshStandardMaterial
        color="#fef08a"
        emissive="#facc15"
        emissiveIntensity={0.25 + glow * 1.4}
      />
    </mesh>
    {/* Outer clear glass globe */}
    <mesh position={[0, 0.5, 0]} renderOrder={2}>
      <sphereGeometry args={[0.3, 24, 24]} />
      <meshStandardMaterial
        color="#fef9c3"
        emissive="#facc15"
        emissiveIntensity={0.1 + glow * 0.65}
        transparent
        opacity={0.48}
        roughness={0.1}
        depthWrite={false}
      />
    </mesh>
    <pointLight
      position={[0, 0.6, 0]}
      color="#fde047"
      intensity={glow * 1.5}
      distance={3.2}
      decay={2}
    />
  </group>
);

const CircuitsContent: React.FC<{
  playing: boolean;
  mode: 'series' | 'parallel';
  voltage: number;
  r1: number;
  r2: number;
  resetSignal: number;
}> = ({ playing, mode, voltage, r1, r2, resetSignal }) => {
  const outerBeadRefs = useRef<Array<THREE.Mesh | null>>([]);
  const branchBeadRefs = useRef<Array<THREE.Mesh | null>>([]);
  const pinAnchorRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const progressOuterRef = useRef(0);
  const progressBranchRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const req = mode === 'series' ? r1 + r2 : (r1 * r2) / (r1 + r2);
  const iTotal = voltage / req;
  const i1 = mode === 'series' ? iTotal : voltage / r1;
  const i2 = mode === 'series' ? iTotal : voltage / r2;
  const p1 = i1 * i1 * r1;
  const p2 = i2 * i2 * r2;

  const loopPts = useMemo<[number, number, number][]>(
    () => [
      [-2.6, 0.25, -1.4],
      [2.6, 0.25, -1.4],
      [2.6, 0.25, 1.4],
      [-2.6, 0.25, 1.4],
      [-2.6, 0.25, -1.4],
    ],
    []
  );

  const parallelRung = useMemo<[number, number, number][]>(
    () => [
      [0.2, 0.25, -1.4],
      [0.2, 0.25, 1.4],
    ],
    []
  );

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      progressOuterRef.current = 0;
      progressBranchRef.current = 0;
    }
    const dt = Math.min(delta, 0.05);
    if (playing) {
      const mainCurrent = mode === 'series' ? iTotal : i2;
      progressOuterRef.current = (progressOuterRef.current + dt * (0.14 + mainCurrent * 0.065)) % 1;
      progressBranchRef.current = (progressBranchRef.current + dt * (0.18 + i1 * 0.08)) % 1;
    }

    for (let i = 0; i < OUTER_BEADS; i++) {
      const m = outerBeadRefs.current[i];
      if (!m) continue;
      const [bx, bz] = sampleOuterLoop(progressOuterRef.current + i / OUTER_BEADS);
      m.position.set(bx, 0.25, bz);
    }

    if (pinAnchorRef.current) {
      const [px, pz] = sampleOuterLoop(progressOuterRef.current);
      pinAnchorRef.current.position.set(px, 0.25, pz);
    }

    if (mode === 'parallel') {
      for (let i = 0; i < BRANCH_BEADS; i++) {
        const m = branchBeadRefs.current[i];
        if (!m) continue;
        const u = (progressBranchRef.current + i / BRANCH_BEADS) % 1;
        m.position.set(0.2, 0.25, THREE.MathUtils.lerp(-1.4, 1.4, u));
      }
    }

    if (pinRef.current) {
      pinRef.current.textContent = `R_eq=${req.toFixed(2)} Ω  I_tot=${iTotal.toFixed(
        2
      )} A\nP₁=${p1.toFixed(1)} W  P₂=${p2.toFixed(1)} W`;
    }
  });

  const glow1 = Math.min(2.2, p1 / 12);
  const glow2 = Math.min(2.2, p2 / 12);

  return (
    <>
      {/* PCB Board Base + Brass Corner Standoffs */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[6.4, 0.16, 3.8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.55} metalness={0.2} />
      </mesh>
      {[
        [-2.95, 0.17, -1.65],
        [2.95, 0.17, -1.65],
        [-2.95, 0.17, 1.65],
        [2.95, 0.17, 1.65],
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.09, 0.09, 0.05, 14]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.22} />
        </mesh>
      ))}

      {/* Copper Wire Traces */}
      <Line points={loopPts} color="#f59e0b" lineWidth={4.5} />
      {mode === 'parallel' && <Line points={parallelRung} color="#f59e0b" lineWidth={4.5} />}

      {/* Composite DC Battery Pack on Left */}
      <group position={[-2.6, 0.54, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.72, 0.68, 1.24]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.35} metalness={0.25} />
        </mesh>
        {/* Copper top cap & polarity terminals */}
        <mesh position={[0, 0.28, -0.34]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.24, 16]} />
          <meshStandardMaterial color="#ef4444" roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.28, 0.34]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.24, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.42, -0.34]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 12]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>

      {/* Bulb 1 & Bulb 2 Assemblies */}
      <BulbAssembly
        position={mode === 'series' ? [-0.3, 0.38, -1.4] : [0.2, 0.38, 0]}
        glow={glow1}
        bandColor="#2563eb"
      />
      <BulbAssembly
        position={mode === 'series' ? [1.6, 0.38, -1.4] : [2.6, 0.38, 0]}
        glow={glow2}
        bandColor="#f59e0b"
      />

      {/* Flowing Charge Carrier Beads */}
      {Array.from({ length: OUTER_BEADS }).map((_, idx) => (
        <mesh
          key={`outer-${idx}`}
          ref={(el) => {
            outerBeadRefs.current[idx] = el;
          }}
        >
          <sphereGeometry args={[0.11, 14, 14]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.75} />
        </mesh>
      ))}
      {mode === 'parallel' &&
        Array.from({ length: BRANCH_BEADS }).map((_, idx) => (
          <mesh
            key={`branch-${idx}`}
            ref={(el) => {
              branchBeadRefs.current[idx] = el;
            }}
          >
            <sphereGeometry args={[0.1, 14, 14]} />
            <meshStandardMaterial color="#34d399" emissive="#059669" emissiveIntensity={0.75} />
          </mesh>
        ))}

      {/* Live Ohm's Law Pin */}
      <group ref={pinAnchorRef} position={[-2.6, 0.25, -1.4]}>
        <PhysicsPin
          position={[0, 0.98, 0]}
          title="$I = V / R_{\text{eq}}$"
          textRef={pinRef}
          valueText={`I=${iTotal.toFixed(2)} A`}
          accentClass="border-amber-400"
        />
      </group>
    </>
  );
};

export const CircuitsScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [mode, setMode] = useState<'series' | 'parallel'>('series');
  const [voltage, setVoltage] = useState(12);
  const [r1, setR1] = useState(6);
  const [r2, setR2] = useState(12);

  const req = mode === 'series' ? r1 + r2 : (r1 * r2) / (r1 + r2);
  const iTotal = voltage / req;
  const totalPower = voltage * iTotal;

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0, 5.0, 6.2]}
      cameraTarget={[0, 0.4, 0]}
      controls={
        <>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200 mr-2">
              Circuit Wiring:
            </span>
            {(['series', 'parallel'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold border capitalize cursor-pointer ${
                  mode === m
                    ? 'bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-600'
                    : 'bg-[#FAF9F6] dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 border-stone-200 dark:border-neutral-700'
                }`}
              >
                {m} Circuit
              </button>
            ))}
          </div>
          <SliderControl
            label="Battery Voltage ($V$)"
            value={voltage}
            min={3}
            max={24}
            step={1}
            unit="V"
            onChange={setVoltage}
          />
          <SliderControl
            label="Resistor 1 ($R_1$)"
            value={r1}
            min={2}
            max={24}
            step={1}
            unit="Ω"
            onChange={setR1}
          />
          <SliderControl
            label="Resistor 2 ($R_2$)"
            value={r2}
            min={2}
            max={24}
            step={1}
            unit="Ω"
            onChange={setR2}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Equivalent (<MathInline text="$R_{\text{eq}}$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {req.toFixed(2)} Ω
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Total Current (<MathInline text="$I$" />)
            </p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-400">
              {iTotal.toFixed(2)} A
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Total Power (<MathInline text="$P = VI$" />)
            </p>
            <p className="text-base font-bold text-amber-600 dark:text-amber-400">
              {totalPower.toFixed(1)} W
            </p>
          </div>
        </div>
      }
    >
      <CircuitsContent
        playing={playing}
        mode={mode}
        voltage={voltage}
        r1={r1}
        r2={r2}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default CircuitsScene;
