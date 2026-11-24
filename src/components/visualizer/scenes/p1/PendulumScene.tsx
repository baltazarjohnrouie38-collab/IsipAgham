import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const PendulumContent: React.FC<{
  playing: boolean;
  length: number;
  maxAngleDeg: number;
  gravity: number;
  resetSignal: number;
}> = ({ playing, length, maxAngleDeg, gravity, resetSignal }) => {
  const pivotRef = useRef<THREE.Group>(null);
  const velArrowRef = useRef<THREE.Group>(null);
  const keBarRef = useRef<THREE.Mesh>(null);
  const peBarRef = useRef<THREE.Mesh>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const omega = Math.sqrt(gravity / length);
  const theta0 = (maxAngleDeg * Math.PI) / 180;
  const period = 2 * Math.PI * Math.sqrt(length / gravity);
  const pivotY = 4.35;

  const sweepPts = useMemo(() => {
    const pts: [number, number, number][] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const a = -theta0 + (i / steps) * (2 * theta0);
      pts.push([Math.sin(a) * length, pivotY - Math.cos(a) * length, 0]);
    }
    return pts;
  }, [theta0, length]);

  const protractorPts = useMemo(() => {
    const pts: [number, number, number][] = [];
    const r = 0.65;
    for (let i = 0; i <= 24; i++) {
      const a = -theta0 + (i / 24) * (2 * theta0);
      pts.push([Math.sin(a) * r, pivotY - Math.cos(a) * r, 0.02]);
    }
    return pts;
  }, [theta0]);

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      timeRef.current = 0;
    }
    if (playing) {
      timeRef.current += Math.min(delta, 0.05);
    }

    const theta = theta0 * Math.cos(omega * timeRef.current);
    const angularVel = -theta0 * omega * Math.sin(omega * timeRef.current);
    const vSigned = angularVel * length;
    const speed = Math.abs(vSigned);

    // Energy partition fractions in [0, 1]
    const maxV = Math.max(0.001, theta0 * omega * length);
    const keFrac = Math.min(1, (speed / maxV) ** 2);
    const peFrac = Math.max(0, 1 - keFrac);

    if (pivotRef.current) {
      pivotRef.current.rotation.z = theta;
    }

    if (velArrowRef.current) {
      // Tangential velocity points along +X or -X in the bob's local swung frame
      velArrowRef.current.visible = speed > 0.08;
      velArrowRef.current.rotation.z = vSigned >= 0 ? -Math.PI / 2 : Math.PI / 2;
      const lenScale = Math.min(1.6, Math.max(0.3, speed * 0.35));
      velArrowRef.current.scale.set(1, lenScale, 1);
    }

    if (keBarRef.current) {
      const h = Math.max(0.05, keFrac * 1.9);
      keBarRef.current.scale.y = h;
      keBarRef.current.position.y = 0.14 + h / 2;
    }
    if (peBarRef.current) {
      const h = Math.max(0.05, peFrac * 1.9);
      peBarRef.current.scale.y = h;
      peBarRef.current.position.y = 0.14 + h / 2;
    }

    if (pinRef.current) {
      const degNow = (theta * 180) / Math.PI;
      pinRef.current.textContent = `θ=${degNow.toFixed(1)}°  v=${speed.toFixed(
        2
      )} m/s\nT=${period.toFixed(2)} s  K=${(keFrac * 100).toFixed(0)}%  U=${(
        peFrac * 100
      ).toFixed(0)}%`;
    }
  });

  return (
    <>
      {/* Composite Lab Gantry Base & Frame */}
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.14, 1.3]} />
        <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.2} />
      </mesh>
      {[-2.15, 2.15].map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]}>
          {/* Foot collar */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.16, 16]} />
            <meshStandardMaterial color="#d97706" metalness={0.75} roughness={0.28} />
          </mesh>
          {/* Vertical steel upright */}
          <mesh position={[0, pivotY / 2 + 0.07, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.085, pivotY, 16]} />
            <meshStandardMaterial color="#475569" metalness={0.55} roughness={0.35} />
          </mesh>
          {/* Top corner bracket */}
          <mesh position={[0, pivotY, 0]} castShadow>
            <boxGeometry args={[0.24, 0.22, 0.24]} />
            <meshStandardMaterial color="#d97706" metalness={0.75} roughness={0.28} />
          </mesh>
        </group>
      ))}
      {/* Top crossbar */}
      <mesh position={[0, pivotY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 4.45, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Brass central pivot bearing */}
      <mesh position={[0, pivotY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.26, 20]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.22} />
      </mesh>

      {/* Protractor arc & swept trajectory arc */}
      <Line points={protractorPts} color="#f59e0b" lineWidth={2} />
      <Line points={sweepPts} color="#2563eb" lineWidth={2} dashed dashSize={0.18} gapSize={0.1} />

      {/* 3D Live Energy Swap Columns (K & U) on right side of gantry */}
      <group position={[3.05, 0, 0]}>
        <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.14, 0.65]} />
          <meshStandardMaterial color="#334155" roughness={0.55} metalness={0.25} />
        </mesh>
        {/* Kinetic Energy (K) Pillar */}
        <mesh ref={keBarRef} position={[-0.22, 0.8, 0]} castShadow>
          <boxGeometry args={[0.28, 1, 0.28]} />
          <meshStandardMaterial color="#10b981" roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Potential Energy (U) Pillar */}
        <mesh ref={peBarRef} position={[0.22, 0.8, 0]} castShadow>
          <boxGeometry args={[0.28, 1, 0.28]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.2} />
        </mesh>
      </group>

      {/* Swinging Arm & Composite Bob */}
      <group ref={pivotRef} position={[0, pivotY, 0]}>
        <mesh position={[0, -length / 2, 0]} castShadow>
          <cylinderGeometry args={[0.024, 0.024, length, 10]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.25} />
        </mesh>
        <group position={[0, -length, 0]}>
          {/* Brass suspension eyelet */}
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 0.12, 14]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.22} />
          </mesh>
          {/* Main blue metallic bob */}
          <mesh castShadow>
            <sphereGeometry args={[0.28, 28, 28]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.22} metalness={0.6} />
          </mesh>
          {/* Bottom plumb tip */}
          <mesh position={[0, -0.32, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.07, 0.14, 14]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Tangential velocity vector */}
          <group ref={velArrowRef}>
            <Arrow3D origin={[0, 0, 0]} direction={[0, 1, 0]} length={1.0} color="#10b981" />
          </group>

          <PhysicsPin
            position={[0, -0.78, 0]}
            title="$T = 2\pi\sqrt{L/g}$"
            textRef={pinRef}
            valueText={`T=${period.toFixed(2)} s`}
            accentClass="border-blue-400"
          />
        </group>
      </group>
    </>
  );
};

