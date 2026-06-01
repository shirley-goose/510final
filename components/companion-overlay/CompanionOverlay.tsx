'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useGLTF } from '@react-three/drei';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  LAST_MODEL_LS,
  OVERLAY_OUTER_HEIGHT,
  OVERLAY_OUTER_WIDTH,
  readDefaultCorner,
} from '@/lib/companion-overlay/constants';
import type { CompanionCorner } from '@/lib/companion-overlay/constants';
import {
  clampPosition,
  cornerInitialPosition,
  loadSavedOverlayPosition,
  saveOverlayPosition,
} from '@/lib/companion-overlay/position-storage';
import {
  getBehaviorAnimParams,
  resolveBehaviorModeWithIdleThreshold,
  SEEK_USER_AFTER_MS,
  AUTONOMOUS_DURATION_MS,
} from '@/lib/companion-overlay/behavior';
import type { BehaviorMode } from '@/lib/companion-overlay/behavior';
import type { CompanionPersonality } from '@/lib/companion-overlay/personalities';
import { parseCompanionPersonality } from '@/lib/companion-overlay/personalities';
import { CompanionViewerCanvas } from './CompanionViewerCanvas';
import './companion-overlay.css';

type CompanionOverlayProps = {
  standalone?: boolean;
};

type AutonomousState = {
  mode: 'walk' | 'chase-tail' | 'roll' | 'seek-user';
  startMs: number;
  walkTarget: { left: number; top: number } | null;
};

function openDetachedViewerWindow() {
  const w = OVERLAY_OUTER_WIDTH + 48;
  const h = OVERLAY_OUTER_HEIGHT + 64;
  const scr = window.screen as Screen & { availLeft?: number; availTop?: number };
  const left = Math.max(
    0,
    typeof scr.availLeft === 'number'
      ? scr.availLeft + scr.availWidth - w - 32
      : window.innerWidth - w - 32
  );
  const top = Math.max(
    0,
    typeof scr.availTop === 'number'
      ? scr.availTop + scr.availHeight - h - 32
      : window.innerHeight - h - 32
  );
  window.open(
    `/companion-popout`,
    'pet2companion_viewer',
    `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=no`
  );
}

function pickRandomWalkTarget(vw: number, vh: number): { left: number; top: number } {
  const margin = 60;
  return {
    left: margin + Math.random() * Math.max(0, vw - OVERLAY_OUTER_WIDTH - margin * 2),
    top: margin + Math.random() * Math.max(0, vh - OVERLAY_OUTER_HEIGHT - margin * 2),
  };
}

