import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const R_GAS = 8.314;
const MOL_COUNT = 32;
const _molDummy = new THREE.Object3D();

interface GasParticle {
  x: number;
  yFrac: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

const ThermoContent: React.FC<{
  playing: boolean;
  tHot: number;
  tCold: number;
  moles: number;
  resetSignal: number;
}> = ({ playing, tHot, tCold, moles, resetSignal }) => {
  const pistonRef = useRef<THREE.Group>(null);
  const pvDotRef = useRef<THREE.Mesh>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const gasMeshRef = useRef<THREE.Mesh>(null);
  const reservoirRef = useRef<THREE.Mesh>(null);
  const moleculesRef = useRef<THREE.InstancedMesh>(null);
  const phaseRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const particlesRef = useRef<GasParticle[]>(
    Array.from({ length: MOL_COUNT }, (_, i) => {
      const a = (i * 2.39996) % (Math.PI * 2);
      const rad = 0.15 + ((i * 17) % 100) / 170;
      return {
        x: Math.cos(a) * rad,
        yFrac: 0.1 + ((i * 29) % 80) / 100,
        z: Math.sin(a) * rad,
        vx: Math.cos(a * 1.7) * 0.9,
        vy: (((i % 2) * 2 - 1) * (0.6 + (i % 5) * 0.15)),
        vz: Math.sin(a * 1.3) * 0.9,
      };
    })
  );

  const vMin = 1.0;
  const vMax = 2.2;
  const pLow = (moles * R_GAS * tCold) / vMax;
  const pHigh = (moles * R_GAS * tHot) / vMin;
  const workCycle = (pHigh * 0.65 - pLow) * (vMax - vMin);
  const qInCycle =
    moles * 1.5 * R_GAS * Math.max(1, tHot - tCold) + pHigh * 0.65 * (vMax - vMin);
  const actualEffPct = qInCycle > 0 ? Math.max(0, Math.min(99, (workCycle / qInCycle) * 100)) : 0;

  const pvCorners = useMemo(() => {
    const mapV = (v: number) => 1.3 + ((v - vMin) / (vMax - vMin)) * 2.2;
    const mapP = (p: number) => 0.9 + Math.min(2.2, (p / Math.max(pHigh, 5000)) * 2.0);
    return {
      a: [mapV(vMin), mapP(pHigh * 0.65), 0] as [number, number, number],
      b: [mapV(vMax), mapP(pHigh * 0.65), 0] as [number, number, number],
      c: [mapV(vMax), mapP(pLow), 0] as [number, number, number],
      d: [mapV(vMin), mapP(pLow), 0] as [number, number, number],
    };
  }, [pHigh, pLow]);

  const pvLoopPts = useMemo(
    () => [pvCorners.a, pvCorners.b, pvCorners.c, pvCorners.d, pvCorners.a],
    [pvCorners]
  );

  const workAreaWidth = pvCorners.b[0] - pvCorners.a[0];
  const workAreaHeight = Math.max(0.08, pvCorners.a[1] - pvCorners.d[1]);
  const workAreaCenterX = (pvCorners.a[0] + pvCorners.b[0]) / 2;
  const workAreaCenterY = (pvCorners.a[1] + pvCorners.d[1]) / 2;

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      phaseRef.current = 0;
    }
    const dt = Math.min(delta, 0.05);
    if (playing) {
      phaseRef.current = (phaseRef.current + dt * 0.32) % 1;
    }

    const u = phaseRef.current;
    let vNow = vMin;
    let pNow = pHigh * 0.65;
    let tNow = tHot;
    let stage = '1. Expansion (W > 0)';
    let dotPos: [number, number, number] = pvCorners.a;

    if (u < 0.25) {
      const f = u / 0.25;
      vNow = vMin + (vMax - vMin) * f;
      pNow = pHigh * 0.65;
      tNow = (pNow * vNow) / (moles * R_GAS);
      stage = '1. Expansion (W > 0)';
      dotPos = [
        THREE.MathUtils.lerp(pvCorners.a[0], pvCorners.b[0], f),
        THREE.MathUtils.lerp(pvCorners.a[1], pvCorners.b[1], f),
        0,
      ];
    } else if (u < 0.5) {
      const f = (u - 0.25) / 0.25;
      vNow = vMax;
      pNow = THREE.MathUtils.lerp(pHigh * 0.65, pLow, f);
      tNow = THREE.MathUtils.lerp(tHot, tCold, f);
      stage = '2. Cooling (Q < 0)';
      dotPos = [
        THREE.MathUtils.lerp(pvCorners.b[0], pvCorners.c[0], f),
        THREE.MathUtils.lerp(pvCorners.b[1], pvCorners.c[1], f),
        0,
      ];
    } else if (u < 0.75) {
      const f = (u - 0.5) / 0.25;
      vNow = vMax - (vMax - vMin) * f;
      pNow = pLow;
      tNow = tCold;
      stage = '3. Compression (W < 0)';
      dotPos = [
        THREE.MathUtils.lerp(pvCorners.c[0], pvCorners.d[0], f),
        THREE.MathUtils.lerp(pvCorners.c[1], pvCorners.d[1], f),
        0,
      ];
    } else {
      const f = (u - 0.75) / 0.25;
      vNow = vMin;
      pNow = THREE.MathUtils.lerp(pLow, pHigh * 0.65, f);
      tNow = THREE.MathUtils.lerp(tCold, tHot, f);
      stage = '4. Heating (Q > 0)';
      dotPos = [
        THREE.MathUtils.lerp(pvCorners.d[0], pvCorners.a[0], f),
        THREE.MathUtils.lerp(pvCorners.d[1], pvCorners.a[1], f),
        0,
      ];
    }

