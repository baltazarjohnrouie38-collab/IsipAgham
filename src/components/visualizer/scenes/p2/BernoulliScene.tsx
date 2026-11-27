import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const PARTICLE_COUNT = 10;

const BernoulliContent: React.FC<{
  playing: boolean;
  v1: number;
  r1: number;
  r2: number;
  density: number;
  resetSignal: number;
}> = ({ playing, v1, r1, r2, density, resetSignal }) => {
  const particleRefs = useRef<Array<THREE.Mesh | null>>([]);
  const tracerPinGroupRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const offsetsRef = useRef<number[]>(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => -4.2 + (i / PARTICLE_COUNT) * 8.4)
  );
  const lastResetRef = useRef(resetSignal);

  const areaRatio = (r1 * r1) / Math.max(1e-6, r2 * r2);
  const v2 = v1 * areaRatio;
  const p1Kpa = 120; // reference inlet pressure 120 kPa
  const deltaP = 0.5 * density * (v2 * v2 - v1 * v1);
  const p2Kpa = Math.max(5, p1Kpa - deltaP / 1000);

  const visualR1 = 0.92;
  const visualR2 = THREE.MathUtils.clamp(visualR1 * (r2 / Math.max(0.005, r1)), 0.26, 0.86);
  const col1H = Math.max(0.4, Math.min(2.4, (p1Kpa / 140) * 1.9));
  const col2H = Math.max(0.25, Math.min(2.4, (p2Kpa / 140) * 1.9));
  const speedScale = v2 > 10 ? (10 / v2) * 0.45 : 0.45;

  const initialOffsets = useMemo(
    () => Array.from({ length: PARTICLE_COUNT }, (_, i) => -4.2 + (i / PARTICLE_COUNT) * 8.4),
    []
  );

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      offsetsRef.current = [...initialOffsets];
    }

    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let x = offsetsRef.current[i];
      const inThroat = Math.abs(x) < 1.35;
      const localV = inThroat ? v2 : v1;
      if (playing) {
        x += Math.max(0.4, localV * speedScale) * dt;
        if (x > 4.2) x = -4.2;
        offsetsRef.current[i] = x;
      }

      const mesh = particleRefs.current[i];
      if (mesh) {
        const yJitter = ((i % 3) - 1) * (inThroat ? visualR2 * 0.35 : visualR1 * 0.35);
        mesh.position.set(x, 1.1 + yJitter, 0);
      }

      if (i === 0 && tracerPinGroupRef.current) {
        tracerPinGroupRef.current.position.set(x, 1.1, 0);
        setPinDisplay(
          pinRef.current,
          inThroat
            ? `Throat: v_2=${v2.toFixed(2)} m/s\nP_2=${p2Kpa.toFixed(1)} kPa (faster = lower P)`
            : `Wide: v_1=${v1.toFixed(2)} m/s\nP_1=${p1Kpa.toFixed(1)} kPa`
        );
      }
    }
  });

  return (
    <>
      {/* Left wide pipe */}
      <mesh position={[-2.7, 1.1, 0]} rotation={[0, 0, Math.PI / 2]} renderOrder={2}>
        <cylinderGeometry args={[visualR1, visualR1, 3.0, 24]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.26} depthWrite={false} />
      </mesh>

      {/* Center narrow Venturi throat */}
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, Math.PI / 2]} renderOrder={2}>
        <cylinderGeometry args={[visualR2, visualR2, 2.5, 24]} />
        <meshStandardMaterial color="#0284c7" transparent opacity={0.34} depthWrite={false} />
      </mesh>

      {/* Right wide pipe */}
      <mesh position={[2.7, 1.1, 0]} rotation={[0, 0, Math.PI / 2]} renderOrder={2}>
        <cylinderGeometry args={[visualR1, visualR1, 3.0, 24]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.26} depthWrite={false} />
      </mesh>

      {/* Manometer pressure columns above wide & narrow sections */}
      <mesh position={[-2.6, 1.1 + visualR1 + col1H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, col1H, 16]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.1 + visualR2 + col2H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, col2H, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} />
      </mesh>

      {/* Moving tracer spheres */}
      {initialOffsets.map((x, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            particleRefs.current[idx] = el;
          }}
          position={[x, 1.1, 0]}
        >
          <sphereGeometry args={[0.11, 14, 14]} />
          <meshStandardMaterial
            color={idx === 0 ? '#f59e0b' : '#ffffff'}
            emissive={idx === 0 ? '#d97706' : '#0284c7'}
            emissiveIntensity={idx === 0 ? 0.45 : 0.15}
          />
        </mesh>
      ))}

      {/* Pinned equation following particle 0 */}
      <group ref={tracerPinGroupRef} position={[initialOffsets[0], 1.1, 0]}>
        <PhysicsPin
          position={[0, 1.05, 0]}
          title="$A_1 v_1 = A_2 v_2$"
          textRef={pinRef}
          valueText={`v_1=${v1.toFixed(2)} → v_2=${v2.toFixed(2)} m/s`}
          accentClass="border-amber-400"
        />
      </group>
    </>
  );
};

