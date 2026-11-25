import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const G = 9.81;

const BuoyancyContent: React.FC<{
  playing: boolean;
  objDensity: number;
  fluidDensity: number;
  volume: number;
  resetSignal: number;
}> = ({ playing, objDensity, fluidDensity, volume, resetSignal }) => {
  const blockGroupRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  const waterSurfaceY = 2.4;
  const tankBottomY = 0.25;
  const cubeSide = 0.8 + Math.min(0.45, volume * 0.2);

  // Target center Y: if floats, submerged fraction = objDensity / fluidDensity
  const floats = objDensity <= fluidDensity;
  const subFrac = Math.min(1, objDensity / fluidDensity);
  const targetY = floats
    ? waterSurfaceY + cubeSide / 2 - subFrac * cubeSide
    : tankBottomY + cubeSide / 2;

  const yRef = useRef(3.2);
  const vyRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const weight = objDensity * volume * G;
  const maxBuoyant = fluidDensity * volume * G;
  const eqBuoyant = floats ? weight : maxBuoyant;

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      yRef.current = 3.2;
      vyRef.current = 0;
    }

    if (playing) {
      const dt = Math.min(delta, 0.04);
      const springF = (targetY - yRef.current) * 14 - vyRef.current * 4.5;
      vyRef.current += springF * dt;
      yRef.current += vyRef.current * dt;
      if (yRef.current < tankBottomY + cubeSide / 2) {
        yRef.current = tankBottomY + cubeSide / 2;
        vyRef.current = 0;
      }
    }

    if (blockGroupRef.current) {
      blockGroupRef.current.position.set(0, yRef.current, 0);
    }

    const submergedHeight = Math.max(0, Math.min(cubeSide, waterSurfaceY - (yRef.current - cubeSide / 2)));
    const fracNow = submergedHeight / cubeSide;
    const fbNow = fluidDensity * (volume * fracNow) * G;

    setPinDisplay(
      pinRef.current,
      `F_B=${fbNow.toFixed(0)} N  W=${weight.toFixed(0)} N\n${
        floats ? `Floats (${(subFrac * 100).toFixed(0)}% submerged)` : 'Sinks (W > F_B,max)'
      }`
    );
  });

  return (
    <>
      {/* Tank base & glass walls */}
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.2, 0.24, 3.2]} />
        <meshStandardMaterial color="#334155" metalness={0.35} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.32, 0]} renderOrder={2}>
        <boxGeometry args={[3.9, 2.2, 2.9]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.32} roughness={0.12} depthWrite={false} />
      </mesh>

      {/* Moving block */}
      <group ref={blockGroupRef} position={[0, 3.0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[cubeSide, cubeSide, cubeSide]} />
          <meshStandardMaterial
            color={floats ? '#f59e0b' : '#475569'}
            roughness={floats ? 0.35 : 0.4}
            metalness={floats ? 0.2 : 0.6}
          />
        </mesh>

        {/* Upward Buoyant Force */}
        <Arrow3D
          origin={[0.3, 0, 0]}
          direction={[0, 1, 0]}
          length={Math.min(1.8, 0.4 + (eqBuoyant / Math.max(weight, maxBuoyant)) * 1.1)}
          color="#10b981"
        />

        {/* Downward Weight */}
        <Arrow3D
          origin={[-0.3, 0, 0]}
          direction={[0, -1, 0]}
          length={Math.min(1.8, 0.4 + (weight / Math.max(weight, maxBuoyant)) * 1.1)}
          color="#ef4444"
        />

        <PhysicsPin
          position={[0, cubeSide / 2 + 0.65, 0]}
          title="$F_B = \\rho_{\\text{fluid}} V_{\\text{sub}} g$"
          textRef={pinRef}
          valueText={`W=${weight.toFixed(0)} N`}
          accentClass="border-cyan-400"
        />
      </group>
    </>
  );
};

export const BuoyancyScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [objDensity, setObjDensity] = useState(650);
  const [fluidDensity, setFluidDensity] = useState(1000);
  const [volume, setVolume] = useState(0.5);

  const weight = objDensity * volume * G;
  const maxBuoyant = fluidDensity * volume * G;
  const floats = objDensity <= fluidDensity;
  const subPct = Math.min(100, (objDensity / fluidDensity) * 100);

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[4.2, 3.6, 6.4]}
      cameraTarget={[0, 1.6, 0]}
      controls={
        <>
          <SliderControl
            label="Object Density ($\\rho_{\\text{obj}}$)"
            value={objDensity}
            min={200}
            max={2200}
            step={50}
            unit="kg/m³"
            onChange={setObjDensity}
          />
          <SliderControl
            label="Fluid Density ($\\rho_{\\text{fluid}}$)"
            value={fluidDensity}
            min={700}
            max={1500}
            step={25}
            unit="kg/m³"
            onChange={setFluidDensity}
          />
          <SliderControl
            label="Object Volume ($V$)"
            value={volume}
            min={0.1}
            max={2.0}
            step={0.1}
            unit="m³"
            onChange={setVolume}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Weight (<MathInline text="$W = \\rho_{\\text{obj}}Vg$" />)
            </p>
            <p className="text-base font-bold text-red-600 dark:text-red-400">
              {weight.toFixed(0)} N
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Max Buoyant (<MathInline text="$F_{B,\max}$" />)
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {maxBuoyant.toFixed(0)} N
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">Equilibrium State</p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {floats ? `Floats — ${subPct.toFixed(1)}% submerged` : 'Sinks — 100% submerged'}
            </p>
          </div>
        </div>
      }
    >
      <BuoyancyContent
        playing={playing}
        objDensity={objDensity}
        fluidDensity={fluidDensity}
        volume={volume}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default BuoyancyScene;
