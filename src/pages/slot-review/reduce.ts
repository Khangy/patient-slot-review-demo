import { useState } from 'react';
import type { Board, PatientView } from '@/domain/board';
import type { Selection } from './boardUi';

// Selecting a patient or a slot narrows the other lists to what applies to it, instead of
// greying the rest out (SR6). "Show all" brings the rest back, dimmed as before, until the
// selection changes.

export type SectionKey = 'decide' | 'blocked' | 'none' | 'progress' | 'other';

export const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: 'decide', title: 'To decide' },
  { key: 'blocked', title: 'Blocked' },
  { key: 'none', title: 'Nothing queued' },
  { key: 'progress', title: 'In progress' },
  { key: 'other', title: 'Other' },
];

export function sectionOf(v: PatientView): SectionKey {
  if (v.boardStatus === 'slot_accepted' || v.boardStatus === 'pre_screening') return 'progress';
  if (v.decision?.kind === 'proposed') return 'decide';
  if (v.blocked) return 'blocked';
  if (v.boardStatus === 'not_queued') return 'none';
  return 'other';
}

/** The open-now openings that apply to a patient, in the order the meeting reads them. */
export function openingsForPatient(board: Board, patientId: string): { theirs: string[]; queued: string[]; fits: string[]; all: string[] } {
  const pv = board.patientById[patientId];
  if (!pv) return { theirs: [], queued: [], fits: [], all: [] };
  const isOpen = (oid: string) => board.openingById[oid]?.opening.state === 'open';
  const d = pv.decision;
  const theirs = d && d.kind !== 'dismissed' && isOpen(d.openingId) ? [d.openingId] : [];
  const queued = pv.patient.queue.map((e) => e.openingId).filter((oid) => isOpen(oid) && !theirs.includes(oid));
  const fits = pv.possibleNow.filter((oid) => !theirs.includes(oid) && !queued.includes(oid));
  return { theirs, queued, fits, all: [...theirs, ...queued, ...fits] };
}

/** The patients in review who apply to an opening: its candidates in rank order, who holds a slot, who fits. */
export function patientsForOpening(board: Board, openingId: string): { ranked: string[]; holding: string[]; fits: string[]; notEligible: string[]; all: string[] } {
  const ov = board.openingById[openingId];
  if (!ov) return { ranked: [], holding: [], fits: [], notEligible: [], all: [] };
  const inReview = (pid: string) => !!board.patientById[pid]?.inReview;
  const ranked = ov.candidates.filter((c) => c.status !== 'not_eligible').map((c) => c.patientId);
  const holding = ov.fixed.map((f) => f.patientId).filter((pid) => !ranked.includes(pid));
  const fits = ov.fitNotQueued.filter(inReview);
  const notEligible = ov.candidates.filter((c) => c.status === 'not_eligible').map((c) => c.patientId);
  return { ranked, holding, fits, notEligible, all: [...holding, ...ranked, ...fits, ...notEligible] };
}

/** "Show all" for one column; it resets whenever the selection changes. */
export function useShowAll(sel: Selection): [boolean, (v: boolean) => void] {
  const key = sel ? `${sel.kind}:${sel.id}` : '';
  const [s, set] = useState({ key, all: false });
  return [s.key === key ? s.all : false, (all: boolean) => set({ key, all })];
}