export const BernoulliScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [v1, setV1] = useState(2.0);
  const [r1, setR1] = useState(0.5);
  const [r2, setR2] = useState(0.28);
  const [density, setDensity] = useState(1000);

  const effectiveR2 = Math.max(0.002, Math.min(r2, r1 * 0.92));
  const v2 = v1 * ((r1 * r1) / (effectiveR2 * effectiveR2));
  const p1Kpa = 120;
  const p2Kpa = Math.max(5, p1Kpa - (0.5 * density * (v2 * v2 - v1 * v1)) / 1000);

  const paramValues = useMemo(
    () => ({ v1, r1, r2: effectiveR2, density }),
    [v1, r1, effectiveR2, density]
  );

  const handleApplyParams = useCallback((next: Record<string, number | string>) => {
    if (typeof next.v1 === 'number' && Number.isFinite(next.v1)) setV1(next.v1);
    if (typeof next.r1 === 'number' && Number.isFinite(next.r1)) setR1(Math.max(0.01, next.r1));
    if (typeof next.r2 === 'number' && Number.isFinite(next.r2)) setR2(Math.max(0.002, next.r2));
    if (typeof next.density === 'number' && Number.isFinite(next.density)) setDensity(next.density);
    setResetSignal((n) => n + 1);
  }, []);

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0, 3.0, 8.6]}
      cameraTarget={[0, 1.6, 0]}
      sceneId="p2-bernoulli"
      paramValues={paramValues}
      onApplyParams={handleApplyParams}
      controls={
        <>
          <SliderControl
            label="Inlet Speed ($v_1$)"
            value={v1}
            min={0.5}
            max={4.0}
            customMin={0.1}
            customMax={30}
            step={0.1}
            unit="m/s"
            onChange={setV1}
          />
          <SliderControl
            label="Wide Radius ($r_1$)"
            value={r1}
            min={0.35}
            max={0.7}
            customMin={0.01}
            customMax={3.0}
            step={0.01}
            unit="m"
            onChange={setR1}
          />
          <SliderControl
            label="Throat Radius ($r_2$)"
            value={effectiveR2}
            min={0.15}
            max={0.45}
            customMin={0.005}
            customMax={2.5}
            step={0.01}
            unit="m"
            onChange={setR2}
          />
          <SliderControl
            label="Fluid Density ($\\rho$)"
            value={density}
            min={700}
            max={1300}
            customMin={1}
            customMax={13600}
            step={25}
            unit="kg/m³"
            onChange={setDensity}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Throat Speed (<MathInline text="$v_2$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {v2.toFixed(2)} m/s
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Throat Pressure (<MathInline text="$P_2$" />)
            </p>
            <p className="text-base font-bold text-red-600 dark:text-red-400">
              {p2Kpa.toFixed(1)} kPa
            </p>
          </div>
        </div>
      }
    >
      <BernoulliContent
        playing={playing}
        v1={v1}
        r1={r1}
        r2={effectiveR2}
        density={density}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default BernoulliScene;
