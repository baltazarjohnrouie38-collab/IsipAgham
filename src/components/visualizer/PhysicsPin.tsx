import React, { useCallback, useEffect, useId, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePinOverlay } from './SceneStage';

interface PhysicsPinProps {
  position?: [number, number, number];
  title: string;
  textRef?: React.RefObject<HTMLDivElement | null>;
  valueText?: string;
  accentClass?: string;
}

const _worldPos = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _toAnchor = new THREE.Vector3();

const pinCache = new WeakMap<HTMLElement, { lastTime: number; lastText: string }>();

/**
 * Safely renders formatted physics readout lines into a PhysicsPin DOM container
 * with proper mathematical subscripts/superscripts (no raw ASCII `_` or `^` typed formulas)
 * and throttles DOM mutations to ~10 Hz so 60fps simulation loops stay lag-free.
 */
export function setPinDisplay(el: HTMLDivElement | null, rawText: string, force = false): void {
  if (!el) return;
  const now = performance.now();
  const prev = pinCache.get(el);
  if (!force && prev) {
    if (prev.lastText === rawText) return;
    if (now - prev.lastTime < 95) return;
  }
  pinCache.set(el, { lastTime: now, lastText: rawText });

  const frag = document.createDocumentFragment();
  const lines = rawText.split('\n');

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) {
      frag.appendChild(document.createElement('br'));
    }

    // Parse tokens like `v_x`, `a_c`, `F_B`, `R_eq`, `m/s^2`, `10^-7`, `F_∥`, `f_s`, `I_tot`
    const tokenRe = /([A-Za-zΔΦεταωθμρ]+)_([A-Za-z0-9,∥]+)|\^(\{-?\d+\}|-?\d+)/g;
    let last = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRe.exec(line)) !== null) {
      if (match.index > last) {
        frag.appendChild(document.createTextNode(line.slice(last, match.index)));
      }
      if (match[1] && match[2]) {
        const base = document.createElement('i');
        base.className = 'not-italic font-semibold';
        base.textContent = match[1];
        const sub = document.createElement('sub');
        sub.className = 'text-[9px] leading-none';
        sub.textContent = match[2];
        frag.appendChild(base);
        frag.appendChild(sub);
      } else if (match[3]) {
        const sup = document.createElement('sup');
        sup.className = 'text-[9px] leading-none';
        sup.textContent = match[3].replace(/[{}]/g, '');
        frag.appendChild(sup);
      }
      last = tokenRe.lastIndex;
    }

    if (last < line.length) {
      frag.appendChild(document.createTextNode(line.slice(last)));
    }
  });

  el.replaceChildren(frag);
}

export const PhysicsPin: React.FC<PhysicsPinProps> = ({
  position = [0, 0.9, 0],
  title,
  textRef,
  valueText = '',
  accentClass = 'border-blue-500',
}) => {
  const id = useId();
  const overlay = usePinOverlay();
  const anchorRef = useRef<THREE.Group>(null);
  const cardElRef = useRef<HTMLDivElement | null>(null);
  const lastTransformRef = useRef<{ x: number; y: number; visible: boolean }>({
    x: -9999,
    y: -9999,
    visible: false,
  });

  const handleCardMount = useCallback((el: HTMLDivElement | null) => {
    cardElRef.current = el;
    lastTransformRef.current = { x: -9999, y: -9999, visible: false };
  }, []);

  useEffect(() => {
    if (!overlay) return;
    overlay.registerPin({
      id,
      title,
      valueText,
      accentClass,
      textRef,
      onCardMount: handleCardMount,
    });
  }, [overlay, id, title, valueText, accentClass, textRef, handleCardMount]);

  useEffect(() => {
    if (!overlay) return;
    return () => {
      overlay.unregisterPin(id);
    };
  }, [overlay, id]);

  useFrame(({ camera, size }) => {
    const anchor = anchorRef.current;
    const card = cardElRef.current;
    if (!anchor || !card) return;

    _worldPos.setFromMatrixPosition(anchor.matrixWorld);
    _camPos.setFromMatrixPosition(camera.matrixWorld);
    _toAnchor.copy(_worldPos).sub(_camPos);
    camera.getWorldDirection(_camDir);

    const inFront = _toAnchor.dot(_camDir) > 0;
    _worldPos.project(camera);

    const x = (_worldPos.x * 0.5 + 0.5) * size.width;
    const y = (-_worldPos.y * 0.5 + 0.5) * size.height;

    const visible =
      inFront &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= -60 &&
      x <= size.width + 60 &&
      y >= -40 &&
      y <= size.height + 40;

    const last = lastTransformRef.current;
    if (visible !== last.visible) {
      card.style.opacity = visible ? '1' : '0';
      last.visible = visible;
    }

    if (visible && (Math.abs(x - last.x) >= 0.4 || Math.abs(y - last.y) >= 0.4)) {
      card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      last.x = x;
      last.y = y;
    }
  });

  return <group ref={anchorRef} position={position} />;
};
