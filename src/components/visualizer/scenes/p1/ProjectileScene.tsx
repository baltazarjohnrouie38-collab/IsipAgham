import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const TRAIL_COUNT = 12;

const ProjectileContent: React.FC<{
  playing: boolean;
  angleDeg: number;
  speed: number;
  gravity: number;
  resetSignal: number;
}> = ({ playing, angleDeg, speed, gravity, resetSignal }) => {
  const rad = (angleDeg * Math.PI) / 180;
  const vx = speed * Math.cos(rad);
  const vy0 = speed * Math.sin(rad);
  const totalFlight = Math.max(0.2, (2 * vy0) / gravity);
  const maxRange = vx * totalFlight;
  const maxH = (vy0 * vy0) / (2 * gravity);

  // Scale world coordinates so the full arc fits comfortably in ~9.5 units width
  const scale = useMemo(() => Math.min(0.45, 9 / Math.max(10, maxRange)), [maxRange]);

  const ballGroupRef = useRef<THREE.Group>(null);
  const velArrowRef = useRef<THREE.Group>(null);
  const barrelRef = useRef<THREE.Group>(null);
  const trailRefs = useRef<Array<THREE.Mesh | null>>([]);
  const pinRef = useRef<HTMLDivElement>(null);
  const simTimeRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const arcPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    const steps = 54;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * totalFlight;
      const x = vx * t * scale - (maxRange * scale) / 2;
      const y = Math.max(0.24, (vy0 * t - 0.5 * gravity * t * t) * scale + 0.24);
      pts.push([x, y, 0]);
    }
    return pts;
  }, [vx, vy0, gravity, totalFlight, scale, maxRange]);

  const startX = -(maxRange * scale) / 2;
  const endX = (maxRange * scale) / 2;
  const apexY = maxH * scale + 0.24;

  const apexMarkerPts = useMemo<[number, number, number][]>(
    () => [
      [0, 0.02, 0],
      [0, apexY, 0],
    ],
    [apexY]
  );

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      simTimeRef.current = 0;
    }

    if (playing) {
      simTimeRef.current += Math.min(delta, 0.05);
      if (simTimeRef.current > totalFlight + 0.7) {
        simTimeRef.current = 0;
      }
    }

    const t = Math.min(simTimeRef.current, totalFlight);
    const xMeters = vx * t;
    const yMeters = Math.max(0, vy0 * t - 0.5 * gravity * t * t);
    const vyNow = vy0 - gravity * t;

    const wx = xMeters * scale - (maxRange * scale) / 2;
    const wy = yMeters * scale + 0.24;

    if (ballGroupRef.current) {
      ballGroupRef.current.position.set(wx, wy, 0);
    }

    if (barrelRef.current) {
      // Subtle recoil kick right at t < 0.2s
      const recoil = t < 0.18 ? Math.sin((t / 0.18) * Math.PI) * 0.12 : 0;
      barrelRef.current.position.x = -Math.cos(rad) * recoil;
      barrelRef.current.position.y = 0.26 - Math.sin(rad) * recoil;
    }

    // Update trailing ghost beads behind the projectile
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const m = trailRefs.current[i];
      if (!m) continue;
      const tTrail = Math.max(0, t - (i + 1) * (totalFlight / 26));
      if (t <= 0.02 || tTrail <= 0) {
        m.visible = false;
      } else {
        m.visible = true;
        const tx = vx * tTrail * scale - (maxRange * scale) / 2;
        const ty = Math.max(0.24, (vy0 * tTrail - 0.5 * gravity * tTrail * tTrail) * scale + 0.24);
        m.position.set(tx, ty, 0);
        const s = 1 - i / (TRAIL_COUNT + 1);
        m.scale.setScalar(s);
      }
    }

    if (velArrowRef.current) {
      const angle = Math.atan2(vyNow, vx) - Math.PI / 2;
      velArrowRef.current.rotation.z = angle;
      const mag = Math.hypot(vx, vyNow);
      const lenScale = Math.min(1.8, Math.max(0.4, mag * 0.07));
      velArrowRef.current.scale.set(1, lenScale, 1);
    }

    if (pinRef.current) {
      pinRef.current.textContent = `x=${xMeters.toFixed(1)} m  y=${yMeters.toFixed(
        1
      )} m\nv_x=${vx.toFixed(1)}  v_y=${vyNow.toFixed(1)} m/s`;
    }
  });

  return (
    <>
      {/* Composite Brass & Slate Cannon Launcher at Start */}
      <group position={[startX, 0, 0]}>
        {/* Wooden/Slate baseplate */}
        <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.92, 0.12, 0.72]} />
          <meshStandardMaterial color="#334155" roughness={0.65} metalness={0.2} />
        </mesh>
        {/* Twin side trunnion brackets */}
        <mesh position={[-0.08, 0.22, 0.24]} castShadow>
          <boxGeometry args={[0.32, 0.24, 0.08]} />
          <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.35} />
        </mesh>
        <mesh position={[-0.08, 0.22, -0.24]} castShadow>
          <boxGeometry args={[0.32, 0.24, 0.08]} />
          <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.35} />
        </mesh>
        {/* Twin wheels */}
        {[-0.36, 0.36].map((zOff, idx) => (
          <mesh key={idx} position={[-0.08, 0.18, zOff]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.07, 18]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.2} />
          </mesh>
        ))}
        {/* Tilting Barrel Group */}
        <group ref={barrelRef} position={[0, 0.26, 0]} rotation={[0, 0, rad]}>
          <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.13, 0.17, 0.78, 20]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.28} metalness={0.65} />
          </mesh>
          {/* Brass muzzle ring */}
          <mesh position={[0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.135, 0.03, 12, 20]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.22} metalness={0.85} />
          </mesh>
          {/* Breech cap */}
          <mesh position={[-0.14, 0, 0]}>
            <sphereGeometry args={[0.17, 16, 16]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.85} />
          </mesh>
        </group>
      </group>

      {/* Apex Height Beacon */}
      <Line points={apexMarkerPts} color="#2563eb" lineWidth={1.6} dashed dashSize={0.14} gapSize={0.1} />
      <mesh position={[0, apexY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.025, 10, 24]} />
        <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.45} />
      </mesh>

      {/* Target Landing Pad & Flag */}
      <group position={[endX, 0, 0]}>
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[0.36, 0.4, 0.06, 24]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.4} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.28, 24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
        <mesh position={[0.32, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.85, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.48, 0.74, 0]} castShadow>
          <boxGeometry args={[0.32, 0.2, 0.02]} />
          <meshStandardMaterial color="#10b981" roughness={0.45} />
        </mesh>
      </group>

      {/* Parabolic path */}
      <Line points={arcPoints} color="#2563eb" lineWidth={2.5} dashed dashSize={0.22} gapSize={0.12} />

      {/* Motion trail spheres */}
      {Array.from({ length: TRAIL_COUNT }).map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            trailRefs.current[idx] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={0.4}
            transparent
            opacity={Math.max(0.18, 0.8 - idx * 0.055)}
          />
        </mesh>
      ))}

      {/* Composite Metallic Projectile Sphere with equatorial ring & velocity vector */}
      <group ref={ballGroupRef} position={[startX, 0.24, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.2} metalness={0.75} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.225, 0.022, 10, 24]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.35} metalness={0.5} />
        </mesh>
        <group ref={velArrowRef}>
          <Arrow3D origin={[0, 0, 0]} direction={[0, 1, 0]} length={1.0} color="#10b981" />
        </group>
        <PhysicsPin
          position={[0, 0.78, 0]}
          title="$\vec{v}(t) = \vec{v}_0 + \vec{g}t$"
          textRef={pinRef}
          valueText="x=0.0 m  y=0.0 m"
          accentClass="border-amber-400"
        />
      </group>
    </>
  );
};

