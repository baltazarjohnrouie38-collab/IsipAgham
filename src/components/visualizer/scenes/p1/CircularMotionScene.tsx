import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const CircularContent: React.FC<{
  playing: boolean;
  radius: number;
  speed: number;
  mass: number;
  resetSignal: number;
}> = ({ playing, radius, speed, mass, resetSignal }) => {
  const rotorRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const omega = speed / radius;
  const ac = (speed * speed) / radius;
  const fc = mass * ac;
  const visualR = radius <= 4 ? Math.max(0.75, radius) : Math.min(4.8, 4 + Math.log10(radius / 4) * 0.6);
  const visualOmega = Math.min(6, Math.max(0.35, omega));

  const circlePts = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push([Math.cos(a) * visualR, 0.4, Math.sin(a) * visualR]);
    }
    return pts;
  }, [visualR]);

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      angleRef.current = 0;
    }
    if (playing) {
      angleRef.current += visualOmega * Math.min(delta, 0.05) * 0.65;
    }
    if (rotorRef.current) {
      rotorRef.current.rotation.y = angleRef.current;
    }
    setPinDisplay(
      pinRef.current,
      `a_c=${ac.toFixed(2)} m/s^2\nF_c=${fc.toFixed(1)} N  ω=${omega.toFixed(2)} rad/s`
    );
  });

  return (
    <>
      {/* Center pivot post */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 0.9, 20]} />
        <meshStandardMaterial color="#334155" metalness={0.55} roughness={0.35} />
      </mesh>

      <Line points={circlePts} color="#2563eb" lineWidth={1.8} dashed dashSize={0.2} gapSize={0.12} />

      <group ref={rotorRef}>
        {/* Tether rod */}
        <mesh position={[visualR / 2, 0.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, visualR, 10]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.25} />
        </mesh>

        {/* Orbiting mass */}
        <group position={[visualR, 0.4, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.26, 28, 28]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.22} metalness={0.55} />
          </mesh>

          {/* Inward centripetal force/acceleration vector (-X) */}
          <Arrow3D
            origin={[-0.25, 0, 0]}
            direction={[-1, 0, 0]}
            length={Math.min(1.8, 0.4 + ac * 0.04)}
            color="#ef4444"
          />

          {/* Tangential velocity vector (-Z in right-handed Y rotation) */}
          <Arrow3D
            origin={[0, 0, -0.25]}
            direction={[0, 0, -1]}
            length={Math.min(2.0, 0.4 + speed * 0.16)}
            color="#10b981"
          />

          <PhysicsPin
            position={[0, 0.75, 0]}
            title="$F_c = \\frac{mv^2}{r}$"
            textRef={pinRef}
            valueText={`a_c=${ac.toFixed(2)} m/s^2`}
            accentClass="border-red-400"
          />
        </group>
      </group>
    </>
  );
};

export const CircularMotionScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [radius, setRadius] = useState(2.5);
  const [speed, setSpeed] = useState(5);
  const [mass, setMass] = useState(2);

  const ac = (speed * speed) / radius;
  const fc = mass * ac;
  const period = (2 * Math.PI * radius) / speed;

  const paramValues = useMemo(
    () => ({ radius, speed, mass }),
    [radius, speed, mass]
  );

  const handleApplyParams = useCallback((next: Record<string, number | string>) => {
    if (typeof next.radius === 'number' && Number.isFinite(next.radius)) setRadius(next.radius);
    if (typeof next.speed === 'number' && Number.isFinite(next.speed)) setSpeed(next.speed);
    if (typeof next.mass === 'number' && Number.isFinite(next.mass)) setMass(next.mass);
  }, []);

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0, 5.2, 7.2]}
      cameraTarget={[0, 0.4, 0]}
      sceneId="p1-circular"
      paramValues={paramValues}
      onApplyParams={handleApplyParams}
      controls={
        <>
          <SliderControl
            label="Orbit Radius ($r$)"
            value={radius}
            min={1}
            max={4}
            customMin={0.2}
            customMax={200}
            step={0.25}
            unit="m"
            onChange={setRadius}
          />
          <SliderControl
            label="Tangential Speed ($v$)"
            value={speed}
            min={1}
            max={10}
            customMin={0.2}
            customMax={100}
            step={0.5}
            unit="m/s"
            onChange={setSpeed}
          />
          <SliderControl
            label="Object Mass ($m$)"
            value={mass}
            min={0.5}
            max={6}
            customMin={0.05}
            customMax={5000}
            step={0.5}
            unit="kg"
            onChange={setMass}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Centripetal Accel (<MathInline text="$a_c$" />)
            </p>
            <p className="text-base font-bold text-red-600 dark:text-red-400">
              {ac.toFixed(2)} m/s²
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Centripetal Force (<MathInline text="$F_c$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {fc.toFixed(1)} N
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Revolution Period (<MathInline text="$T = 2\\pi r / v$" />)
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {period.toFixed(2)} s
            </p>
          </div>
        </div>
      }
    >
      <CircularContent
        playing={playing}
        radius={radius}
        speed={speed}
        mass={mass}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default CircularMotionScene;