    const gasFloorY = 0.26;
    const gasH = 0.7 + ((vNow - vMin) / (vMax - vMin)) * 1.4;
    const heat = Math.min(1, Math.max(0, (tNow - tCold) / Math.max(1, tHot - tCold)));

    if (pistonRef.current) {
      pistonRef.current.position.set(-1.7, gasFloorY + gasH + 0.14, 0);
    }
    if (gasMeshRef.current) {
      gasMeshRef.current.scale.y = gasH;
      gasMeshRef.current.position.y = gasFloorY + gasH / 2;
      const mat = gasMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.color.setRGB(0.2 + 0.75 * heat, 0.55 - 0.15 * heat, 0.9 - 0.7 * heat);
    }
    if (reservoirRef.current) {
      const mat = reservoirRef.current.material as THREE.MeshStandardMaterial;
      mat.color.setRGB(0.15 + 0.8 * heat, 0.4 - 0.1 * heat, 0.85 - 0.7 * heat);
      mat.emissive.setRGB(0.45 * heat, 0.12 * heat, 0.35 * (1 - heat));
    }

    // Update bouncing gas molecules inside cylinder
    if (moleculesRef.current) {
      const speedScale = 0.6 + Math.sqrt(Math.max(100, tNow) / 300) * 0.85;
      const maxR = 0.68;
      const parts = particlesRef.current;
      const visibleCount = Math.min(MOL_COUNT, Math.max(10, Math.round(moles * 10)));
      for (let i = 0; i < MOL_COUNT; i++) {
        const pt = parts[i];
        if (i >= visibleCount) {
          _molDummy.position.set(-1.7, -10, 0);
          _molDummy.scale.setScalar(0.001);
          _molDummy.updateMatrix();
          moleculesRef.current.setMatrixAt(i, _molDummy.matrix);
          continue;
        }
        if (playing) {
          pt.x += pt.vx * speedScale * dt;
          pt.z += pt.vz * speedScale * dt;
          pt.yFrac += (pt.vy * speedScale * dt) / gasH;

          if (pt.yFrac > 0.94) {
            pt.yFrac = 0.94;
            pt.vy = -Math.abs(pt.vy);
          } else if (pt.yFrac < 0.06) {
            pt.yFrac = 0.06;
            pt.vy = Math.abs(pt.vy);
          }

          const rSq = pt.x * pt.x + pt.z * pt.z;
          if (rSq > maxR * maxR) {
            const r = Math.sqrt(rSq);
            const nx = pt.x / r;
            const nz = pt.z / r;
            pt.x = nx * maxR * 0.96;
            pt.z = nz * maxR * 0.96;
            const dot = pt.vx * nx + pt.vz * nz;
            pt.vx -= 2 * dot * nx;
            pt.vz -= 2 * dot * nz;
          }
        }
        _molDummy.position.set(-1.7 + pt.x, gasFloorY + pt.yFrac * gasH, pt.z);
        _molDummy.scale.setScalar(1);
        _molDummy.updateMatrix();
        moleculesRef.current.setMatrixAt(i, _molDummy.matrix);
      }
      moleculesRef.current.instanceMatrix.needsUpdate = true;
    }

