import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const InductionContent: React.FC<{
  playing: boolean;
  speed: number;
  turns: number;
  fieldB: number;
  resetSignal: number;
}> = ({ playing, speed, turns, fieldB, resetSignal }) => {
  const magnetGroupRef = useRef<THREE.Group>(null);
  const needleRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const area = 0.04; // 0.04 m² coil loop area

  const coilPts = useMemo(() => {
    const pts: [number, number, number][] = [];
    const loops = Math.min(14, Math.max(5, Math.round(turns / 4)));
    const steps = loops * 18;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const x = -0.75 + u * 1.5;
      const theta = u * loops * Math.PI * 2;
      pts.push([x, 1.5 + Math.cos(theta) * 0.9, Math.sin(theta) * 0.9]);
    }
    return pts;
  }, [turns]);

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      phaseRef.current = 0;
    }
    const visualSpeed = Math.min(3.0, Math.max(0.1, speed));
    if (playing) {
      phaseRef.current += Math.min(delta, 0.05) * visualSpeed * 1.3;
    }

    // Magnet oscillates along X into and out of coil centered at x = 0
    const amp = 2.6;
    const xMagnet = -Math.cos(phaseRef.current) * amp;
    const vMagnet = Math.sin(phaseRef.current) * amp * speed * 1.3;

    // Flux bell curve centered on coil x = 0
    const flux = fieldB * area * Math.exp(-(xMagnet * xMagnet) / 1.4);
    const dFluxDx = flux * ((-2 * xMagnet) / 1.4);
    const dFluxDt = dFluxDx * vMagnet;
    const emf = -turns * dFluxDt;

    if (magnetGroupRef.current) {
      magnetGroupRef.current.position.set(xMagnet, 1.5, 0);
    }
    if (needleRef.current) {
      needleRef.current.rotation.z = THREE.MathUtils.clamp(-emf * 0.05, -1.1, 1.1);
    }
    const lenzDir =
      emf > 0.05
        ? 'Induced N opposes entry'
        : emf < -0.05
        ? 'Induced S pulls back'
        : 'Stationary (ε ≈ 0)';
    setPinDisplay(
      pinRef.current,
      `Φ_B=${(flux * 1000).toFixed(1)} mWb\nε = ${emf.toFixed(2)} V | ${lenzDir}`
    );
  });

  return (
    <>
      {/* Copper coil */}
      <Line points={coilPts} color="#d97706" lineWidth={4} />

      {/* Galvanometer gauge above coil */}
      <group position={[0, 3.05, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.14, 24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <group ref={needleRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.1]}>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.04, 0.42, 0.04]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        </group>
      </group>

      {/* Moving bar magnet (North facing coil on +X) */}
      <group ref={magnetGroupRef} position={[-2.6, 1.5, 0]}>
        <mesh position={[-0.45, 0, 0]} castShadow>
          <boxGeometry args={[0.9, 0.52, 0.52]} />
          <meshStandardMaterial color="#0284c7" roughness={0.35} metalness={0.35} />
        </mesh>
        <mesh position={[0.45, 0, 0]} castShadow>
          <boxGeometry args={[0.9, 0.52, 0.52]} />
          <meshStandardMaterial color="#ef4444" roughness={0.35} metalness={0.35} />
        </mesh>
        <Arrow3D origin={[0.95, 0, 0]} direction={[1, 0, 0]} length={0.75} color="#ef4444" />
        <PhysicsPin
          position={[0, -0.82, 0]}
          title="$\\varepsilon = -N\\frac{\\Delta\\Phi_B}{\\Delta t}$"
          textRef={pinRef}
          valueText="Moving magnet..."
          accentClass="border-red-400"
        />
      </group>
    </>
  );
};

export const InductionScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [speed, setSpeed] = useState(1.2);
  const [turns, setTurns] = useState(30);
  const [fieldB, setFieldB] = useState(0.8);

  const maxFluxMwb = fieldB * 0.04 * 1000;
  const peakEmfApprox = turns * fieldB * 0.04 * speed * 2.2;

  const paramValues = useMemo(
    () => ({ speed, turns, fieldB }),
    [speed, turns, fieldB]
  );

  const handleApplyParams = useCallback((next: Record<string, number | string>) => {
    if (typeof next.speed === 'number' && Number.isFinite(next.speed)) setSpeed(next.speed);
    if (typeof next.turns === 'number' && Number.isFinite(next.turns)) setTurns(next.turns);
    if (typeof next.fieldB === 'number' && Number.isFinite(next.fieldB)) setFieldB(next.fieldB);
    setResetSignal((n) => n + 1);
  }, []);

  return (
    <SceneStage
      sceneId="p3-induction"
      paramValues={paramValues}
      onApplyParams={handleApplyParams}
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0, 2.8, 7.6]}
      cameraTarget={[0, 1.7, 0]}
      controls={
        <>
          <SliderControl
            label="Magnet Speed"
            value={speed}
            min={0.4}
            max={2.5}
            customMin={0.1}
            customMax={10}
            step={0.1}
            unit="×"
            onChange={setSpeed}
          />
          <SliderControl
            label="Coil Turns ($N$)"
            value={turns}
            min={10}
            max={60}
            customMin={1}
            customMax={1000}
            step={5}
            unit="turns"
            onChange={setTurns}
          />
          <SliderControl
            label="Magnetic Field ($B$)"
            value={fieldB}
            min={0.2}
            max={1.5}
            customMin={0.05}
            customMax={15}
            step={0.05}
            unit="T"
            onChange={setFieldB}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Peak Flux (<MathInline text="$\\Phi_{B,\\max}$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {maxFluxMwb.toFixed(1)} mWb
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Peak Induced EMF (<MathInline text="$|\\varepsilon|$" />)
            </p>
            <p className="text-base font-bold text-amber-600 dark:text-amber-400">
              ~{peakEmfApprox.toFixed(2)} V
            </p>
          </div>
        </div>
      }
    >
      <InductionContent
        playing={playing}
        speed={speed}
        turns={turns}
        fieldB={fieldB}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default InductionScene;
