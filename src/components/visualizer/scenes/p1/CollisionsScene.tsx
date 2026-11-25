import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneStage, SliderControl } from '../../SceneStage';
import { Arrow3D } from '../../Arrow3D';
import { PhysicsPin, setPinDisplay } from '../../PhysicsPin';
import { MathInline } from '../../../ui/MathText';
import type { SceneComponentProps } from '../../scenesCatalog';

const CollisionsContent: React.FC<{
  playing: boolean;
  elastic: boolean;
  m1: number;
  m2: number;
  v1Init: number;
  v2Init: number;
  resetSignal: number;
}> = ({ playing, elastic, m1, m2, v1Init, v2Init, resetSignal }) => {
  const cart1Ref = useRef<THREE.Group>(null);
  const cart2Ref = useRef<THREE.Group>(null);
  const pin1Ref = useRef<HTMLDivElement>(null);
  const pin2Ref = useRef<HTMLDivElement>(null);

  const stateRef = useRef({
    x1: -2.8,
    x2: 2.8,
    v1: v1Init,
    v2: v2Init,
    collided: false,
    pauseAfter: 0,
  });
  const lastResetRef = useRef(resetSignal);

  const size1 = 0.55 + Math.min(0.45, m1 * 0.045);
  const size2 = 0.55 + Math.min(0.45, m2 * 0.045);

  const resetCarts = () => {
    stateRef.current = {
      x1: -2.8,
      x2: 2.8,
      v1: v1Init,
      v2: v2Init,
      collided: false,
      pauseAfter: 0,
    };
  };

  useFrame((_, delta) => {
    if (lastResetRef.current !== resetSignal) {
      lastResetRef.current = resetSignal;
      resetCarts();
    }

    const st = stateRef.current;
    if (playing) {
      const dt = Math.min(delta, 0.04) * 0.55;
      st.x1 += st.v1 * dt;
      st.x2 += st.v2 * dt;

      const minGap = (size1 + size2) / 2;
      if (!st.collided && st.x2 - st.x1 <= minGap) {
        st.collided = true;
        const overlap = minGap - (st.x2 - st.x1);
        st.x1 -= overlap / 2;
        st.x2 += overlap / 2;

        if (elastic) {
          const nextV1 = ((m1 - m2) * st.v1 + 2 * m2 * st.v2) / (m1 + m2);
          const nextV2 = ((m2 - m1) * st.v2 + 2 * m1 * st.v1) / (m1 + m2);
          st.v1 = nextV1;
          st.v2 = nextV2;
        } else {
          const commonV = (m1 * st.v1 + m2 * st.v2) / (m1 + m2);
          st.v1 = commonV;
          st.v2 = commonV;
        }
      }

      if (Math.abs(st.x1) > 4.8 || Math.abs(st.x2) > 4.8) {
        st.pauseAfter += dt;
        if (st.pauseAfter > 0.6) {
          resetCarts();
        }
      }
    }

    if (cart1Ref.current) {
      cart1Ref.current.position.set(st.x1, size1 / 2 + 0.14, 0);
    }
    if (cart2Ref.current) {
      cart2Ref.current.position.set(st.x2, size2 / 2 + 0.14, 0);
    }

    setPinDisplay(
      pin1Ref.current,
      `m_1=${m1} kg  v_1=${st.v1.toFixed(2)} m/s\np_1=${(m1 * st.v1).toFixed(1)} kg·m/s`
    );
    setPinDisplay(
      pin2Ref.current,
      `m_2=${m2} kg  v_2=${st.v2.toFixed(2)} m/s\np_2=${(m2 * st.v2).toFixed(1)} kg·m/s`
    );
  });

  return (
    <>
      {/* Low-friction track */}
      <mesh position={[0, 0.07, 0]} receiveShadow>
        <boxGeometry args={[10.5, 0.14, 1.4]} />
        <meshStandardMaterial color="#334155" roughness={0.55} metalness={0.25} />
      </mesh>

      <group ref={cart1Ref} position={[-2.8, size1 / 2 + 0.14, 0]}>
        <mesh castShadow>
          <boxGeometry args={[size1, size1, size1]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.3} metalness={0.25} />
        </mesh>
        <Arrow3D
          origin={[0, size1 / 2 + 0.15, 0]}
          direction={[v1Init >= 0 ? 1 : -1, 0, 0]}
          length={Math.max(0.4, Math.abs(v1Init) * 0.25)}
          color="#3b82f6"
        />
        <PhysicsPin
          position={[0, size1 + 0.55, 0]}
          title="Cart 1: $p_1 = m_1 v_1$"
          textRef={pin1Ref}
          valueText={`p_1=${(m1 * v1Init).toFixed(1)}`}
          accentClass="border-blue-400"
        />
      </group>

      <group ref={cart2Ref} position={[2.8, size2 / 2 + 0.14, 0]}>
        <mesh castShadow>
          <boxGeometry args={[size2, size2, size2]} />
          <meshStandardMaterial color="#ea580c" roughness={0.3} metalness={0.25} />
        </mesh>
        <Arrow3D
          origin={[0, size2 / 2 + 0.15, 0]}
          direction={[v2Init >= 0 ? 1 : -1, 0, 0]}
          length={Math.max(0.4, Math.abs(v2Init) * 0.25)}
          color="#fb923c"
        />
        <PhysicsPin
          position={[0, size2 + 0.55, 0]}
          title="Cart 2: $p_2 = m_2 v_2$"
          textRef={pin2Ref}
          valueText={`p_2=${(m2 * v2Init).toFixed(1)}`}
          accentClass="border-orange-400"
        />
      </group>
    </>
  );
};

