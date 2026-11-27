import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const LOOP_AREA = 0.05; // 0.05 m² armature area

const MotorGenContent: React.FC<{
  playing: boolean;
  mode: 'motor' | 'generator';
  fieldB: number;
  currentOrSpeed: number;
  turns: number;
  resetSignal: number;
}> = ({ playing, mode, fieldB, currentOrSpeed, turns, resetSignal }) => {
  const rotorRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const thetaRef = useRef(0.4);
  const lastResetRef = useRef(resetSignal);

  const omega = mode === 'motor' ? 1.2 + currentOrSpeed * 0.25 : currentOrSpeed;
  const visualOmega = Math.min(6.5, Math.max(0.2, omega));

  const coilLoop = useMemo<[number, number, number][]>(
    () => [
      [-0.95, 0, -0.75],
      [0.95, 0, -0.75],
      [0.95, 0, 0.75],
      [-0.95, 0, 0.75],
      [-0.95, 0, -0.75],
    ],
    []
  );

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      thetaRef.current = 0.4;
    }
    if (playing) {
      thetaRef.current += visualOmega * Math.min(delta, 0.05);
    }

    if (rotorRef.current) {
      rotorRef.current.rotation.z = thetaRef.current;
    }

    const sinT = Math.sin(thetaRef.current);
    const deg = (((thetaRef.current * 180) / Math.PI) % 360).toFixed(0);
    if (mode === 'motor') {
      const torque = turns * currentOrSpeed * LOOP_AREA * fieldB * Math.abs(sinT);
      setPinDisplay(pinRef.current, `θ=${deg}°\nτ = N I A B |sin θ| = ${torque.toFixed(2)} N·m`);
    } else {
      const emf = turns * fieldB * LOOP_AREA * omega * sinT;
      setPinDisplay(pinRef.current, `θ=${deg}°\nε(t) = N B A ω sin θ = ${emf.toFixed(2)} V`);
    }
  });

  return (
    <>
      {/* Left North magnetic pole */}
      <mesh position={[-2.35, 1.6, 0]} castShadow>
        <boxGeometry args={[0.9, 1.6, 2.2]} />
        <meshStandardMaterial color="#ef4444" roughness={0.38} metalness={0.25} />
      </mesh>
      {/* Right South magnetic pole */}
      <mesh position={[2.35, 1.6, 0]} castShadow>
        <boxGeometry args={[0.9, 1.6, 2.2]} />
        <meshStandardMaterial color="#0284c7" roughness={0.38} metalness={0.25} />
      </mesh>

      {/* Uniform B-field arrows N -> S */}
      <Arrow3D origin={[-1.4, 2.5, 0]} direction={[1, 0, 0]} length={2.8} color="#38bdf8" />

      {/* Rotating armature coil */}
      <group ref={rotorRef} position={[0, 1.6, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 2.4, 14]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.25} />
        </mesh>
        <Line points={coilLoop} color="#f59e0b" lineWidth={5} />

        {/* Force couple arrows on left/right arms of the armature */}
        <Arrow3D origin={[-0.95, 0, 0]} direction={[0, 1, 0]} length={0.75} color="#10b981" />
        <Arrow3D origin={[0.95, 0, 0]} direction={[0, -1, 0]} length={0.75} color="#10b981" />

        <PhysicsPin
          position={[0, 1.0, 0]}
          title={
            mode === 'motor'
              ? '$\\tau = NIAB\\sin\\theta$'
              : '$\\varepsilon = NBA\\omega\\sin(\\omega t)$'
          }
          textRef={pinRef}
          valueText="Rotating armature"
          accentClass="border-amber-400"
        />
      </group>
    </>
  );
};

export const MotorGeneratorScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [mode, setMode] = useState<'motor' | 'generator'>('motor');
  const [fieldB, setFieldB] = useState(0.8);
  const [param, setParam] = useState(4);
  const [turns, setTurns] = useState(20);

  const peakVal =
    mode === 'motor'
      ? turns * param * LOOP_AREA * fieldB
      : turns * fieldB * LOOP_AREA * param;

  const paramValues = useMemo(
    () => ({ mode, fieldB, param, turns }),
    [mode, fieldB, param, turns]
  );

  const handleApplyParams = useCallback((next: Record<string, number | string>) => {
    if (next.mode === 'motor' || next.mode === 'generator') setMode(next.mode);
    if (typeof next.fieldB === 'number' && Number.isFinite(next.fieldB)) setFieldB(next.fieldB);
    if (typeof next.param === 'number' && Number.isFinite(next.param)) setParam(next.param);
    if (typeof next.turns === 'number' && Number.isFinite(next.turns)) setTurns(next.turns);
    setResetSignal((n) => n + 1);
  }, []);

  return (
    <SceneStage
      sceneId="p3-motorgen"
      paramValues={paramValues}
      onApplyParams={handleApplyParams}
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0, 3.0, 7.2]}
      cameraTarget={[0, 1.6, 0]}
      controls={
        <>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200 mr-2">
              Device Mode:
            </span>
            {(
              [
                { key: 'motor', label: 'DC Motor (Electrical → Rotation)' },
                { key: 'generator', label: 'AC Generator (Rotation → EMF)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMode(opt.key)}
                className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  mode === opt.key
                    ? 'bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-600'
                    : 'bg-[#FAF9F6] dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 border-stone-200 dark:border-neutral-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <SliderControl
            label="Magnetic Field ($B$)"
            value={fieldB}
            min={0.2}
            max={1.5}
            customMin={0.05}
            customMax={10}
            step={0.05}
            unit="T"
            onChange={setFieldB}
          />
          <SliderControl
            label={mode === 'motor' ? 'Coil Current ($I$)' : 'Angular Speed ($\\omega$)'}
            value={param}
            min={1}
            max={10}
            customMin={0.2}
            customMax={120}
            step={0.5}
            unit={mode === 'motor' ? 'A' : 'rad/s'}
            onChange={setParam}
          />
          <SliderControl
            label="Armature Turns ($N$)"
            value={turns}
            min={5}
            max={40}
            customMin={1}
            customMax={500}
            step={5}
            unit="turns"
            onChange={setTurns}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-1 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              {mode === 'motor' ? (
                <>Peak Torque (<MathInline text="$\tau_{\max} = NIAB$" />)</>
              ) : (
                <>Peak AC EMF (<MathInline text="$\varepsilon_{\max} = NBA\omega$" />)</>
              )}
            </p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-400">
              {peakVal.toFixed(2)} {mode === 'motor' ? 'N·m' : 'V'}
            </p>
          </div>
        </div>
      }
    >
      <MotorGenContent
        playing={playing}
        mode={mode}
        fieldB={fieldB}
        currentOrSpeed={param}
        turns={turns}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default MotorGeneratorScene;
