import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const MU0 = 4 * Math.PI * 1e-7;

const MagFieldContent: React.FC<{
  playing: boolean;
  mode: 'wire' | 'solenoid';
  current: number;
  turns: number;
  probeR: number;
  resetSignal: number;
}> = ({ playing, mode, current, turns, probeR, resetSignal }) => {
  const probeRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const safeProbeR = Math.max(0.1, probeR);
  const solenoidLen = 0.3; // 30 cm physical length
  const bWireMicroT = ((MU0 * Math.abs(current)) / (2 * Math.PI * (safeProbeR * 0.05))) * 1e6;
  const bSolenoidMilliT = ((MU0 * turns * Math.abs(current)) / solenoidLen) * 1e3;

  const wireRings = useMemo(() => {
    return [0.9, 1.5, 2.2].map((r) => {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        pts.push([Math.cos(a) * r, 1.6, Math.sin(a) * r]);
      }
      return pts;
    });
  }, []);

  const helixPts = useMemo(() => {
    const pts: [number, number, number][] = [];
    const coils = Math.min(18, Math.max(6, Math.round(turns / 4)));
    const totalSteps = coils * 16;
    for (let i = 0; i <= totalSteps; i++) {
      const u = i / totalSteps;
      const x = -2.4 + u * 4.8;
      const theta = u * coils * Math.PI * 2;
      pts.push([x, 1.6 + Math.cos(theta) * 0.85, Math.sin(theta) * 0.85]);
    }
    return pts;
  }, [turns]);

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      angleRef.current = 0;
    }
    const dir = current >= 0 ? 1 : -1;
    if (playing) {
      const visualRate = Math.min(3.5, 0.8 + Math.abs(current) * 0.05);
      angleRef.current += dir * Math.min(delta, 0.05) * visualRate;
    }

    if (probeRef.current) {
      if (mode === 'wire') {
        const r = Math.min(2.6, 0.7 + safeProbeR * 0.65);
        probeRef.current.position.set(
          Math.cos(angleRef.current) * r,
          1.6,
          Math.sin(angleRef.current) * r
        );
      } else {
        const xSlide = ((Math.abs(angleRef.current) * 0.9) % 4.4) - 2.2;
        probeRef.current.position.set(dir >= 0 ? xSlide : -xSlide, 1.6, 0);
      }
    }

    setPinDisplay(
      pinRef.current,
      mode === 'wire'
        ? `B = μ_0 I / (2πr)\nB = ${bWireMicroT.toFixed(1)} μT`
        : `B = μ_0(N/L)I\nB = ${bSolenoidMilliT.toFixed(2)} mT`
    );
  });

  const dirSign = current >= 0 ? 1 : -1;

  return (
    <>
      {mode === 'wire' ? (
        <>
          {/* Vertical copper conductor */}
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 3.6, 20]} />
            <meshStandardMaterial color="#d97706" metalness={0.78} roughness={0.22} />
          </mesh>
          <Arrow3D origin={[0, 2.2, 0.3]} direction={[0, dirSign, 0]} length={1.0} color="#ef4444" />

          {wireRings.map((pts, i) => (
            <Line key={i} points={pts} color="#38bdf8" lineWidth={2} />
          ))}
        </>
      ) : (
        <>
          <Line points={helixPts} color="#d97706" lineWidth={4} />
          {[-0.35, 0, 0.35].map((yOff, idx) => (
            <React.Fragment key={idx}>
              <Line
                points={[
                  [-3.0, 1.6 + yOff, 0],
                  [3.0, 1.6 + yOff, 0],
                ]}
                color="#38bdf8"
                lineWidth={2}
              />
              <Arrow3D
                origin={[0, 1.6 + yOff, 0]}
                direction={[dirSign, 0, 0]}
                length={1.2}
                color="#38bdf8"
              />
            </React.Fragment>
          ))}
        </>
      )}

      {/* Moving magnetic probe */}
      <group ref={probeRef} position={[1.4, 1.6, 0]}>
        <mesh>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.45} />
        </mesh>
        <PhysicsPin
          position={[0, 0.72, 0]}
          title={
            mode === 'wire'
              ? '$B = \\frac{\\mu_0 I}{2\\pi r}$'
              : '$B = \\mu_0\\left(\\frac{N}{L}\\right)I$'
          }
          textRef={pinRef}
          valueText={mode === 'wire' ? `${bWireMicroT.toFixed(1)} μT` : `${bSolenoidMilliT.toFixed(2)} mT`}
          accentClass="border-cyan-400"
        />
      </group>
    </>
  );
};

export const MagneticFieldScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [mode, setMode] = useState<'wire' | 'solenoid'>('wire');
  const [current, setCurrent] = useState(8);
  const [turns, setTurns] = useState(40);
  const [probeR, setProbeR] = useState(1.5);

  const safeProbeR = Math.max(0.1, probeR);
  const bWireMicroT = ((MU0 * Math.abs(current)) / (2 * Math.PI * (safeProbeR * 0.05))) * 1e6;
  const bSolenoidMilliT = ((MU0 * turns * Math.abs(current)) / 0.3) * 1e3;

  const paramValues = useMemo(
    () => ({ mode, current, probeR, turns }),
    [mode, current, probeR, turns]
  );

  const handleApplyParams = useCallback((next: Record<string, number | string>) => {
    if (next.mode === 'wire' || next.mode === 'solenoid') setMode(next.mode);
    if (typeof next.current === 'number' && Number.isFinite(next.current)) setCurrent(next.current);
    if (typeof next.probeR === 'number' && Number.isFinite(next.probeR)) setProbeR(Math.max(0.1, next.probeR));
    if (typeof next.turns === 'number' && Number.isFinite(next.turns)) setTurns(next.turns);
    setResetSignal((n) => n + 1);
  }, []);

  return (
    <SceneStage
      sceneId="p3-magfield"
      paramValues={paramValues}
      onApplyParams={handleApplyParams}
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[2.5, 3.8, 6.8]}
      cameraTarget={[0, 1.6, 0]}
      controls={
        <>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200 mr-2">
              Conductor Geometry:
            </span>
            {(
              [
                { key: 'wire', label: 'Straight Wire' },
                { key: 'solenoid', label: 'Solenoid Coil' },
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
            label="Current ($I$, $\\pm$ flips dir)"
            value={current}
            min={-15}
            max={15}
            customMin={-200}
            customMax={200}
            step={1}
            unit="A"
            onChange={setCurrent}
          />
          {mode === 'wire' ? (
            <SliderControl
              label="Distance ($r$)"
              value={probeR}
              min={0.5}
              max={3.0}
              customMin={0.1}
              customMax={20}
              step={0.1}
              unit="×5 cm"
              onChange={setProbeR}
            />
          ) : (
            <SliderControl
              label="Coil Turns ($N$)"
              value={turns}
              min={15}
              max={80}
              customMin={5}
              customMax={2000}
              step={5}
              unit="turns"
              onChange={setTurns}
            />
          )}
        </>
      }
      readout={
        <div className="grid grid-cols-1 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              {mode === 'wire' ? (
                <>Magnetic Field at Probe (<MathInline text="$B$" />)</>
              ) : (
                <>Uniform Core Magnetic Field (<MathInline text="$B$" />)</>
              )}
            </p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-400">
              {mode === 'wire'
                ? `${bWireMicroT.toFixed(2)} μT`
                : `${bSolenoidMilliT.toFixed(2)} mT`}
            </p>
          </div>
        </div>
      }
    >
      <MagFieldContent
        playing={playing}
        mode={mode}
        current={current}
        turns={turns}
        probeR={probeR}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default MagneticFieldScene;