export const CollisionsScene: React.FC<SceneComponentProps> = () => {
  const [playing, setPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [elastic, setElastic] = useState(true);
  const [m1, setM1] = useState(4);
  const [m2, setM2] = useState(2);
  const [v1, setV1] = useState(4);
  const [v2, setV2] = useState(-3);

  const totalP = m1 * v1 + m2 * v2;
  const v1After = elastic
    ? ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2)
    : totalP / (m1 + m2);
  const v2After = elastic
    ? ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2)
    : totalP / (m1 + m2);

  return (
    <SceneStage
      playing={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
      onReset={() => setResetSignal((n) => n + 1)}
      cameraPosition={[0, 3.2, 8.8]}
      cameraTarget={[0, 0.8, 0]}
      controls={
        <>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200 mr-2">
              Collision Type:
            </span>
            <button
              type="button"
              onClick={() => {
                setElastic(true);
                setResetSignal((n) => n + 1);
              }}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                elastic
                  ? 'bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-600'
                  : 'bg-[#FAF9F6] dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 border-stone-200 dark:border-neutral-700'
              }`}
            >
              Elastic (KE Conserved)
            </button>
            <button
              type="button"
              onClick={() => {
                setElastic(false);
                setResetSignal((n) => n + 1);
              }}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                !elastic
                  ? 'bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-600'
                  : 'bg-[#FAF9F6] dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 border-stone-200 dark:border-neutral-700'
              }`}
            >
              Completely Inelastic (Stick Together)
            </button>
          </div>
          <SliderControl
            label="Mass 1 ($m_1$)"
            value={m1}
            min={1}
            max={10}
            step={1}
            unit="kg"
            onChange={(v) => {
              setM1(v);
              setResetSignal((n) => n + 1);
            }}
          />
          <SliderControl
            label="Mass 2 ($m_2$)"
            value={m2}
            min={1}
            max={10}
            step={1}
            unit="kg"
            onChange={(v) => {
              setM2(v);
              setResetSignal((n) => n + 1);
            }}
          />
          <SliderControl
            label="Initial Velocity 1 ($v_1$)"
            value={v1}
            min={1}
            max={7}
            step={0.5}
            unit="m/s"
            onChange={(v) => {
              setV1(v);
              setResetSignal((n) => n + 1);
            }}
          />
          <SliderControl
            label="Initial Velocity 2 ($v_2$)"
            value={v2}
            min={-7}
            max={0}
            step={0.5}
            unit="m/s"
            onChange={(v) => {
              setV2(v);
              setResetSignal((n) => n + 1);
            }}
          />
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Total Momentum (<MathInline text="$p_{\\text{total}}$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {totalP.toFixed(1)} kg·m/s
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 p-3 border border-stone-200 dark:border-neutral-800">
            <p className="text-slate-500 dark:text-neutral-400">
              Final Velocities (<MathInline text="$v_1',\,v_2'$" />)
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
              {v1After.toFixed(2)}, {v2After.toFixed(2)} m/s
            </p>
          </div>
        </div>
      }
    >
      <CollisionsContent
        playing={playing}
        elastic={elastic}
        m1={m1}
        m2={m2}
        v1Init={v1}
        v2Init={v2}
        resetSignal={resetSignal}
      />
    </SceneStage>
  );
};

export default CollisionsScene;