export const PendulumScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [length, setLength] = useState(2.2);
  const [angle, setAngle] = useState(25);
  const [gravity, setGravity] = useState(9.81);

  const period = 2 * Math.PI * Math.sqrt(length / gravity);
  const frequency = 1 / period;
  const omega = Math.sqrt(gravity / length);

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0.4, 2.5, 7.8]}
      cameraTarget={[0.4, 2.1, 0]}
      controls={
        <>
          <SliderControl
            label="String Length ($L$)"
            value={length}
            min={0.8}
            max={3.4}
            step={0.1}
            unit="m"
            onChange={setLength}
          />
          <SliderControl
            label="Release Angle ($\theta_0$)"
            value={angle}
            min={5}
            max={45}
            step={1}
            unit="°"
            onChange={(v) => {
              setAngle(v);
              setResetSignal((n) => n + 1);
            }}
          />
          <SliderControl
            label="Gravity ($g$)"
            value={gravity}
            min={1.6}
            max={20}
            step={0.1}
            unit="m/s²"
            onChange={setGravity}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Period (<MathInline text="$T$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {period.toFixed(2)} s
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Frequency (<MathInline text="$f = 1/T$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {frequency.toFixed(2)} Hz
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800 flex items-center justify-between gap-2">
            <div>
              <p className="text-slate-500 dark:text-neutral-400">
                Angular Frequency (<MathInline text="$\omega = \sqrt{g/L}$" />)
              </p>
              <p className="text-base font-bold text-blue-700 dark:text-blue-400">
                {omega.toFixed(2)} rad/s
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-500 dark:text-neutral-400">
              <span className="inline-block w-2 h-2 rounded-xs bg-emerald-500 mr-1" />
              <MathInline text="$K$" /> &nbsp;
              <span className="inline-block w-2 h-2 rounded-xs bg-amber-500 mr-1" />
              <MathInline text="$U$" /> bars in 3D
            </div>
          </div>
        </div>
      }
    >
      <PendulumContent
        playing={playing}
        length={length}
        maxAngleDeg={angle}
        gravity={gravity}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default PendulumScene;
