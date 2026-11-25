import React, { useMemo } from 'react';
import * as THREE from 'three';

interface Arrow3DProps {
  origin?: [number, number, number];
  direction: [number, number, number];
  length?: number;
  color?: string;
  radius?: number;
}

const UP = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const UNIT_SHAFT_GEO = new THREE.CylinderGeometry(1, 1, 1, 10);
const UNIT_HEAD_GEO = new THREE.ConeGeometry(2.5, 1, 12);

export const Arrow3D: React.FC<Arrow3DProps> = ({
  origin = [0, 0, 0],
  direction,
  length = 1.5,
  color = '#2563eb',
  radius = 0.04,
}) => {
  const { quaternion, clampedLen } = useMemo(() => {
    _dir.set(direction[0], direction[1], direction[2]);
    const mag = _dir.length();
    if (mag < 1e-5 || length <= 0.05) {
      return { quaternion: new THREE.Quaternion(), clampedLen: 0 };
    }
    _dir.normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, _dir);
    return { quaternion: quat, clampedLen: Math.min(8, Math.max(0.15, length)) };
  }, [direction[0], direction[1], direction[2], length]);

  if (clampedLen <= 0.05) return null;

  const headLen = Math.min(0.32, clampedLen * 0.32);
  const shaftLen = Math.max(0.05, clampedLen - headLen);

  return (
    <group position={origin} quaternion={quaternion}>
      <mesh
        geometry={UNIT_SHAFT_GEO}
        position={[0, shaftLen / 2, 0]}
        scale={[radius, shaftLen, radius]}
      >
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh
        geometry={UNIT_HEAD_GEO}
        position={[0, shaftLen + headLen / 2, 0]}
        scale={[radius, headLen, radius]}
      >
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
      </mesh>
    </group>
  );
};
