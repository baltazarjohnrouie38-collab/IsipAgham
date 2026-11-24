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

  const handleCardMount = useCallback((el: HTMLDivElement | null) => {
    cardElRef.current = el;
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

    camera.updateMatrixWorld();
    anchor.updateWorldMatrix(true, false);

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

    if (visible) {
      card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      card.style.opacity = '1';
    } else {
      card.style.opacity = '0';
    }
  });

  return <group ref={anchorRef} position={position} />;
};