    if (pvDotRef.current) {
      pvDotRef.current.position.set(...dotPos);
    }
    setPinDisplay(
      pinRef.current,
      `${stage}\nV=${vNow.toFixed(2)} m^3  P=${(pNow / 1000).toFixed(2)} kPa\nW=${(
        workCycle / 1000
      ).toFixed(2)} kJ  e=${actualEffPct.toFixed(1)}%`
    );
  });

  return (
    <>
      {/* Flanged Baseplate & Thermal Reservoir Pad */}
      <mesh position={[-1.7, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.22, 0.2, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.35} />
      </mesh>
      <mesh ref={reservoirRef} position={[-1.7, 0.22, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.06, 28]} />
        <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.55} roughness={0.35} />
      </mesh>

      {/* Glass Cylinder Sleeve + Brass Top Collar */}
      <mesh position={[-1.7, 1.48, 0]} renderOrder={3}>
        <cylinderGeometry args={[0.93, 0.93, 2.52, 32, 1, true]} />
        <meshStandardMaterial
          color="#cbd5e1"
          transparent
          opacity={0.24}
          roughness={0.1}
          metalness={0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-1.7, 2.74, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.94, 0.055, 12, 32]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.22} />
      </mesh>

      {/* Translucent Gas Volume Column */}
      <mesh ref={gasMeshRef} position={[-1.7, 0.76, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.84, 0.84, 1.0, 24]} />
        <meshStandardMaterial color="#f97316" transparent opacity={0.32} depthWrite={false} />
      </mesh>

      {/* Instanced Gas Molecules */}
      <instancedMesh ref={moleculesRef} args={[undefined, undefined, MOL_COUNT]} frustumCulled={false}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color="#fde047" emissive="#f59e0b" emissiveIntensity={0.45} roughness={0.25} />
      </instancedMesh>

      {/* Composite Piston Head with Brass Rings & Connecting Rod */}
      <group ref={pistonRef} position={[-1.7, 1.3, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.86, 0.86, 0.26, 28]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.28} />
        </mesh>
        {/* Dual compression rings */}
        {[-0.06, 0.06].map((yOff, idx) => (
          <mesh key={idx} position={[0, yOff, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.865, 0.022, 10, 28]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
          </mesh>
        ))}
        {/* Wrist pin collar */}
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.2, 0.24, 0.12, 18]} />
          <meshStandardMaterial color="#334155" metalness={0.65} roughness={0.3} />
        </mesh>
        {/* Connecting rod */}
        <mesh position={[0, 0.78, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 1.25, 14]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.22} />
        </mesh>
        <mesh position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.04, 10, 18]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.25} />
        </mesh>

        <PhysicsPin
          position={[0, 1.72, 0]}
          title="$PV = nRT,\\;\\Delta U = Q - W$"
          textRef={pinRef}
          valueText="Cycle active"
          accentClass="border-orange-400"
        />
      </group>

      {/* 3D PV Diagram Frame + Shaded Net Work Region */}
      <Line points={[[1.2, 0.7, 0], [1.2, 3.2, 0]]} color="#64748b" lineWidth={2} />
      <Line points={[[1.2, 0.7, 0], [3.8, 0.7, 0]]} color="#64748b" lineWidth={2} />
      <mesh position={[workAreaCenterX, workAreaCenterY, -0.02]}>
        <planeGeometry args={[workAreaWidth, workAreaHeight]} />
        <meshStandardMaterial
          color="#10b981"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Line points={pvLoopPts} color="#10b981" lineWidth={3} />
      {[pvCorners.a, pvCorners.b, pvCorners.c, pvCorners.d].map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.065, 12, 12]} />
          <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.4} />
        </mesh>
      ))}
      <mesh ref={pvDotRef} position={pvCorners.a}>
        <sphereGeometry args={[0.13, 18, 18]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} />
      </mesh>
    </>
  );
};

export const ThermoCycleScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [tHot, setTHot] = useState(600);
  const [tCold, setTCold] = useState(300);
  const [moles, setMoles] = useState(1.5);

  const safeTCold = Math.min(tCold, tHot - 80);
  const effMax = Math.max(0, 1 - safeTCold / tHot) * 100;
  const pHighKpa = ((moles * R_GAS * tHot) / 1.0 / 1000) * 0.65;
  const pLowKpa = (moles * R_GAS * safeTCold) / 2.2 / 1000;
  const wNetKj = Math.max(0, (pHighKpa - pLowKpa) * (2.2 - 1.0));
  const qInKj =
    (moles * 1.5 * R_GAS * Math.max(1, tHot - safeTCold)) / 1000 + pHighKpa * (2.2 - 1.0);
  const actualEfficiencyPct = qInKj > 0 ? Math.min(effMax, (wNetKj / qInKj) * 100) : 0;

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0.4, 2.7, 7.8]}
      cameraTarget={[0.5, 1.6, 0]}
      controls={
        <>
          <SliderControl
            label="Hot Reservoir ($T_H$)"
            value={tHot}
            min={420}
            max={900}
            step={20}
            unit="K"
            onChange={setTHot}
          />
          <SliderControl
            label="Cold Reservoir ($T_C$)"
            value={safeTCold}
            min={200}
            max={400}
            step={10}
            unit="K"
            onChange={setTCold}
          />
          <SliderControl
            label="Gas Amount ($n$)"
            value={moles}
            min={0.5}
            max={3.0}
            step={0.25}
            unit="mol"
            onChange={setMoles}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Net Work (<MathInline text="$W_{\\text{net}}$" />)
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {wNetKj.toFixed(2)} kJ
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Heat In (<MathInline text="$Q_{\\text{in}}$" />)
            </p>
            <p className="text-base font-bold text-amber-700 dark:text-amber-400">
              {qInKj.toFixed(2)} kJ
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Efficiency (<MathInline text="$e$" />)
            </p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-400">
              {actualEfficiencyPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Carnot (<MathInline text="$1 - T_C/T_H$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {effMax.toFixed(1)}%
            </p>
          </div>
        </div>
      }
    >
      <ThermoContent
        playing={playing}
        tHot={tHot}
        tCold={safeTCold}
        moles={moles}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default ThermoCycleScene;
