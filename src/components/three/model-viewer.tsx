"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { EdgesGeometry, Vector3, type BufferGeometry, type PerspectiveCamera } from "three";

const S = 0.01;

function Frame({ geometry }: { geometry: BufferGeometry }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    geometry.computeBoundingSphere();
    const r = (geometry.boundingSphere?.radius ?? 100) * S;
    const c = geometry.boundingSphere?.center ?? new Vector3();
    const fovV = (camera.fov * Math.PI) / 180;
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (size.width / Math.max(1, size.height)));
    const dist = (r / Math.sin(Math.min(fovV, fovH) / 2)) * 1.1;
    const target = new Vector3(c.x * S, c.y * S, c.z * S);
    camera.position.copy(new Vector3(0.75, 0.6, 1).normalize().multiplyScalar(dist).add(target));
    camera.lookAt(target);
    invalidate();
  }, [geometry, camera, size, invalidate]);
  return null;
}

export function ModelViewer({ geometry, label }: { geometry: BufferGeometry; label: string }) {
  const edges = useMemo(() => new EdgesGeometry(geometry, 12), [geometry]);
  useEffect(() => () => edges.dispose(), [edges]);
  return (
    <div className="size-full" role="img" aria-label={label}>
      <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [3, 2.4, 3.6], fov: 35, near: 0.01, far: 200 }}>
        <hemisphereLight args={["#fff8ee", "#7a6a58", 0.9]} />
        <directionalLight position={[3, 6, 4]} intensity={1.5} />
        <Environment resolution={64} frames={1}>
          <Lightformer form="rect" intensity={2} position={[0, 5, -2]} scale={[8, 4, 1]} />
        </Environment>
        <group scale={S}>
          <mesh geometry={geometry}>
            <meshStandardMaterial color="#c99b67" roughness={0.9} flatShading />
          </mesh>
          <lineSegments geometry={edges}>
            <lineBasicMaterial color="#5b3d22" />
          </lineSegments>
        </group>
        <ContactShadows opacity={0.4} scale={8} blur={2.2} far={4} resolution={512} color="#3b2a1a" />
        <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.495} />
        <Frame geometry={geometry} />
      </Canvas>
    </div>
  );
}
