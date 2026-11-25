import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const K_COULOMB = 8.99e9;

const CoulombContent: React.FC<{
  playing: boolean;
  q1Micro: number;
  q2Micro: number;
  dist: number;
  resetSignal: number;
}> = ({ playing, q1Micro, q2Micro, dist, resetSignal }) => {
  const probeRef = useRef<THREE.Group>(null);
  const pin1Ref = useRef<HTMLDivElement>(null);
  const pinProbeRef = useRef<HTMLDivElement>(null);
  const tRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const q1 = q1Micro * 1e-6;
  const q2 = q2Micro * 1e-6;
  const forceN = (K_COULOMB * Math.abs(q1 * q2)) / (dist * dist);
  const attractive = q1Micro * q2Micro < 0;

  const halfSep = 0.6 + dist * 0.75;
  const x1 = -halfSep;
  const x2 = halfSep;

  // Trace electric field lines from both charges
  const fieldLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    const angles = [0, 0.45, -0.45, 0.95, -0.95, 1.57, -1.57, 2.25, -2.25, Math.PI];
    const seeds: Array<{ sx: number; sy: number; sz: number; sign: number }> = [];

    for (const a of angles) {
      if (Math.abs(q1Micro) > 0.1) {
        seeds.push({
          sx: x1 + Math.cos(a) * 0.34,
          sy: 1.5 + Math.sin(a) * 0.34,
          sz: 0,
          sign: q1Micro >= 0 ? 1 : -1,
        });
      }
      if (Math.abs(q2Micro) > 0.1) {
        seeds.push({
          sx: x2 + Math.cos(a) * 0.34,
          sy: 1.5 + Math.sin(a) * 0.34,
          sz: 0,
          sign: q2Micro >= 0 ? 1 : -1,
        });
      }
    }

    for (const seed of seeds) {
      const pts: [number, number, number][] = [[seed.sx, seed.sy, seed.sz]];
      let px = seed.sx;
      let py = seed.sy;
      for (let step = 0; step < 36; step++) {
        const dx1 = px - x1;
        const dy1 = py - 1.5;
        const r1sq = Math.max(0.08, dx1 * dx1 + dy1 * dy1);
        const dx2 = px - x2;
        const dy2 = py - 1.5;
        const r2sq = Math.max(0.08, dx2 * dx2 + dy2 * dy2);

        const ex = (q1Micro * dx1) / Math.pow(r1sq, 1.5) + (q2Micro * dx2) / Math.pow(r2sq, 1.5);
        const ey = (q1Micro * dy1) / Math.pow(r1sq, 1.5) + (q2Micro * dy2) / Math.pow(r2sq, 1.5);
        const mag = Math.hypot(ex, ey);
        if (mag < 1e-4) break;

        px += (ex / mag) * seed.sign * 0.14;
        py += (ey / mag) * seed.sign * 0.14;
        pts.push([px, py, 0]);
        if (Math.abs(px) > 5.2 || py < 0.1 || py > 3.8) break;
        if (Math.hypot(px - x1, py - 1.5) < 0.28 || Math.hypot(px - x2, py - 1.5) < 0.28) break;
      }
      if (pts.length > 2) lines.push(pts);
    }
    return lines;
  }, [q1Micro, q2Micro, x1, x2]);

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      tRef.current = 0;
    }
    if (playing) {
      tRef.current += Math.min(delta, 0.05) * 1.1;
    }

    const px = Math.sin(tRef.current) * 1.1;
    const py = 2.4 + Math.cos(tRef.current * 0.8) * 0.4;
    if (probeRef.current) {
      probeRef.current.position.set(px, py, 0);
    }

    // Approximate E-field at test probe (treating visual separation linearly mapped to r)
    const scaleM = dist / (x2 - x1);
    const rx1 = (px - x1) * scaleM;
    const ry1 = (py - 1.5) * scaleM;
    const r1 = Math.max(0.25, Math.hypot(rx1, ry1));
    const rx2 = (px - x2) * scaleM;
    const ry2 = (py - 1.5) * scaleM;
    const r2 = Math.max(0.25, Math.hypot(rx2, ry2));
    const ex = (K_COULOMB * q1 * rx1) / Math.pow(r1, 3) + (K_COULOMB * q2 * rx2) / Math.pow(r2, 3);
    const ey = (K_COULOMB * q1 * ry1) / Math.pow(r1, 3) + (K_COULOMB * q2 * ry2) / Math.pow(r2, 3);
    const eMag = Math.hypot(ex, ey);

    setPinDisplay(
      pin1Ref.current,
      `F = ${forceN.toFixed(3)} N\n(${
        attractive ? 'Attractive' : q1Micro * q2Micro === 0 ? 'Zero force' : 'Repulsive'
      })`
    );
    setPinDisplay(pinProbeRef.current, `E = ${(eMag / 1000).toFixed(1)} kN/C`);
  });

  const fDir1 = attractive ? 1 : -1;
  const fDir2 = attractive ? -1 : 1;
  const fLen = forceN > 0 ? Math.min(1.6, 0.4 + Math.log10(1 + forceN * 20) * 0.65) : 0;

  return (
    <>
      {fieldLines.map((pts, idx) => (
        <Line key={idx} points={pts} color="#64748b" lineWidth={1.2} />
      ))}

      {/* Charge q1 */}
      <group position={[x1, 1.5, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 28, 28]} />
          <meshStandardMaterial
            color={q1Micro >= 0 ? '#ef4444' : '#0284c7'}
            roughness={0.22}
            metalness={0.35}
          />
        </mesh>
        {fLen > 0.05 && (
          <Arrow3D origin={[0, 0, 0]} direction={[fDir1, 0, 0]} length={fLen} color="#f59e0b" />
        )}
        <PhysicsPin
          position={[0, -0.75, 0]}
          title={`$q_1 = ${q1Micro >= 0 ? '+' : ''}${q1Micro}\\,\\mu\\text{C}$`}
          textRef={pin1Ref}
          valueText={`F=${forceN.toFixed(3)} N`}
          accentClass={q1Micro >= 0 ? 'border-red-400' : 'border-cyan-400'}
        />
      </group>

      {/* Charge q2 */}
      <group position={[x2, 1.5, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 28, 28]} />
          <meshStandardMaterial
            color={q2Micro >= 0 ? '#ef4444' : '#0284c7'}
            roughness={0.22}
            metalness={0.35}
          />
        </mesh>
        {fLen > 0.05 && (
          <Arrow3D origin={[0, 0, 0]} direction={[fDir2, 0, 0]} length={fLen} color="#f59e0b" />
        )}
      </group>

      {/* Moving field test probe */}
      <group ref={probeRef} position={[0, 2.5, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.13, 18, 18]} />
          <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.4} />
        </mesh>
        <PhysicsPin
          position={[0, 0.52, 0]}
          title="$\\vec{E}$-field probe"
          textRef={pinProbeRef}
          valueText="E=0 kN/C"
          accentClass="border-emerald-400"
        />
      </group>
    </>
  );
};

