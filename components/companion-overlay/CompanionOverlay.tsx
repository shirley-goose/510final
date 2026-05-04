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
  const [pos, setPos] = useState<{ left: number; top: number } | null>(() => null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

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
      const fromLs =
        typeof window !== 'undefined' ? localStorage.getItem(LAST_MODEL_LS) : null;
      if (fromLs?.startsWith('http')) {
        setModelUrl(fromLs);
      }

      const supabase = getSupabaseClient();
      if (!supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: row } = await supabase
        .from('companions')
        .select('model_url')
        .eq('status', 'success')
        .not('model_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (row?.model_url && typeof row.model_url === 'string') {
        setModelUrl(row.model_url);
      }
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
      className="companion-overlay-shell companion-overlay-scope"
      style={{
        position: 'fixed',
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        width: OVERLAY_OUTER_WIDTH,
        height: OVERLAY_OUTER_HEIGHT,
        zIndex: 2147482647,
      }}
    >
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
      <div className="companion-overlay-gl">
        <CompanionViewerCanvas url={modelUrl} />
      </div>
      <small className="companion-desktop-note companion-no-drag">
        Clicks pass through the 3D area. Tabs cannot float above unrelated desktop apps — use Pop-out for a small
        window you can tuck on screen.
      </small>
    </div>
  );
}
