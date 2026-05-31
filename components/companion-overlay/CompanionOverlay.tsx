'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useGLTF } from '@react-three/drei';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  LAST_MODEL_LS,
  OVERLAY_CHROME_HIDDEN_LS,
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
} from '@/lib/companion-overlay/behavior';
import type { BehaviorMode } from '@/lib/companion-overlay/behavior';
import type { CompanionPersonality } from '@/lib/companion-overlay/personalities';
import { parseCompanionPersonality } from '@/lib/companion-overlay/personalities';
import { CompanionViewerCanvas } from './CompanionViewerCanvas';
import './companion-overlay.css';

type CompanionOverlayProps = {
  standalone?: boolean;
};

function openDetachedViewerWindow() {
  const w = OVERLAY_OUTER_WIDTH + 48;
  const h = OVERLAY_OUTER_HEIGHT + 64;
  const scr = window.screen as Screen & {
    availLeft?: number;
    availTop?: number;
  };
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

export default function CompanionOverlay({ standalone = false }: CompanionOverlayProps) {
  const pathname = usePathname();
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [personality, setPersonality] = useState<CompanionPersonality>('calm');
  const [chromeHidden, setChromeHidden] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(() => null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const behaviorModeRef = useRef<BehaviorMode>('idle');
  const velocityRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMouseRef = useRef(performance.now());
  const posRef = useRef<{ left: number; top: number } | null>(null);
  const animParamsRef = useRef(getBehaviorAnimParams('calm'));

  /** Root layout mounts this on every route; omit on dedicated pop-out page to avoid duplicates. */
  const suppressFloatingChrome =
    !standalone &&
    (pathname === '/companion-popout' ||
      pathname === '/login' ||
      pathname === '/reset' ||
      pathname?.startsWith('/login/') ||
      pathname?.startsWith('/reset/'));

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
    if (saved) {
      setPos(
        clampPosition(
          saved.left,
          saved.top,
          vw,
          vh,
          OVERLAY_OUTER_WIDTH,
          OVERLAY_OUTER_HEIGHT
        )
      );
    } else {
      setPos(
        cornerInitialPosition(
          corner,
          vw,
          vh,
          OVERLAY_OUTER_WIDTH,
          OVERLAY_OUTER_HEIGHT
        )
      );
    }
  }, [modelUrl]);

  useEffect(() => {
    try {
      setChromeHidden(localStorage.getItem(OVERLAY_CHROME_HIDDEN_LS) === '1');
    } catch {
      /* private mode */
    }
  }, []);

  const hideChrome = () => {
    setChromeHidden(true);
    try {
      localStorage.setItem(OVERLAY_CHROME_HIDDEN_LS, '1');
    } catch {
      /* quota */
    }
  };

  const showChrome = () => {
    setChromeHidden(false);
    try {
      localStorage.removeItem(OVERLAY_CHROME_HIDDEN_LS);
    } catch {
      /* quota */
    }
  };

  useEffect(() => {
    function onResize() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPos((p) =>
        p
          ? clampPosition(
              p.left,
              p.top,
              vw,
              vh,
              OVERLAY_OUTER_WIDTH,
              OVERLAY_OUTER_HEIGHT
            )
          : p
      );
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    animParamsRef.current = getBehaviorAnimParams(personality);
  }, [personality]);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    mouseRef.current = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    lastMouseRef.current = performance.now();
  }, []);

  useEffect(() => {
    function onMouseMove(ev: MouseEvent) {
      mouseRef.current = { x: ev.clientX, y: ev.clientY };
      lastMouseRef.current = performance.now();
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

      const ts = performance.now();
      const dt = Math.min(0.088, (ts - lastTs) / 1000);
      lastTs = ts;

      if (dragging.current) return;

      const prev = posRef.current;
      if (!prev) return;

      const anim = animParamsRef.current;
      const mode = resolveBehaviorModeWithIdleThreshold(ts, lastMouseRef.current, anim.idleAfterStillMs);
      behaviorModeRef.current = mode;

      const decay = Math.exp(-14 * dt);
      const velLerp = Math.min(1, 28 * dt);
      const clampVel = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

      if (mode !== 'follow') {
        velocityRef.current.x *= decay;
        velocityRef.current.y *= decay;
        return;
      }

      const { x: mx, y: my } = mouseRef.current;
      const rawLeft = mx - OVERLAY_OUTER_WIDTH / 2;
      const rawTop = my - OVERLAY_OUTER_HEIGHT * 0.48;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const target = clampPosition(
        rawLeft,
        rawTop,
        vw,
        vh,
        OVERLAY_OUTER_WIDTH,
        OVERLAY_OUTER_HEIGHT
      );

      const smoothing = Math.min(1, anim.followSmoothness * dt);
      const nextLeft = prev.left + (target.left - prev.left) * smoothing;
      const nextTop = prev.top + (target.top - prev.top) * smoothing;

      const dx = nextLeft - prev.left;
      const dy = nextTop - prev.top;

      const vxTarget = clampVel((dx / OVERLAY_OUTER_WIDTH) * 18, -1.5, 1.5);
      const vyTarget = clampVel((dy / OVERLAY_OUTER_HEIGHT) * 14, -1.25, 1.25);

      velocityRef.current.x += (vxTarget - velocityRef.current.x) * velLerp;
      velocityRef.current.y += (vyTarget - velocityRef.current.y) * velLerp;

      const clampedNext = clampPosition(
        nextLeft,
        nextTop,
        vw,
        vh,
        OVERLAY_OUTER_WIDTH,
        OVERLAY_OUTER_HEIGHT
      );

      posRef.current = clampedNext;
      setPos(clampedNext);
    }

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [modelUrl]);

  const onDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.companion-no-drag')) return;
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - (pos?.left ?? 0),
      y: e.clientY - (pos?.top ?? 0),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging.current || pos === null) return;
    const nextLeft = e.clientX - dragOffset.current.x;
    const nextTop = e.clientY - dragOffset.current.y;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clamped = clampPosition(
      nextLeft,
      nextTop,
      vw,
      vh,
      OVERLAY_OUTER_WIDTH,
      OVERLAY_OUTER_HEIGHT
    );
    posRef.current = clamped;
    setPos(clamped);
  };

  const onDragEnd = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (typeof e.pointerId === 'number') {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* release may throw if capture already cleared */
      }
    }
    setPos((current) => {
      if (!current) return current;
      posRef.current = current;
      saveOverlayPosition(current);
      return current;
    });
  };

  const resetPositionForCornerDefault = () => {
    const corner = readDefaultCorner() as CompanionCorner;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const raw = cornerInitialPosition(
      corner,
      vw,
      vh,
      OVERLAY_OUTER_WIDTH,
      OVERLAY_OUTER_HEIGHT
    );
    const next = clampPosition(
      raw.left,
      raw.top,
      vw,
      vh,
      OVERLAY_OUTER_WIDTH,
      OVERLAY_OUTER_HEIGHT
    );
    saveOverlayPosition(next);
    posRef.current = next;
    setPos(next);
  };

  if (!standalone && suppressFloatingChrome) {
    return null;
  }

  if (!modelUrl || pos === null) {
    return null;
  }

  return (
    <div
      className={`companion-overlay-shell companion-overlay-scope${chromeHidden ? ' companion-chrome-hidden' : ''}`}
      style={{
        position: 'fixed',
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        width: OVERLAY_OUTER_WIDTH,
        height: OVERLAY_OUTER_HEIGHT,
        zIndex: 2147482647,
      }}
    >
      {!chromeHidden ? (
        <div
          className="companion-overlay-chrome companion-drag-target"
          title="Drag to move"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <span className="companion-drag-hint">Pet companion · drag bar</span>
          <button
            type="button"
            className="companion-mini-btn companion-no-drag"
            title="Hide drag bar"
            aria-label="Hide drag bar"
            onClick={(evt) => {
              evt.preventDefault();
              evt.stopPropagation();
              hideChrome();
            }}
          >
            Hide
          </button>
          <button
            type="button"
            className="companion-mini-btn companion-no-drag"
            onClick={(evt) => {
              evt.preventDefault();
              evt.stopPropagation();
              openDetachedViewerWindow();
            }}
          >
            Pop-out
          </button>
          <button
            type="button"
            className="companion-mini-btn companion-no-drag"
            onClick={(evt) => {
              evt.preventDefault();
              evt.stopPropagation();
              resetPositionForCornerDefault();
            }}
          >
            Dock
          </button>
        </div>
      ) : (
        <>
          <div
            className="companion-overlay-drag-edge companion-drag-target"
            title="Drag to move"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          />
          <button
            type="button"
            className="companion-show-chrome-btn companion-no-drag"
            title="Show drag bar"
            aria-label="Show drag bar"
            onClick={(evt) => {
              evt.preventDefault();
              evt.stopPropagation();
              showChrome();
            }}
          >
            Bar
          </button>
        </>
      )}
      <div className="companion-overlay-gl">
        <CompanionViewerCanvas
          url={modelUrl}
          personality={personality}
          behaviorRef={behaviorModeRef}
          velocityRef={velocityRef}
          animParamsRef={animParamsRef}
        />
      </div>
      {!chromeHidden && (
        <small className="companion-desktop-note companion-no-drag">
          Clicks pass through the 3D area. Tabs cannot float above unrelated desktop apps — use Pop-out for a small
          window you can tuck on screen.
        </small>
      )}
    </div>
  );
}
