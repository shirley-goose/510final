'use client';

import { Suspense, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { BehaviorAnimParams, BehaviorMode } from '@/lib/companion-overlay/behavior';
import type { CompanionPersonality } from '@/lib/companion-overlay/personalities';

type CompanionViewerCanvasProps = {
  url: string;
  personality: CompanionPersonality;
  behaviorRef: MutableRefObject<BehaviorMode>;
  velocityRef: MutableRefObject<{ x: number; y: number }>;
  animParamsRef: MutableRefObject<BehaviorAnimParams>;
};

const animParamsFallback: BehaviorAnimParams = {
  followSmoothness: 1.4,
  idleAfterStillMs: 480,
  idleSwayScale: 1,
  idleSpeed: 1,
  followLeanScale: 1,
  playfulFlourishChance: 0,
  walkChance: 0.003,
  chaseTailChance: 0.003,
  rollChance: 0.002,
};

const velScratch = new THREE.Vector2();

function AnimatedModelInner({
  url,
  personality,
  behaviorRef,
  velocityRef,
  animParamsRef,
}: CompanionViewerCanvasProps) {
  const gltf = useGLTF(url);
  const sceneClone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const group = useRef<THREE.Group>(null);

  const smoothRot = useRef({ x: 0, y: 0, z: 0 });
  const smoothScale = useRef(1);
  const flourishY = useRef(0);
  const idlePhase = useRef(Math.random() * Math.PI * 2);
  const playfulAcc = useRef(0);
  const sleepBlend = useRef(0);
  // Accumulators for autonomous behaviors
  const spinY = useRef(0);
  const rollAcc = useRef(0);

  useFrame((_state, dt) => {
    const g = group.current;
    if (!g) return;

    const mode = behaviorRef.current;
    const vel = velocityRef.current;
    const anim = animParamsRef.current ?? animParamsFallback;

    idlePhase.current += dt * anim.idleSpeed;
    const t = idlePhase.current;

    velScratch.set(vel.x, vel.y);
    const speed = velScratch.length();
    const nlx = speed > 1e-4 ? vel.x / speed : 0;

    // --- Chase tail: fast spin in place ---
    if (mode === 'chase-tail') {
      spinY.current += dt * 8.5;
      smoothRot.current.x += (Math.sin(t * 4) * 0.12 - smoothRot.current.x) * Math.min(1, 8 * dt);
      smoothRot.current.y = spinY.current;
      smoothRot.current.z += (Math.sin(t * 3.5) * 0.08 - smoothRot.current.z) * Math.min(1, 8 * dt);
      smoothScale.current += (1 + Math.sin(t * 7) * 0.04 - smoothScale.current) * Math.min(1, 8 * dt);
      g.rotation.set(smoothRot.current.x, smoothRot.current.y, smoothRot.current.z);
      g.scale.setScalar(smoothScale.current);
      g.position.y = Math.sin(t * 6) * 0.04;
      return;
    }
    // Sync spin accumulator so re-entering chase-tail doesn't snap
    spinY.current = smoothRot.current.y;

    // --- Roll: tilt and tumble ---
    if (mode === 'roll') {
      rollAcc.current += dt * 2.2;
      const targetX = Math.sin(rollAcc.current * 0.7 + 0.5) * 0.45;
      const targetZ = Math.sin(rollAcc.current) * 0.9;
      const targetScale = 1 - Math.abs(Math.sin(rollAcc.current)) * 0.12;
      smoothRot.current.x += (targetX - smoothRot.current.x) * Math.min(1, 6 * dt);
      smoothRot.current.y += (0 - smoothRot.current.y) * Math.min(1, 4 * dt);
      smoothRot.current.z += (targetZ - smoothRot.current.z) * Math.min(1, 6 * dt);
      smoothScale.current += (targetScale - smoothScale.current) * Math.min(1, 5 * dt);
      g.rotation.set(smoothRot.current.x, smoothRot.current.y, smoothRot.current.z);
      g.scale.setScalar(smoothScale.current);
      g.position.y = -Math.abs(Math.sin(rollAcc.current)) * 0.08;
      return;
    }
    rollAcc.current = 0;

    // --- Seek user: excited rush toward cursor ---
    if (mode === 'seek-user') {
      const followLean = THREE.MathUtils.clamp(-nlx * 0.55 * anim.followLeanScale, -0.45, 0.45);
      const targetX = Math.sin(t * 3.2) * 0.08;
      const targetY = Math.sin(t * 9) * 0.15;
      const targetZ = followLean + Math.sin(t * 4) * 0.1;
      const k = 12;
      smoothRot.current.x += (targetX - smoothRot.current.x) * Math.min(1, k * dt);
      smoothRot.current.y += (targetY - smoothRot.current.y) * Math.min(1, k * dt);
      smoothRot.current.z += (targetZ - smoothRot.current.z) * Math.min(1, k * dt);
      smoothScale.current += (1.05 - smoothScale.current) * Math.min(1, 5 * dt);
      g.rotation.set(smoothRot.current.x, smoothRot.current.y, smoothRot.current.z);
      g.scale.setScalar(smoothScale.current);
      g.position.y = Math.sin(t * 5.5) * 0.035;
      return;
    }

    // --- Walk: gait animation while moving to target ---
    if (mode === 'walk') {
      const followLean = THREE.MathUtils.clamp(-nlx * 0.42 * anim.followLeanScale, -0.32, 0.32);
      const targetX = Math.sin(t * 4.2 + 0.8) * 0.06;
      const targetY = Math.sin(t * 2.8) * 0.04;
      const targetZ = followLean + Math.sin(t * 2.1) * 0.18 * anim.idleSwayScale;
      const k = 8;
      smoothRot.current.x += (targetX - smoothRot.current.x) * Math.min(1, k * dt);
      smoothRot.current.y += (targetY - smoothRot.current.y) * Math.min(1, k * dt);
      smoothRot.current.z += (targetZ - smoothRot.current.z) * Math.min(1, k * dt);
      smoothScale.current += (1 - smoothScale.current) * Math.min(1, 5 * dt);
      g.rotation.set(smoothRot.current.x, smoothRot.current.y, smoothRot.current.z);
      g.scale.setScalar(smoothScale.current);
      g.position.y = Math.sin(t * 4.2) * 0.025;
      return;
    }

    // --- Follow / Idle / Sleep ---
    const followLean =
      mode === 'follow'
        ? THREE.MathUtils.clamp(-nlx * 0.42 * anim.followLeanScale, -0.32, 0.32)
        : 0;

    const sway =
      anim.idleSwayScale *
      ((mode === 'idle' ? 1 : mode === 'follow' ? 0.28 : 0.12) * Math.sin(t * 1.05) +
        0.5 * Math.sin(t * 0.71 + 0.9));
    const breathe = anim.idleSwayScale * Math.sin(t * 1.92 + 1.3) * 0.035;
    const bob = anim.idleSwayScale * Math.sin(t * 1.41) * (mode === 'sleep' ? 0.006 : 0.018);

    if (personality === 'playful' && mode === 'idle' && anim.playfulFlourishChance > 0) {
      playfulAcc.current += dt;
      const period = 5.2 + Math.sin(t * 0.41) * 1.85;
      if (playfulAcc.current >= period) {
        playfulAcc.current = 0;
        if (Math.random() < anim.playfulFlourishChance * period * 4.5) {
          // Wrap to prevent float growth
          flourishY.current = (flourishY.current + Math.PI * 2 + (Math.random() - 0.5) * 0.45) % (Math.PI * 20);
        }
      }
    } else {
      playfulAcc.current = 0;
    }

    const targetSleep = mode === 'sleep' ? 1 : 0;
    sleepBlend.current += (targetSleep - sleepBlend.current) * Math.min(1, dt * 3.2);
    const sleepAmt = sleepBlend.current;

    const swayDamp = THREE.MathUtils.lerp(1, 0.2, sleepAmt);
    const targetX = swayDamp * (breathe + Math.sin(t * 0.6) * 0.04 * (1 - sleepAmt)) - sleepAmt * 0.38;
    const targetY =
      flourishY.current +
      swayDamp *
        ((mode === 'follow' ? 0.06 * Math.sin(t * 3.8) : 0.035 * Math.sin(t * 1.03)) - sleepAmt * 0.06);
    const targetZ = swayDamp * sway + followLean - sleepAmt * 0.12;
    const targetScale = THREE.MathUtils.lerp(1 + breathe * 0.012, 0.93, sleepAmt);

    const k =
      sleepAmt > 0.92 ? 3.6 : sleepAmt > 0.06 ? (mode === 'follow' ? 10 : 5.2) : mode === 'follow' ? 10 : 5.5;

    smoothRot.current.x += (targetX - smoothRot.current.x) * Math.min(1, k * dt);
    smoothRot.current.y += (targetY - smoothRot.current.y) * Math.min(1, k * dt);
    smoothRot.current.z += (targetZ - smoothRot.current.z) * Math.min(1, k * dt);
    smoothScale.current += (targetScale - smoothScale.current) * Math.min(1, 5 * dt);

    g.rotation.set(smoothRot.current.x, smoothRot.current.y, smoothRot.current.z);
    g.scale.setScalar(smoothScale.current);
    g.position.y = bob - sleepAmt * 0.07;
  });

  return (
    <group ref={group}>
      <Center>
        <primitive object={sceneClone} />
      </Center>
    </group>
  );
}

export function CompanionViewerCanvas({
  url,
  personality,
  behaviorRef,
  velocityRef,
  animParamsRef,
}: CompanionViewerCanvasProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, stencil: false, depth: true }}
      style={{ pointerEvents: 'none', width: '100%', height: '100%' }}
      camera={{ position: [0.15, 0.35, 2.05], fov: 42, near: 0.1, far: 40 }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 8, 5]} intensity={1} />
      <directionalLight position={[-4, 2, -2]} intensity={0.35} />
      <Suspense fallback={null}>
        <AnimatedModelInner
          url={url}
          personality={personality}
          behaviorRef={behaviorRef}
          velocityRef={velocityRef}
          animParamsRef={animParamsRef}
        />
      </Suspense>
    </Canvas>
  );
}
