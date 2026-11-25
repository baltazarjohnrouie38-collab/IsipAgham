import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const G_CONST = 6.674e-11;
const M_EARTH = 5.972e24;
const R_EARTH = 6.371e6;
const STAR_COUNT = 320;

const Starfield: React.FC = () => {
  const geo = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      // Deterministic pseudo-random distribution on a spherical shell
      const u = ((i * 73 + 17) % 1000) / 1000;
      const v = ((i * 197 + 43) % 1000) / 1000;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 16 + (i % 7) * 1.4;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useEffect(() => {
    return () => geo.dispose();
  }, [geo]);

  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#cbd5e1" size={0.09} sizeAttenuation transparent opacity={0.75} />
    </points>
  );
};

const OrbitContent: React.FC<{
  playing: boolean;
  radiusRe: number;
  planetMassMult: number;
  satMass: number;
  resetSignal: number;
}> = ({ playing, radiusRe, planetMassMult, satMass, resetSignal }) => {
  const satOrbitRef = useRef<THREE.Group>(null);
  const planetGroupRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const rMeters = radiusRe * R_EARTH;
  const planetMass = planetMassMult * M_EARTH;
  const vOrbit = Math.sqrt((G_CONST * planetMass) / rMeters);
  const fg = (G_CONST * planetMass * satMass) / (rMeters * rMeters);
  const periodMin = (2 * Math.PI * rMeters) / vOrbit / 60;

  const visualOrbitR = 1.45 + (radiusRe - 1.2) * 1.05;
  const visualSpeed = (vOrbit / 7900) * 0.9;

  const orbitPts = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      pts.push([Math.cos(a) * visualOrbitR, 0, Math.sin(a) * visualOrbitR]);
    }
    return pts;
  }, [visualOrbitR]);

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      angleRef.current = 0;
    }
    const dt = Math.min(delta, 0.05);
    if (playing) {
      angleRef.current += visualSpeed * dt;
      if (planetGroupRef.current) {
        planetGroupRef.current.rotation.y += dt * 0.25;
      }
    }
    if (satOrbitRef.current) {
      satOrbitRef.current.rotation.y = angleRef.current;
    }
    setPinDisplay(
      pinRef.current,
      `v=${(vOrbit / 1000).toFixed(2)} km/s\nF_g=${fg.toFixed(0)} N  T=${periodMin.toFixed(0)} min`
    );
  });

  const gravArrowLen = Math.min(1.35, Math.max(0.55, 1.35 / Math.pow(radiusRe / 1.2, 1.2)));
  const velArrowLen = Math.min(1.45, Math.max(0.65, (vOrbit / 7900) * 1.15));

  return (
    <group position={[0, 1.5, 0]}>
      <Starfield />

      {/* Composite Planet: ocean core, tilted axial poles, equatorial belt, atmosphere halo */}
      <group rotation={[0.18, 0, 0.22]}>
        <group ref={planetGroupRef}>
          <mesh castShadow>
            <sphereGeometry args={[0.98, 36, 36]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.48} metalness={0.12} />
          </mesh>
          {/* Procedural landmass bands */}
          <mesh position={[0.42, 0.25, 0.72]} scale={[0.52, 0.36, 0.42]}>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial color="#15803d" roughness={0.85} />
          </mesh>
          <mesh position={[-0.6, -0.18, -0.58]} scale={[0.55, 0.4, 0.45]}>
            <sphereGeometry args={[0.42, 16, 16]} />
            <meshStandardMaterial color="#166534" roughness={0.85} />
          </mesh>
          <mesh position={[0.25, -0.45, -0.68]} scale={[0.45, 0.32, 0.4]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#15803d" roughness={0.85} />
          </mesh>
          {/* Polar ice caps */}
          <mesh position={[0, 0.88, 0]}>
            <cylinderGeometry args={[0.2, 0.42, 0.16, 20]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.88, 0]}>
            <cylinderGeometry args={[0.42, 0.2, 0.16, 20]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.55} />
          </mesh>
        </group>
        {/* Axial spindle */}
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 2.55, 10]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* Atmosphere glow shell */}
        <mesh>
          <sphereGeometry args={[1.07, 28, 28]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.2}
            roughness={0.15}
            depthWrite={false}
          />
        </mesh>
      </group>

      <Line points={orbitPts} color="#38bdf8" lineWidth={1.8} dashed dashSize={0.22} gapSize={0.12} />

      {/* Orbiting Composite Satellite */}
      <group ref={satOrbitRef}>
        <group position={[visualOrbitR, 0, 0]}>
          {/* Gold foil spacecraft bus */}
          <mesh castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.26, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.22} />
          </mesh>
          {/* Comms dish pointing inward toward planet (-X) */}
          <mesh position={[-0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.14, 0.12, 16, 1, true]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.25} side={THREE.DoubleSide} />
          </mesh>
          {/* Solar panel cross-strut */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 1.35, 10]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.25} />
          </mesh>
          {/* Solar panel wings */}
          {[-0.46, 0.46].map((zOff, idx) => (
            <group key={idx} position={[0, 0, zOff]}>
              <mesh castShadow>
                <boxGeometry args={[0.03, 0.24, 0.56]} />
                <meshStandardMaterial color="#1d4ed8" metalness={0.45} roughness={0.2} />
              </mesh>
              <mesh>
                <boxGeometry args={[0.036, 0.26, 0.58]} />
                <meshStandardMaterial color="#cbd5e1" wireframe />
              </mesh>
            </group>
          ))}

          {/* Inward gravity vector */}
          <Arrow3D origin={[-0.24, 0, 0]} direction={[-1, 0, 0]} length={gravArrowLen} color="#ef4444" />
          {/* Tangential orbital velocity vector */}
          <Arrow3D origin={[0, 0, -0.22]} direction={[0, 0, -1]} length={velArrowLen} color="#10b981" />

          <PhysicsPin
            position={[0, 0.68, 0]}
            title="$v = \\sqrt{GM/r}$"
            textRef={pinRef}
            valueText={`v=${(vOrbit / 1000).toFixed(2)} km/s`}
            accentClass="border-blue-400"
          />
        </group>
      </group>
    </group>
  );
};

