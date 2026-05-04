'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/** Slow orbit for polish; avoids OrbitControls (keeps clicks from being captured). */
function GentleSpin({ children }: { children: React.ReactNode }) {
  const grp = useRef<THREE.Group>(null);
  useFrame((_state, dt) => {
    if (grp.current) {
      grp.current.rotation.y += dt * 0.22;
    }
  });
  return <group ref={grp}>{children}</group>;
}

function ModelFromUrlInner({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const sceneClone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return (
    <GentleSpin>
      <Center>
        <primitive object={sceneClone} />
      </Center>
    </GentleSpin>
  );
}

export function CompanionViewerCanvas({ url }: { url: string }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, stencil: false, depth: true }}
      style={{ pointerEvents: 'none' }}
      camera={{ position: [0.15, 0.35, 2.05], fov: 42, near: 0.1, far: 40 }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 8, 5]} intensity={1} />
      <directionalLight position={[-4, 2, -2]} intensity={0.35} />
      <Suspense fallback={null}>
        <ModelFromUrlInner url={url} />
      </Suspense>
    </Canvas>
  );
}
