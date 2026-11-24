import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const G = 9.81;

const InclineContent: React.FC<{
  playing: boolean;
  angleDeg: number;
  mu: number;
  mass: number;
  resetSignal: number;
}> = ({ playing, angleDeg, mu, mass, resetSignal }) => {
  const rad = (angleDeg * Math.PI) / 180;
  const rampLen = 7;
  const fParallel = mass * G * Math.sin(rad);
  const normal = mass * G * Math.cos(rad);
  const fFrictionMax = mu * normal;
  const netForce = Math.max(0, fParallel - fFrictionMax);
  const accel = netForce / mass;

  const crateRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const sRef = useRef(0);
  const vRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  // Build wedge geometry oriented so slope goes down from left (-x, high) to right (+x, low)
  const wedgeGeo = useMemo(() => {
    const base = rampLen * Math.cos(rad);
    const height = rampLen * Math.sin(rad);
    const shape = new THREE.Shape();
    shape.moveTo(-base / 2, 0);
    shape.lineTo(base / 2, 0);
    shape.lineTo(-base / 2, height);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: false });
    geo.translate(0, 0, -1.1);
    return geo;
  }, [rad]);

  const base = rampLen * Math.cos(rad);
  const height = rampLen * Math.sin(rad);
  const maxSlide = rampLen - 1.1;

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      sRef.current = 0;
      vRef.current = 0;
    }

    if (playing) {
      const dt = Math.min(delta, 0.05);
      if (accel > 0.001) {
        vRef.current += accel * dt;
        sRef.current += vRef.current * dt * 0.45;
        if (sRef.current >= maxSlide) {
          sRef.current = 0;
          vRef.current = 0;
        }
      } else {
        vRef.current = 0;
      }
    }

    const s = 0.55 + sRef.current;
    // Along slope from top (-base/2, height) toward bottom (+base/2, 0)
    const dirX = Math.cos(rad);
    const dirY = -Math.sin(rad);
    const normX = Math.sin(rad);
    const normY = Math.cos(rad);
    const crateHalfH = 0.35;

    const wx = -base / 2 + s * dirX + crateHalfH * normX;
    const wy = height + s * dirY + crateHalfH * normY;

    if (crateRef.current) {
      crateRef.current.position.set(wx, wy, 0);
      crateRef.current.rotation.z = -rad;
    }

    if (pinRef.current) {
      pinRef.current.textContent =
        accel > 0
          ? `a=${accel.toFixed(2)} m/s²  v=${vRef.current.toFixed(2)} m/s\nf_k=${fFrictionMax.toFixed(
              1
            )} N  N=${normal.toFixed(1)} N`
          : `Static (f_s holds crate)\nF_∥=${fParallel.toFixed(1)} N ≤ μN=${fFrictionMax.toFixed(
              1
            )} N`;
    }
  });

  return (
    <>
      <mesh geometry={wedgeGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#475569" roughness={0.65} metalness={0.2} />
      </mesh>

      <group ref={crateRef}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.7, 0.9]} />
          <meshStandardMaterial color="#d97706" roughness={0.38} metalness={0.18} />
        </mesh>

        {/* Normal force vector (local +Y) */}
        <Arrow3D
          origin={[0, 0.35, 0]}
          direction={[0, 1, 0]}
          length={Math.min(1.8, (normal / (mass * G)) * 1.4)}
          color="#10b981"
        />

        {/* Down-slope gravity component (local +X) */}
        <Arrow3D
          origin={[0.45, 0, 0]}
          direction={[1, 0, 0]}
          length={Math.min(1.8, (fParallel / (mass * G)) * 1.6)}
          color="#2563eb"
        />

        {/* Friction vector opposing motion (local -X) */}
        <Arrow3D
          origin={[-0.45, 0, 0]}
          direction={[-1, 0, 0]}
          length={Math.min(1.8, (Math.min(fParallel, fFrictionMax) / (mass * G)) * 1.6)}
          color="#ef4444"
        />

        <PhysicsPin
          position={[0, 0.95, 0]}
          title="$a = g(\sin\theta - \mu_k\cos\theta)$"
          textRef={pinRef}
          valueText={`a=${accel.toFixed(2)} m/s²`}
          accentClass="border-amber-400"
        />
      </group>
    </>
  );
};

export const InclinedPlaneScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [angle, setAngle] = useState(30);
  const [mu, setMu] = useState(0.2);
  const [mass, setMass] = useState(5);

  const rad = (angle * Math.PI) / 180;
  const fParallel = mass * G * Math.sin(rad);
  const normal = mass * G * Math.cos(rad);
  const friction = mu * normal;
  const accel = Math.max(0, (fParallel - friction) / mass);

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[1.5, 4.2, 8.5]}
      cameraTarget={[0, 1.3, 0]}
      controls={
        <>
          <SliderControl
            label="Ramp Angle ($\theta$)"
            value={angle}
            min={10}
            max={50}
            step={1}
            unit="°"
            onChange={(v) => {
              setAngle(v);
              setResetSignal((n) => n + 1);
            }}
          />
          <SliderControl
            label="Friction Coeff ($\mu_k$)"
            value={mu}
            min={0}
            max={0.8}
            step={0.05}
            unit=""
            onChange={(v) => {
              setMu(v);
              setResetSignal((n) => n + 1);
            }}
          />
          <SliderControl
            label="Crate Mass ($m$)"
            value={mass}
            min={1}
            max={20}
            step={1}
            unit="kg"
            onChange={setMass}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Parallel (<MathInline text="$mg\sin\theta$" />)
            </p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-400">
              {fParallel.toFixed(1)} N
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Normal Force (<MathInline text="$N$" />)
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {normal.toFixed(1)} N
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Max Friction (<MathInline text="$\mu_k N$" />)
            </p>
            <p className="text-base font-bold text-red-600 dark:text-red-400">
              {friction.toFixed(1)} N
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Acceleration (<MathInline text="$a$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {accel.toFixed(2)} m/s²
            </p>
          </div>
        </div>
      }
    >
      <InclineContent
        playing={playing}
        angleDeg={angle}
        mu={mu}
        mass={mass}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default InclinedPlaneScene;