export const ProjectileScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [angle, setAngle] = useState(45);
  const [speed, setSpeed] = useState(14);
  const [gravity, setGravity] = useState(9.81);

  const rad = (angle * Math.PI) / 180;
  const vy0 = speed * Math.sin(rad);
  const vx = speed * Math.cos(rad);
  const tFlight = (2 * vy0) / gravity;
  const maxHeight = (vy0 * vy0) / (2 * gravity);
  const range = vx * tFlight;

  const applyPreset = (a: number, s: number, g: number) => {
    setAngle(a);
    setSpeed(s);
    setGravity(g);
    setResetSignal((n) => n + 1);
  };

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0, 3.8, 10.5]}
      cameraTarget={[0, 1.4, 0]}
      controls={
        <>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200 mr-1">
              Quick Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset(45, 14, 9.81)}
              className="min-h-[36px] px-3 rounded-lg text-xs font-semibold border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-950 text-slate-700 dark:text-neutral-200 hover:border-blue-600 cursor-pointer"
            >
              45° Max Range
            </button>
            <button
              type="button"
              onClick={() => applyPreset(70, 16, 9.81)}
              className="min-h-[36px] px-3 rounded-lg text-xs font-semibold border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-950 text-slate-700 dark:text-neutral-200 hover:border-blue-600 cursor-pointer"
            >
              High Lob 70°
            </button>
            <button
              type="button"
              onClick={() => applyPreset(45, 9, 1.62)}
              className="min-h-[36px] px-3 rounded-lg text-xs font-semibold border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-950 text-slate-700 dark:text-neutral-200 hover:border-blue-600 cursor-pointer"
            >
              Moon Gravity ($g=1.62$)
            </button>
          </div>
          <SliderControl
            label="Launch Angle ($\theta$)"
            value={angle}
            min={15}
            max={80}
            step={1}
            unit="°"
            onChange={(v) => {
              setAngle(v);
              setResetSignal((n) => n + 1);
            }}
          />
          <SliderControl
            label="Initial Speed ($v_0$)"
            value={speed}
            min={5}
            max={25}
            step={1}
            unit="m/s"
            onChange={(v) => {
              setSpeed(v);
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
            onChange={(v) => {
              setGravity(v);
              setResetSignal((n) => n + 1);
            }}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Range (<MathInline text="$R$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {range.toFixed(2)} m
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Max Height (<MathInline text="$H_{\max}$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {maxHeight.toFixed(2)} m
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Flight Time (<MathInline text="$T$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {tFlight.toFixed(2)} s
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Components (<MathInline text="$v_x / v_{y0}$" />)
            </p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-400">
              {vx.toFixed(1)} / {vy0.toFixed(1)} m/s
            </p>
          </div>
        </div>
      }
    >
      <ProjectileContent
        playing={playing}
        angleDeg={angle}
        speed={speed}
        gravity={gravity}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default ProjectileScene;
