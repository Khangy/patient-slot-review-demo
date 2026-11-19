import { Box, GlobalStyles } from '@mui/material';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// SR5: drag a patient card onto a slot card. Pointer events rather than the HTML5 drag API:
// they work on buttons in every browser, give a custom ghost that can say what the drop will
// do, and let the slot column scroll while dragging. Mouse and pen only; on touch screens
// (and from the keyboard) the "Place here" button under each possible slot does the same.

interface DragApi {
  /** the patient being dragged */
  patientId: string | null;
  /** the opening under the pointer */
  overId: string | null;
  /** pointerdown handler for a draggable patient card */
  start(patientId: string, e: ReactPointerEvent): void;
}

// Read by the columns' scroll-to-selection effects: a drag selects the patient, and the
// page must not scroll under the pointer while it moves.
let dragging = false;
export const isDragging = () => dragging;

const DragContext = createContext<DragApi>({ patientId: null, overId: null, start: () => undefined });

export const useDrag = () => useContext(DragContext);

interface Live {
  patientId: string;
  x0: number;
  y0: number;
  x: number;
  y: number;
  started: boolean;
  overId: string | null;
  raf: number;
}

const THRESHOLD = 6; // px before a press becomes a drag, so a click still selects
const EDGE = 56; // px from a column's edge where it starts to scroll

export function DragProvider({
  children,
  onStart,
  onDrop,
  renderGhost,
}: {
  children: ReactNode;
  onStart: (patientId: string) => void;
  onDrop: (patientId: string, openingId: string) => void;
  renderGhost: (patientId: string, overId: string | null) => ReactNode;
}) {
  const [drag, setDrag] = useState<{ patientId: string; overId: string | null } | null>(null);
  const cb = useRef({ onStart, onDrop });
  cb.current = { onStart, onDrop };
  const live = useRef<Live | null>(null);
  const ghost = useRef<HTMLDivElement>(null);

  const start = useCallback((patientId: string, e: ReactPointerEvent) => {
    if (e.button !== 0 || e.pointerType === 'touch' || live.current) return;
    const l: Live = { patientId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, started: false, overId: null, raf: 0 };
    live.current = l;

    const hit = () => {
      const el = document.elementFromPoint(l.x, l.y)?.closest<HTMLElement>('[data-drop-oid]');
      const id = el?.dataset.dropOid ?? null;
      if (id !== l.overId) {
        l.overId = id;
        setDrag({ patientId, overId: id });
      }
    };
    const tick = () => {
      const col = document.elementFromPoint(l.x, l.y)?.closest<HTMLElement>('[data-scroll-col]');
      if (col && col.scrollHeight > col.clientHeight) {
        const r = col.getBoundingClientRect();
        const dy = l.y < r.top + EDGE ? l.y - (r.top + EDGE) : l.y > r.bottom - EDGE ? l.y - (r.bottom - EDGE) : 0;
        if (dy) {
          col.scrollTop += dy * 0.3;
          hit();
        }
      }
      const vh = window.innerHeight;
      if (l.y < 32) window.scrollBy(0, (l.y - 32) * 0.4);
      else if (l.y > vh - 32) window.scrollBy(0, (l.y - (vh - 32)) * 0.4);
      l.raf = requestAnimationFrame(tick);
    };
    const move = (ev: PointerEvent) => {
      l.x = ev.clientX;
      l.y = ev.clientY;
      if (!l.started) {
        if (Math.hypot(l.x - l.x0, l.y - l.y0) < THRESHOLD) return;
        l.started = true;
        dragging = true;
        window.getSelection()?.removeAllRanges();
        cb.current.onStart(patientId);
        setDrag({ patientId, overId: null });
        l.raf = requestAnimationFrame(tick);
      }
      ev.preventDefault();
      if (ghost.current) ghost.current.style.transform = `translate(${l.x + 14}px, ${l.y + 14}px)`;
      hit();
    };
    const end = (drop: boolean) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key, true);
      cancelAnimationFrame(l.raf);
      live.current = null;
      dragging = false;
      if (!l.started) return;
      // the click that ends a drag must not also select the card under the pointer
      const swallow = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
      setDrag(null);
      if (drop && l.overId) cb.current.onDrop(patientId, l.overId);
    };
    const up = () => end(true);
    const cancel = () => end(false);
    const key = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      ev.stopPropagation();
      end(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key, true);
  }, []);

  const api = useMemo<DragApi>(() => ({ patientId: drag?.patientId ?? null, overId: drag?.overId ?? null, start }), [drag, start]);
  const pos = live.current;

  return (
    <DragContext.Provider value={api}>
      {drag ? <GlobalStyles styles={{ 'body, body *': { cursor: 'grabbing !important', userSelect: 'none' } }} /> : null}
      {children}
      {drag && pos
        ? createPortal(
            <Box
              ref={ghost}
              aria-hidden="true"
              style={{ transform: `translate(${pos.x + 14}px, ${pos.y + 14}px)` }}
              sx={{ position: 'fixed', top: 0, left: 0, zIndex: 2000, pointerEvents: 'none' }}
            >
              {renderGhost(drag.patientId, drag.overId)}
            </Box>,
            document.body,
          )
        : null}
    </DragContext.Provider>
  );
}
