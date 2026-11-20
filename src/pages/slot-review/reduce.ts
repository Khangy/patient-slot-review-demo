import { useState } from 'react';
import type { Board, PatientView } from '@/domain/board';

// Selecting a patient or a slot narrows the other lists to what applies to it, instead of
// greying the rest out (SR6). "Show all" brings the rest back, dimmed as before, until the
// selection that narrows that list changes.

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

export interface ForOpening {
  /** accepted or pre-screening here */
  holding: string[];
  proposed: string[];
  nextInLine: string[];
  /** queued and a fit, but proposed elsewhere or waiting */
  queued: string[];
  fits: string[];
  notEligible: string[];
  all: string[];
}

/** The patients in review who apply to an opening: who holds a slot, the proposals, next in line, the rest queued, who fits. */
export function patientsForOpening(board: Board, openingId: string): ForOpening {
  const ov = board.openingById[openingId];
  if (!ov) return { holding: [], proposed: [], nextInLine: [], queued: [], fits: [], notEligible: [], all: [] };
  const inReview = (pid: string) => !!board.patientById[pid]?.inReview;
  const by = (...st: string[]) => ov.candidates.filter((c) => st.includes(c.status)).map((c) => c.patientId);
  const holding = [...new Set([...ov.fixed.map((f) => f.patientId), ...by('accepted', 'pre_screening')])];
  const proposed = by('proposed');
  const nextInLine = by('next_in_line');
  const queued = by('placed_elsewhere', 'queued', 'dismissed');
  const fits = ov.fitNotQueued.filter(inReview);
  const notEligible = by('not_eligible');
  return { holding, proposed, nextInLine, queued, fits, notEligible, all: [...holding, ...proposed, ...nextInLine, ...queued, ...fits, ...notEligible] };
}

/** Does the slot apply to the patient, so both can stay selected? */
export function pairApplies(board: Board, patientId: string, openingId: string): boolean {
  return openingsForPatient(board, patientId).all.includes(openingId) || patientsForOpening(board, openingId).all.includes(patientId);
}

/** "Show all" for one column; it resets whenever the selection that narrows it changes. */
export function useShowAll(key: string | null): [boolean, (v: boolean) => void] {
  const k = key ?? '';
  const [s, set] = useState({ key: k, all: false });
  return [s.key === k ? s.all : false, (all: boolean) => set({ key: k, all })];
}