export default function CompanionOverlay({ standalone = false }: CompanionOverlayProps) {
  const pathname = usePathname();
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [personality, setPersonality] = useState<CompanionPersonality>('calm');
  /** Gates first render; all subsequent position updates go through applyPosition (no re-render). */
  const [positioned, setPositioned] = useState(false);
  /** Emoji bubble: appears on interaction and floats away. */
  const [bubble, setBubble] = useState<{ emoji: string; id: number } | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const behaviorModeRef = useRef<BehaviorMode>('idle');
  const velocityRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMouseRef = useRef(performance.now());
  const lastInteractionRef = useRef(performance.now());
  const posRef = useRef<{ left: number; top: number } | null>(null);
  const animParamsRef = useRef(getBehaviorAnimParams('calm'));
  const autonomousRef = useRef<AutonomousState | null>(null);
  /** Normalized cursor position relative to pet center (-1..1). */
  const cursorRelRef = useRef({ x: 0, y: 0 });
  /** Cursor proximity to pet center: 0 = far, 1 = touching. */
  const proximityRef = useRef(0);
  /** Incremented on each click/tap — canvas watches for changes. */
  const clickBumpRef = useRef(0);
  /** True while pet is being dragged — canvas shows excited anim. */
  const isDraggingRef = useRef(false);

  const showBubble = useCallback((emoji: string) => {
    setBubble({ emoji, id: Date.now() });
    setTimeout(() => setBubble(null), 1200);
  }, []);

  const suppressFloatingChrome =
    !standalone &&
    (pathname === '/companion-popout' ||
      pathname === '/login' ||
      pathname === '/reset' ||
      pathname?.startsWith('/login/') ||
      pathname?.startsWith('/reset/'));

  /** Write position directly to DOM — avoids React re-render on every animation frame. */
  const applyPosition = useCallback((p: { left: number; top: number }) => {
    posRef.current = p;
    const el = shellRef.current;
    if (el) {
      el.style.left = `${p.left}px`;
      el.style.top = `${p.top}px`;
    }
  }, []);

  const refreshModelUrl = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;

      const supabase = getSupabaseClient();

      if (!supabase) {
        const fromLs = localStorage.getItem(LAST_MODEL_LS);
        setModelUrl(fromLs?.startsWith('http') ? fromLs : null);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const fromLs = localStorage.getItem(LAST_MODEL_LS);
        setModelUrl(fromLs?.startsWith('http') ? fromLs : null);
        return;
      }

      const applyRow = (row: {
        model_url?: string | null;
        personality?: string | null;
      }) => {
        const mu = typeof row.model_url === 'string' ? row.model_url : null;
        if (mu?.startsWith('http')) {
          setModelUrl(mu);
          try {
            localStorage.setItem(LAST_MODEL_LS, mu);
          } catch {
            /* quota */
          }
        }
        if (typeof row.personality === 'string') {
          setPersonality(parseCompanionPersonality(row.personality));
        }
      };

      const { data: activeRow } = await supabase
        .from('companions')
        .select('model_url,personality')
        .eq('user_id', session.user.id)
        .eq('status', 'success')
        .eq('is_active', true)
        .not('model_url', 'is', null)
        .maybeSingle();

      if (activeRow?.model_url && typeof activeRow.model_url === 'string') {
        applyRow(activeRow);
        return;
      }

      const { data: fallbackRow } = await supabase
        .from('companions')
        .select('model_url,personality')
        .eq('user_id', session.user.id)
        .eq('status', 'success')
        .not('model_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackRow?.model_url && typeof fallbackRow.model_url === 'string') {
        applyRow(fallbackRow);
        return;
      }

      try {
        localStorage.removeItem(LAST_MODEL_LS);
      } catch {
        /* ignore */
      }
      setModelUrl(null);
      setPersonality(parseCompanionPersonality(undefined));
    } catch {
      /* ignore transient Supabase/network errors */
    }
  }, []);

  useEffect(() => {
    void refreshModelUrl();
  }, [refreshModelUrl]);

  useEffect(() => {
    const onEvt = () => void refreshModelUrl();
    window.addEventListener('pet2companion-model-ready', onEvt);
    window.addEventListener('storage', onEvt);
    window.addEventListener('focus', onEvt);
    return () => {
      window.removeEventListener('pet2companion-model-ready', onEvt);
      window.removeEventListener('storage', onEvt);
      window.removeEventListener('focus', onEvt);
    };
  }, [refreshModelUrl]);

  useEffect(() => {
    if (!modelUrl) return;
    try {
      useGLTF.preload(modelUrl);
    } catch {
      /* non-fatal */
    }

    const corner = readDefaultCorner() as CompanionCorner;
    const saved = loadSavedOverlayPosition();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const initial = saved
      ? clampPosition(saved.left, saved.top, vw, vh, OVERLAY_OUTER_WIDTH, OVERLAY_OUTER_HEIGHT)
      : cornerInitialPosition(corner, vw, vh, OVERLAY_OUTER_WIDTH, OVERLAY_OUTER_HEIGHT);

    posRef.current = initial;
    setPositioned(true);
  }, [modelUrl]);

  useEffect(() => {
    function onResize() {
      if (!posRef.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      applyPosition(
        clampPosition(posRef.current.left, posRef.current.top, vw, vh, OVERLAY_OUTER_WIDTH, OVERLAY_OUTER_HEIGHT)
      );
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [applyPosition]);

  useEffect(() => {
    animParamsRef.current = getBehaviorAnimParams(personality);
  }, [personality]);

  useEffect(() => {
    mouseRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    lastMouseRef.current = performance.now();
    lastInteractionRef.current = performance.now();
  }, []);

  useEffect(() => {
    function onMouseMove(ev: MouseEvent) {
      mouseRef.current = { x: ev.clientX, y: ev.clientY };
      const now = performance.now();
      lastMouseRef.current = now;
      lastInteractionRef.current = now;
      if (autonomousRef.current?.mode === 'seek-user') autonomousRef.current = null;

      const pos = posRef.current;
      if (pos) {
        const pcx = pos.left + OVERLAY_OUTER_WIDTH / 2;
        const pcy = pos.top + OVERLAY_OUTER_HEIGHT / 2;
        const dx = ev.clientX - pcx;
        const dy = ev.clientY - pcy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxD = Math.max(window.innerWidth, window.innerHeight) / 2;
        cursorRelRef.current = {
          x: Math.max(-1, Math.min(1, dx / maxD)),
          y: Math.max(-1, Math.min(1, dy / maxD)),
        };
        // Proximity: 1 at center, 0 at 240px away
        const prox = Math.max(0, 1 - dist / 240);
        proximityRef.current = prox;

        // Wake from sleep when cursor gets close
        if (prox > 0.55 && behaviorModeRef.current === 'sleep' && !autonomousRef.current) {
          autonomousRef.current = { mode: 'roll', startMs: now, walkTarget: null };
        }
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  useEffect(() => {
    if (!modelUrl) return;

    let rafId = 0;
    let lastTs = performance.now();

    function loop() {
      rafId = window.requestAnimationFrame(loop);

      // Skip work when tab is hidden
      if (document.hidden) return;

      const ts = performance.now();
      const dt = Math.min(0.088, (ts - lastTs) / 1000);
      lastTs = ts;

      if (dragging.current) return;

      const prev = posRef.current;
      if (!prev) return;

      const anim = animParamsRef.current;
      const baseMode = resolveBehaviorModeWithIdleThreshold(ts, lastMouseRef.current);

      // Trigger seek-user after prolonged inactivity
      if (ts - lastInteractionRef.current >= SEEK_USER_AFTER_MS && !autonomousRef.current) {
        autonomousRef.current = { mode: 'seek-user', startMs: ts, walkTarget: null };
      }

      const auto = autonomousRef.current;

      if (auto) {
        const duration = AUTONOMOUS_DURATION_MS[auto.mode] ?? 8000;
        const elapsed = ts - auto.startMs;

        if (auto.mode === 'seek-user') {
          const { x: mx, y: my } = mouseRef.current;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const target = clampPosition(
            mx - OVERLAY_OUTER_WIDTH / 2,
            my - OVERLAY_OUTER_HEIGHT * 0.48,
            vw, vh, OVERLAY_OUTER_WIDTH, OVERLAY_OUTER_HEIGHT
          );
          const dx = target.left - prev.left;
          const dy = target.top - prev.top;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 50 || elapsed >= duration) {
            autonomousRef.current = null;
            lastInteractionRef.current = ts;
            behaviorModeRef.current = 'idle';
            return;
          }

          const seekSmooth = Math.min(1, 2.8 * dt);
          const clamped = clampPosition(
            prev.left + dx * seekSmooth,
            prev.top + dy * seekSmooth,
            vw, vh, OVERLAY_OUTER_WIDTH, OVERLAY_OUTER_HEIGHT
          );
          const velLerp = Math.min(1, 28 * dt);
          velocityRef.current.x += (Math.max(-1.5, Math.min(1.5, (clamped.left - prev.left) / OVERLAY_OUTER_WIDTH * 18)) - velocityRef.current.x) * velLerp;
          velocityRef.current.y += (Math.max(-1.25, Math.min(1.25, (clamped.top - prev.top) / OVERLAY_OUTER_HEIGHT * 14)) - velocityRef.current.y) * velLerp;
          applyPosition(clamped);
          behaviorModeRef.current = 'seek-user';
          return;
        }

        if (auto.mode === 'walk') {
          if (!auto.walkTarget) {
            auto.walkTarget = pickRandomWalkTarget(window.innerWidth, window.innerHeight);
          }
          const { left: tl, top: tt } = auto.walkTarget;
          const dx = tl - prev.left;
          const dy = tt - prev.top;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 24 || elapsed >= duration) {
            autonomousRef.current = null;
            behaviorModeRef.current = baseMode;
            return;
          }

          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const walkSmooth = Math.min(1, 1.1 * dt);
          const clamped = clampPosition(
            prev.left + dx * walkSmooth,
            prev.top + dy * walkSmooth,
            vw, vh, OVERLAY_OUTER_WIDTH, OVERLAY_OUTER_HEIGHT
          );
          const velLerp = Math.min(1, 28 * dt);
          velocityRef.current.x += (Math.max(-1.5, Math.min(1.5, (clamped.left - prev.left) / OVERLAY_OUTER_WIDTH * 18)) - velocityRef.current.x) * velLerp;
          velocityRef.current.y += (Math.max(-1.25, Math.min(1.25, (clamped.top - prev.top) / OVERLAY_OUTER_HEIGHT * 14)) - velocityRef.current.y) * velLerp;
          applyPosition(clamped);
          behaviorModeRef.current = 'walk';
          return;
        }

        // chase-tail / roll: stay in place, just animate
        if (elapsed >= duration) {
          autonomousRef.current = null;
          behaviorModeRef.current = baseMode;
          return;
        }
        const decay = Math.exp(-14 * dt);
        velocityRef.current.x *= decay;
        velocityRef.current.y *= decay;
        behaviorModeRef.current = auto.mode;
        return;
      }

      // No autonomous state — pet stays in place, velocity decays
      const decay = Math.exp(-14 * dt);
      velocityRef.current.x *= decay;
      velocityRef.current.y *= decay;
      behaviorModeRef.current = baseMode;

      // Randomly trigger autonomous behaviors when idle
      if (baseMode === 'idle') {
        const r = Math.random();
        const wp = anim.walkChance * dt;
        const cp = anim.chaseTailChance * dt;
        const rp = anim.rollChance * dt;
        if (r < wp) {
          autonomousRef.current = { mode: 'walk', startMs: ts, walkTarget: null };
        } else if (r < wp + cp) {
          autonomousRef.current = { mode: 'chase-tail', startMs: ts, walkTarget: null };
        } else if (r < wp + cp + rp) {
          autonomousRef.current = { mode: 'roll', startMs: ts, walkTarget: null };
        }
      }
    }

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [modelUrl, applyPosition]);

  const pointerDownTime = useRef(0);
  const pointerDownPos = useRef({ x: 0, y: 0 });

  const onDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.companion-no-drag')) return;
    e.preventDefault();
    dragging.current = true;
    isDraggingRef.current = true;
    autonomousRef.current = null;
    lastInteractionRef.current = performance.now();
    pointerDownTime.current = performance.now();
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    dragOffset.current = {
      x: e.clientX - (posRef.current?.left ?? 0),
      y: e.clientY - (posRef.current?.top ?? 0),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging.current || !posRef.current) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    applyPosition(
      clampPosition(
        e.clientX - dragOffset.current.x,
        e.clientY - dragOffset.current.y,
        vw, vh, OVERLAY_OUTER_WIDTH, OVERLAY_OUTER_HEIGHT
      )
    );
  };

  const onDragEnd = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    isDraggingRef.current = false;
    if (posRef.current) saveOverlayPosition(posRef.current);

    // Short tap (< 220ms, < 8px moved) = click → happy reaction
    const elapsed = performance.now() - pointerDownTime.current;
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    if (elapsed < 220 && Math.sqrt(dx * dx + dy * dy) < 8) {
      clickBumpRef.current += 1;
      const emojis = ['❤️', '🎉', '✨', '🥰', '💛'];
      showBubble(emojis[Math.floor(Math.random() * emojis.length)]);
      if (!autonomousRef.current) {
        autonomousRef.current = {
          mode: Math.random() < 0.5 ? 'chase-tail' : 'roll',
          startMs: performance.now(),
          walkTarget: null,
        };
      }
    }
  };

  const resetPositionForCornerDefault = () => {
    const corner = readDefaultCorner() as CompanionCorner;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const raw = cornerInitialPosition(corner, vw, vh, OVERLAY_OUTER_WIDTH, OVERLAY_OUTER_HEIGHT);
    const next = clampPosition(raw.left, raw.top, vw, vh, OVERLAY_OUTER_WIDTH, OVERLAY_OUTER_HEIGHT);
    saveOverlayPosition(next);
    applyPosition(next);
  };

  if (!standalone && suppressFloatingChrome) return null;
  if (!modelUrl || !positioned) return null;

  return (
    <div
      ref={shellRef}
      className="companion-overlay-shell companion-overlay-scope"
      style={{
        position: 'fixed',
        left: `${posRef.current?.left ?? 0}px`,
        top: `${posRef.current?.top ?? 0}px`,
        width: OVERLAY_OUTER_WIDTH,
        height: OVERLAY_OUTER_HEIGHT,
        zIndex: 2147482647,
      }}
      onPointerDown={onDragStart}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
    >
      {/* Hover-only control buttons */}
      <div className="companion-controls companion-no-drag">
        <button
          type="button"
          className="companion-mini-btn"
          onClick={(e) => { e.stopPropagation(); openDetachedViewerWindow(); }}
          title="Pop-out window"
        >
          ↗
        </button>
        <button
          type="button"
          className="companion-mini-btn"
          onClick={(e) => { e.stopPropagation(); resetPositionForCornerDefault(); }}
          title="Dock to corner"
        >
          ⌂
        </button>
      </div>
      {/* Emoji bubble */}
      {bubble && (
        <div key={bubble.id} style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 28,
          pointerEvents: 'none',
          animation: 'bubbleFloat 1.2s ease-out forwards',
          zIndex: 10,
        }}>
          {bubble.emoji}
        </div>
      )}
      <CompanionViewerCanvas
        url={modelUrl}
        personality={personality}
        behaviorRef={behaviorModeRef}
        velocityRef={velocityRef}
        animParamsRef={animParamsRef}
        cursorRelRef={cursorRelRef}
        clickBumpRef={clickBumpRef}
        proximityRef={proximityRef}
        isDraggingRef={isDraggingRef}
      />
    </div>
  );
}
