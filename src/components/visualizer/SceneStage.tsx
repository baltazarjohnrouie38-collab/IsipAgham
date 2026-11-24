import React, {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  AlertTriangle,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MathInline } from '../ui/MathText';

export type CameraPreset = 'iso' | 'front' | 'top';

export interface PinDescriptor {
  id: string;
  title: string;
  valueText: string;
  accentClass: string;
  textRef?: React.RefObject<HTMLDivElement | null>;
  onCardMount: (el: HTMLDivElement | null) => void;
}

interface PinOverlayContextValue {
  registerPin: (pin: PinDescriptor) => void;
  unregisterPin: (id: string) => void;
}

const PinOverlayContext = createContext<PinOverlayContextValue | null>(null);

export function usePinOverlay() {
  return useContext(PinOverlayContext);
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<
  { children: React.ReactNode },
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-6 text-center bg-stone-100 dark:bg-[#0d0d0f]">
          <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
            3D WebGL viewport could not initialize on this browser.
          </p>
          <p className="text-xs text-slate-600 dark:text-neutral-400">
            Try closing heavy tabs or reloading the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

let cachedSoftwareGl: boolean | null = null;

function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = false;
    return false;
  }
}

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    if (gl && 'getExtension' in gl) {
      (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    }
    return Boolean(gl);
  } catch {
    return false;
  }
}

const StudioEnvironment: React.FC = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const renderTarget = pmrem.fromScene(roomEnv, 0.04);
    const prevEnv = scene.environment;
    scene.environment = renderTarget.texture;
    if ('environmentIntensity' in scene) {
      (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.72;
    }

    return () => {
      scene.environment = prevEnv;
      renderTarget.dispose();
      roomEnv.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
};

interface CameraRigProps {
  basePosition: [number, number, number];
  baseTarget: [number, number, number];
  command: { preset: CameraPreset; seq: number } | null;
  enableDamping: boolean;
}

const CameraRig: React.FC<CameraRigProps> = ({
  basePosition,
  baseTarget,
  command,
  enableDamping,
}) => {
  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const glideRef = useRef<{
    pos: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    if (!command) return;
    const tx = baseTarget[0];
    const ty = baseTarget[1];
    const tz = baseTarget[2];
    const dx = basePosition[0] - tx;
    const dy = basePosition[1] - ty;
    const dz = basePosition[2] - tz;
    const dist = Math.max(3.5, Math.hypot(dx, dy, dz));

    let nextPos: [number, number, number];
    if (command.preset === 'front') {
      nextPos = [tx, ty + dist * 0.14, tz + dist];
    } else if (command.preset === 'top') {
      nextPos = [tx, ty + dist * 1.12, tz + 0.08];
    } else {
      nextPos = [...basePosition];
    }

    glideRef.current = {
      pos: new THREE.Vector3(...nextPos),
      target: new THREE.Vector3(tx, ty, tz),
    };
  }, [command, basePosition, baseTarget]);

  useFrame((_, delta) => {
    const glide = glideRef.current;
    const orbit = orbitRef.current;
    if (!glide || !orbit) return;

    const dt = Math.min(delta, 0.05);
    const cam = orbit.object;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, glide.pos.x, 7.5, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, glide.pos.y, 7.5, dt);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, glide.pos.z, 7.5, dt);

    orbit.target.x = THREE.MathUtils.damp(orbit.target.x, glide.target.x, 7.5, dt);
    orbit.target.y = THREE.MathUtils.damp(orbit.target.y, glide.target.y, 7.5, dt);
    orbit.target.z = THREE.MathUtils.damp(orbit.target.z, glide.target.z, 7.5, dt);
    orbit.update();

    if (
      cam.position.distanceTo(glide.pos) < 0.02 &&
      orbit.target.distanceTo(glide.target) < 0.02
    ) {
      cam.position.copy(glide.pos);
      orbit.target.copy(glide.target);
      orbit.update();
      glideRef.current = null;
    }
  });

  return (
    <OrbitControls
      ref={orbitRef}
      target={baseTarget}
      enableDamping={enableDamping}
      dampingFactor={0.08}
      minDistance={2.2}
      maxDistance={32}
      onStart={() => {
        glideRef.current = null;
      }}
    />
  );
};

export interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}) => {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-xs font-semibold text-slate-700 dark:text-neutral-200"
        >
          <MathInline text={label} />
        </label>
        <span className="text-xs font-bold text-blue-700 dark:text-blue-400 tabular-nums shrink-0">
          {Number.isInteger(step) ? value : value.toFixed(2)} {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none bg-stone-200 dark:bg-neutral-700 accent-blue-700 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-slate-500 dark:text-neutral-400 tabular-nums">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
};

interface SceneStageProps {
  playing: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  showGrid?: boolean;
  controls: React.ReactNode;
  readout?: React.ReactNode;
  children: React.ReactNode;
}

export const SceneStage: React.FC<SceneStageProps> = ({
  playing,
  onTogglePlay,
  onReset,
  cameraPosition = [6, 4.5, 9],
  cameraTarget = [0, 1, 0],
  showGrid = true,
  controls,
  readout,
  children,
}) => {
  const { darkMode } = useTheme();
  const [webglReady, setWebglReady] = useState(true);
  const [pins, setPins] = useState<PinDescriptor[]>([]);
  const [showPins, setShowPins] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>('iso');
  const [camCommand, setCamCommand] = useState<{ preset: CameraPreset; seq: number } | null>(null);

  const isSoftwareGl = useMemo(() => detectSoftwareGl(), []);

  useEffect(() => {
    setWebglReady(checkWebGLSupport());
  }, []);

  const registerPin = useCallback((pin: PinDescriptor) => {
    setPins((prev) => {
      const idx = prev.findIndex((p) => p.id === pin.id);
      if (idx === -1) return [...prev, pin];
      const next = [...prev];
      next[idx] = pin;
      return next;
    });
  }, []);

  const unregisterPin = useCallback((id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const triggerPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    setCamCommand((prev) => ({ preset, seq: (prev?.seq ?? 0) + 1 }));
  };

  const bgHex = darkMode ? '#0d0d0f' : '#eef2f6';

  return (
    <div className="space-y-4">
      <Card padding="none" className="overflow-hidden">
        <div
          className={`relative w-full bg-stone-100 dark:bg-[#0d0d0f] transition-[height] duration-300 ${
            expanded
              ? 'h-[440px] sm:h-[540px] lg:h-[600px]'
              : 'h-[340px] sm:h-[420px] lg:h-[460px]'
          }`}
        >
          {!webglReady ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-6 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                WebGL is disabled in this browser.
              </p>
              <p className="text-xs text-slate-600 dark:text-neutral-400">
                Enable hardware acceleration or WebGL to view interactive 3D simulations.
              </p>
            </div>
          ) : (
            <PinOverlayContext.Provider value={{ registerPin, unregisterPin }}>
              <CanvasErrorBoundary>
                <Canvas
                  dpr={isSoftwareGl ? 1 : [1, 2]}
                  shadows={!isSoftwareGl}
                  gl={{
                    antialias: !isSoftwareGl,
                    powerPreference: 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.08,
                  }}
                  camera={{ position: cameraPosition, fov: 45, near: 0.1, far: 200 }}
                >
                  <color attach="background" args={[bgHex]} />
                  <fog attach="fog" args={[bgHex, 20, 48]} />
                  <StudioEnvironment />

                  {/* Balanced 3-point warm/cool studio rig */}
                  <hemisphereLight
                    args={[
                      darkMode ? '#e5e5e5' : '#e0f2fe',
                      darkMode ? '#1c1c1e' : '#d6d3d1',
                      darkMode ? 0.55 : 0.72,
                    ]}
                  />
                  <directionalLight
                    position={[9, 14, 9]}
                    intensity={1.35}
                    color="#fff7ed"
                    castShadow={!isSoftwareGl}
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                    shadow-camera-near={1}
                    shadow-camera-far={40}
                    shadow-camera-left={-9}
                    shadow-camera-right={9}
                    shadow-camera-top={9}
                    shadow-camera-bottom={-9}
                    shadow-bias={-0.0005}
                    shadow-normalBias={0.02}
                  />
                  <directionalLight
                    position={[-7, 6, -7]}
                    intensity={0.55}
                    color={darkMode ? '#d4d4d8' : '#60a5fa'}
                  />

                  {showGrid && (
                    <>
                      <mesh
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0, -0.008, 0]}
                        receiveShadow
                      >
                        <planeGeometry args={[48, 48]} />
                        <shadowMaterial transparent opacity={darkMode ? 0.28 : 0.14} />
                      </mesh>
                      <Grid
                        position={[0, 0, 0]}
                        args={[24, 24]}
                        cellSize={1}
                        cellThickness={0.6}
                        cellColor={darkMode ? '#222226' : '#cbd5e1'}
                        sectionSize={5}
                        sectionThickness={1}
                        sectionColor={darkMode ? '#38383e' : '#94a3b8'}
                        fadeDistance={28}
                        infiniteGrid
                      />
                    </>
                  )}

                  {children}

                  <CameraRig
                    basePosition={cameraPosition}
                    baseTarget={cameraTarget}
                    command={camCommand}
                    enableDamping={!isSoftwareGl}
                  />
                </Canvas>
              </CanvasErrorBoundary>

              {/* React-native 2D overlay layer for KaTeX-rendered pinned equations (avoids @react-three/drei Html createRoot/unmount conflicts in React 19) */}
              <div
                className={`pointer-events-none absolute inset-0 overflow-hidden z-10 transition-opacity duration-200 ${
                  showPins ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {pins.map((pin) => (
                  <div
                    key={pin.id}
                    ref={pin.onCardMount}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      opacity: 0,
                      willChange: 'transform',
                    }}
                    className={`rounded-xl border-2 ${pin.accentClass} bg-neutral-950/92 px-2.5 py-1.5 text-left shadow-md whitespace-nowrap select-none`}
                  >
                    <div className="text-[11px] font-semibold text-blue-300 leading-tight mb-0.5">
                      <MathInline text={pin.title} />
                    </div>
                    <div
                      ref={pin.textRef}
                      className="text-[11px] font-semibold text-white tabular-nums leading-snug whitespace-pre"
                    >
                      {pin.valueText}
                    </div>
                  </div>
                ))}
              </div>
            </PinOverlayContext.Provider>
          )}
        </div>

        <div className="border-t border-stone-200 dark:border-neutral-800 px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#141416]">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={playing ? 'secondary' : 'primary'}
              size="sm"
              onClick={onTogglePlay}
              icon={
                playing ? (
                  <Pause className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )
              }
            >
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            >
              Reset Sim
            </Button>

            {/* Camera view presets */}
            <div
              className="inline-flex items-center rounded-xl border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-950 p-0.5"
              role="group"
              aria-label="Camera views"
            >
              <Camera className="h-3.5 w-3.5 text-slate-500 dark:text-neutral-400 mx-1.5" aria-hidden="true" />
              {(
                [
                  { id: 'iso', label: 'Iso' },
                  { id: 'front', label: 'Front' },
                  { id: 'top', label: 'Top' },
                ] as const
              ).map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => triggerPreset(view.id)}
                  className={`min-h-[32px] px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activePreset === view.id
                      ? 'bg-blue-700 text-white dark:bg-blue-600'
                      : 'text-slate-600 dark:text-neutral-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPins((v) => !v)}
              icon={
                showPins ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )
              }
            >
              {showPins ? 'Hide Pins' : 'Show Pins'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              icon={
                expanded ? (
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                )
              }
            >
              {expanded ? 'Compact' : 'Expand'}
            </Button>
            <span className="hidden xl:inline text-xs text-slate-500 dark:text-neutral-400 pl-1">
              Drag to orbit • Scroll to zoom
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
            Simulation Parameters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{controls}</div>
        </Card>

        {readout && (
          <Card className="lg:col-span-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              Live Calculated Values
            </h3>
            {readout}
          </Card>
        )}
      </div>
    </div>
  );
};