export const OrbitScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [radiusRe, setRadiusRe] = useState(1.5);
  const [planetMassMult, setPlanetMassMult] = useState(1.0);
  const [satMass, setSatMass] = useState(500);

  const rMeters = radiusRe * R_EARTH;
  const planetMass = planetMassMult * M_EARTH;
  const vOrbit = Math.sqrt((G_CONST * planetMass) / rMeters);
  const fg = (G_CONST * planetMass * satMass) / (rMeters * rMeters);
  const periodMin = (2 * Math.PI * rMeters) / vOrbit / 60;

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      showGrid={false}
      cameraPosition={[0, 5.4, 7.8]}
      cameraTarget={[0, 1.5, 0]}
      controls={
        <>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200 mr-1">
              Orbit Altitude Presets:
            </span>
            {[
              { label: 'Low Earth ($1.2\\,R_E$)', r: 1.2 },
              { label: 'Medium Orbit ($2.0\\,R_E$)', r: 2.0 },
              { label: 'High Orbit ($3.2\\,R_E$)', r: 3.2 },
            ].map((p) => (
              <button
                key={p.r}
                type="button"
                onClick={() => setRadiusRe(p.r)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                  Math.abs(radiusRe - p.r) < 0.05
                    ? 'bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-600'
                    : 'bg-[#FAF9F6] dark:bg-neutral-950 text-slate-700 dark:text-neutral-200 border-stone-200 dark:border-neutral-700 hover:border-blue-600'
                }`}
              >
                <MathInline text={p.label} />
              </button>
            ))}
          </div>
          <SliderControl
            label="Orbital Radius ($r$)"
            value={radiusRe}
            min={1.2}
            max={3.5}
            step={0.1}
            unit="$R_E$"
            onChange={setRadiusRe}
          />
          <SliderControl
            label="Planet Mass ($M$)"
            value={planetMassMult}
            min={0.5}
            max={3.0}
            step={0.1}
            unit="$M_E$"
            onChange={setPlanetMassMult}
          />
          <SliderControl
            label="Satellite Mass ($m$)"
            value={satMass}
            min={100}
            max={2000}
            step={50}
            unit="kg"
            onChange={setSatMass}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Orbital Speed (<MathInline text="$v$" />)
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {(vOrbit / 1000).toFixed(2)} km/s
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Gravity Force (<MathInline text="$F_g$" />)
            </p>
            <p className="text-base font-bold text-red-600 dark:text-red-400">
              {fg.toFixed(0)} N
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Orbital Period (<MathInline text="$T$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {periodMin.toFixed(1)} min
            </p>
          </div>
        </div>
      }
    >
      <OrbitContent
        playing={playing}
        radiusRe={radiusRe}
        planetMassMult={planetMassMult}
        satMass={satMass}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default OrbitScene;