export const CoulombScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [q1, setQ1] = useState(4);
  const [q2, setQ2] = useState(-3);
  const [dist, setDist] = useState(1.2);

  const forceN = (K_COULOMB * Math.abs(q1 * 1e-6 * (q2 * 1e-6))) / (dist * dist);
  const eAtQ2 = (K_COULOMB * Math.abs(q1 * 1e-6)) / (dist * dist);

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0, 2.6, 7.6]}
      cameraTarget={[0, 1.5, 0]}
      controls={
        <>
          <SliderControl
            label="Charge 1 ($q_1$)"
            value={q1}
            min={-6}
            max={6}
            step={1}
            unit="μC"
            onChange={setQ1}
          />
          <SliderControl
            label="Charge 2 ($q_2$)"
            value={q2}
            min={-6}
            max={6}
            step={1}
            unit="μC"
            onChange={setQ2}
          />
          <SliderControl
            label="Separation ($r$)"
            value={dist}
            min={0.5}
            max={3.0}
            step={0.1}
            unit="m"
            onChange={setDist}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Coulomb Force (<MathInline text="$F$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {forceN.toFixed(4)} N
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              <MathInline text="$|\\vec{E}_1|$ at $q_2$" />
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {(eAtQ2 / 1000).toFixed(1)} kN/C
            </p>
          </div>
        </div>
      }
    >
      <CoulombContent
        playing={playing}
        q1Micro={q1}
        q2Micro={q2}
        dist={dist}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default CoulombScene;
