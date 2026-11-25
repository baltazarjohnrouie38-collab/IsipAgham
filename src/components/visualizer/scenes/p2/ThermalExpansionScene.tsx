import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const ThermalContent: React.FC<{
  playing: boolean;
  deltaT: number;
  l0: number;
  alphaMicro: number;
  resetSignal: number;
}> = ({ playing, deltaT, l0, alphaMicro, resetSignal }) => {
  const rodRef = useRef<THREE.Mesh>(null);
  const tipGroupRef = useRef<THREE.Group>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const lastResetRef = useRef(resetSignal);

  const alpha = alphaMicro * 1e-6;
  const kThermal = alphaMicro <= 12 ? 50 : alphaMicro <= 18 ? 385 : 205; // Steel, Copper, Aluminum approx W/m·K
  const area = 0.002; // 20 cm² cross-section
  const baseVisualLen = 3.2 + (l0 - 1) * 0.45;
  const leftX = -2.4;

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      progressRef.current = 0;
    }
    if (playing) {
      progressRef.current = Math.min(1, progressRef.current + Math.min(delta, 0.05) * 0.45);
    } else if (progressRef.current === 0) {
      progressRef.current = 1;
    }

    const currentDT = deltaT * progressRef.current;
    const deltaLMm = alpha * l0 * currentDT * 1000;
    const heatRate = (kThermal * area * currentDT) / l0;

    // Exaggerate visual expansion so Grade 12 students clearly see ΔL
    const visualExtra = Math.min(1.4, (deltaLMm / 25) * 0.85);
    const totalVisualLen = baseVisualLen + visualExtra;

    if (rodRef.current) {
      rodRef.current.scale.x = totalVisualLen / baseVisualLen;
      rodRef.current.position.x = leftX + totalVisualLen / 2;
      const mat = rodRef.current.material as THREE.MeshStandardMaterial;
      const heatRatio = Math.min(1, currentDT / 400);
      mat.color.setRGB(0.35 + 0.62 * heatRatio, 0.45 - 0.15 * heatRatio, 0.58 - 0.42 * heatRatio);
    }

    if (tipGroupRef.current) {
      tipGroupRef.current.position.set(leftX + totalVisualLen, 1.4, 0);
    }

    setPinDisplay(
      pinRef.current,
      `ΔL=${deltaLMm.toFixed(2)} mm  (ΔT=${currentDT.toFixed(0)}°C)\nH = kAΔT/L = ${heatRate.toFixed(1)} W`
    );
  });

  return (
    <>
      {/* Fixed anchor wall on left */}
      <mesh position={[leftX - 0.25, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 2.2, 1.6]} />
        <meshStandardMaterial color="#334155" metalness={0.35} roughness={0.55} />
      </mesh>

      {/* Burner flame base under the rod */}
      <mesh position={[leftX + baseVisualLen * 0.45, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.55, 0.5, 20]} />
        <meshStandardMaterial color="#475569" metalness={0.55} roughness={0.35} />
      </mesh>
      {deltaT > 5 && (
        <mesh position={[leftX + baseVisualLen * 0.45, 0.78, 0]}>
          <coneGeometry args={[0.25, 0.48, 16]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.95} />
        </mesh>
      )}

      {/* Expanding metal rod */}
      <mesh ref={rodRef} position={[leftX + baseVisualLen / 2, 1.4, 0]} castShadow>
        <boxGeometry args={[baseVisualLen, 0.36, 0.36]} />
        <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.28} />
      </mesh>

      {/* Moving tip marker & pinned equation */}
      <group ref={tipGroupRef} position={[leftX + baseVisualLen, 1.4, 0]}>
        <mesh>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.25} />
        </mesh>
        <PhysicsPin
          position={[0.2, 0.85, 0]}
          title="$\\Delta L = \\alpha L_0 \\Delta T$"
          textRef={pinRef}
          valueText={`ΔT=${deltaT}°C`}
          accentClass="border-orange-400"
        />
      </group>
    </>
  );
};

export const ThermalExpansionScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [deltaT, setDeltaT] = useState(220);
  const [l0, setL0] = useState(2.5);
  const [alphaMicro, setAlphaMicro] = useState(17);

  const deltaLMm = alphaMicro * 1e-6 * l0 * deltaT * 1000;
  const kThermal = alphaMicro <= 12 ? 50 : alphaMicro <= 18 ? 385 : 205;
  const heatRate = (kThermal * 0.002 * deltaT) / l0;

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0.4, 2.8, 7.6]}
      cameraTarget={[0.2, 1.3, 0]}
      controls={
        <>
          <SliderControl
            label="Temp Change ($\\Delta T$)"
            value={deltaT}
            min={0}
            max={400}
            step={10}
            unit="°C"
            onChange={(v) => {
              setDeltaT(v);
              setResetSignal((n) => n + 1);
            }}
          />
          <SliderControl
            label="Initial Length ($L_0$)"
            value={l0}
            min={1}
            max={5}
            step={0.5}
            unit="m"
            onChange={setL0}
          />
          <SliderControl
            label="Coeff ($\\alpha \\times 10^{-6}$)"
            value={alphaMicro}
            min={11}
            max={24}
            step={1}
            unit="K⁻¹"
            onChange={setAlphaMicro}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Expansion (<MathInline text="$\\Delta L$" />)
            </p>
            <p className="text-base font-bold text-orange-600 dark:text-orange-400">
              {deltaLMm.toFixed(2)} mm
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Conduction (<MathInline text="$H = Q/t$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {heatRate.toFixed(1)} W
            </p>
          </div>
        </div>
      }
    >
      <ThermalContent
        playing={playing}
        deltaT={deltaT}
        l0={l0}
        alphaMicro={alphaMicro}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default ThermalExpansionScene;
