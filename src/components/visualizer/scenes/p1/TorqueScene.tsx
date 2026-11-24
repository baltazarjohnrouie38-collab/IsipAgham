import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const DISK_RADIUS = 2.0;

const TorqueContent: React.FC<{
  playing: boolean;
  leverR: number;
  force: number;
  angleDeg: number;
  diskMass: number;
  resetSignal: number;
}> = ({ playing, leverR, force, angleDeg, diskMass, resetSignal }) => {
  const wheelRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const omegaRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const thetaRad = (angleDeg * Math.PI) / 180;
  const torque = leverR * force * Math.sin(thetaRad);
  const inertia = 0.5 * diskMass * DISK_RADIUS * DISK_RADIUS;
  const alpha = torque / inertia;

  // Applied force vector direction in XY plane relative to lever arm along +X
  const fx = Math.cos(thetaRad);
  const fy = Math.sin(thetaRad);

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      omegaRef.current = 0;
      if (wheelRef.current) wheelRef.current.rotation.z = 0;
    }

    if (playing && wheelRef.current) {
      const dt = Math.min(delta, 0.05);
      omegaRef.current = Math.min(8, omegaRef.current + alpha * dt * 0.25);
      wheelRef.current.rotation.z += omegaRef.current * dt;
    }

    if (pinRef.current) {
      pinRef.current.textContent = `τ=${torque.toFixed(1)} N·m  α=${alpha.toFixed(
        2
      )} rad/s²\nω=${omegaRef.current.toFixed(2)} rad/s`;
    }
  });

  return (
    <>
      {/* Axle stand */}
      <mesh position={[0, 1.3, -0.4]} castShadow>
        <boxGeometry args={[0.5, 2.6, 0.4]} />
        <meshStandardMaterial color="#475569" metalness={0.45} roughness={0.4} />
      </mesh>

      <group ref={wheelRef} position={[0, 2.3, 0]}>
        {/* Flywheel disk */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[DISK_RADIUS, DISK_RADIUS, 0.28, 36]} />
          <meshStandardMaterial color="#334155" roughness={0.32} metalness={0.65} />
        </mesh>

        {/* Visual spoke & lever bar */}
        <mesh position={[leverR / 2, 0, 0.2]} castShadow>
          <boxGeometry args={[leverR, 0.14, 0.14]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.75} roughness={0.25} />
        </mesh>

        {/* Force application point */}
        <group position={[leverR, 0, 0.2]}>
          <mesh>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} />
          </mesh>
          <Arrow3D
            origin={[0, 0, 0]}
            direction={[fx, fy, 0]}
            length={0.7 + force * 0.025}
            color="#ef4444"
          />
          <PhysicsPin
            position={[0.2, 0.8, 0]}
            title="$\tau = rF\sin\theta$"
            textRef={pinRef}
            valueText={`τ=${torque.toFixed(1)} N·m`}
            accentClass="border-amber-400"
          />
        </group>
      </group>
    </>
  );
};

export const TorqueScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [leverR, setLeverR] = useState(1.5);
  const [force, setForce] = useState(25);
  const [angle, setAngle] = useState(90);
  const [diskMass, setDiskMass] = useState(4);

  const torque = leverR * force * Math.sin((angle * Math.PI) / 180);
  const inertia = 0.5 * diskMass * DISK_RADIUS * DISK_RADIUS;
  const alpha = torque / inertia;

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0, 2.8, 7.6]}
      cameraTarget={[0, 2.2, 0]}
      controls={
        <>
          <SliderControl
            label="Lever Arm ($r$)"
            value={leverR}
            min={0.4}
            max={2.0}
            step={0.1}
            unit="m"
            onChange={setLeverR}
          />
          <SliderControl
            label="Applied Force ($F$)"
            value={force}
            min={5}
            max={50}
            step={1}
            unit="N"
            onChange={setForce}
          />
          <SliderControl
            label="Force Angle ($\theta$)"
            value={angle}
            min={15}
            max={165}
            step={5}
            unit="°"
            onChange={setAngle}
          />
          <SliderControl
            label="Disk Mass ($M$)"
            value={diskMass}
            min={1}
            max={10}
            step={1}
            unit="kg"
            onChange={setDiskMass}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Torque (<MathInline text="$\tau$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {torque.toFixed(2)} N·m
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Inertia (<MathInline text="$I = \tfrac{1}{2}MR^2$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {inertia.toFixed(2)} kg·m²
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Angular Acceleration (<MathInline text="$\alpha = \tau / I$" />)
            </p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-400">
              {alpha.toFixed(2)} rad/s²
            </p>
          </div>
        </div>
      }
    >
      <TorqueContent
        playing={playing}
        leverR={leverR}
        force={force}
        angleDeg={angle}
        diskMass={diskMass}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default TorqueScene;
