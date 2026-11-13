import type { Board, OpeningView, PatientView } from '@/domain/board';
import { dismissReasonLabel } from '@/domain/board';
import { isFit, type Match, type MatchResult } from '@/domain/matching';
import type { Opening, Pairing, Trial } from '@/domain/types';
import { openingOwnName, openingShort } from '@/domain/names';
import type { ToneName } from '@/components/ui';

// Trial Options rows for one patient, built from the board's matches.

export interface OptionRow {
  openingId: string;
  trial: Trial;
  opening: Opening;
  match: Match;
  ov: OpeningView;
  /** "SPX-201 › Arm A2", or the trial name for a randomized trial (one row, board 03) */
  label: string;
  ownName: string;
  randomized?: string;
}

export interface OptionGroups {
  matches: OptionRow[];
  soon: OptionRow[];
  statusChange: OptionRow[];
  notFit: OptionRow[];
  all: OptionRow[];
}

const RESULT_RANK: Record<MatchResult, number> = { eligible: 0, pending_review: 1, needs_status_change: 2, not_eligible: 3 };

export function buildOptionRows(view: PatientView, board: Board): OptionGroups {
  const rows: OptionRow[] = [];
  const byTrial = new Map<string, OpeningView[]>();
  for (const ov of board.openings) {
    const list = byTrial.get(ov.trial.id) ?? [];
    list.push(ov);
    byTrial.set(ov.trial.id, list);
  }
  for (const [, ovs] of byTrial) {
    const trial = ovs[0].trial;
    if (trial.randomized) {
      // one row per randomized trial: the opening with the best result stands for it
      const best = [...ovs].sort((a, b) => {
        const ma = view.matchById[a.opening.id];
        const mb = view.matchById[b.opening.id];
        return RESULT_RANK[ma.result] - RESULT_RANK[mb.result] || b.openNow - a.openNow;
      })[0];
      rows.push({
        openingId: best.opening.id,
        trial,
        opening: best.opening,
        match: view.matchById[best.opening.id],
        ov: best,
        label: trial.short,
        ownName: 'this trial',
        randomized: trial.randomized,
      });
    } else {
      for (const ov of ovs) {
        rows.push({
          openingId: ov.opening.id,
          trial,
          opening: ov.opening,
          match: view.matchById[ov.opening.id],
          ov,
          label: openingShort(trial, ov.opening),
          ownName: openingOwnName(ov.opening),
        });
      }
    }
  }
  const matches = rows
    .filter((r) => isFit(r.match) && r.opening.state === 'open')
    .sort((a, b) => b.ov.openNow - a.ov.openNow || a.label.localeCompare(b.label));
  const soon = rows.filter((r) => isFit(r.match) && r.opening.state === 'on_hold');
  const statusChange = rows.filter((r) => r.match.result === 'needs_status_change');
  const notFit = rows.filter((r) => r.match.result === 'not_eligible');
  return { matches, soon, statusChange, notFit, all: rows };
}

/** Open slots across every opening of the trial (board 08: the trial-wide count). */
export function trialOpenNow(board: Board, trialId: string): number {
  return board.openings.filter((o) => o.trial.id === trialId).reduce((n, o) => n + o.openNow, 0);
}

/** Other eligible patients queued for this opening and still in line (not placed elsewhere). */
export function othersQueued(ov: OpeningView, patientId: string): number {
  return ov.candidates.filter(
    (c) => c.patientId !== patientId && (c.status === 'proposed' || c.status === 'reserve' || c.status === 'accepted' || c.status === 'pre_screening'),
  ).length;
}

/** Board 14: the cost of queueing here, said in patients. Undefined when there is nothing to weigh. */
export function placementCost(ov: OpeningView, patientId: string): string | undefined {
  if (ov.opening.state !== 'open' || ov.openNow === 0) return undefined;
  const others = othersQueued(ov, patientId) - ov.fixed.length;
  if (others < ov.openNow) return undefined;
  return others === 1 ? '1 other patient needs it' : `${others} other patients are queued for it`;
}

/** What Thursday's review says about one of the patient's queued openings. */
export function reviewStatusFor(
  view: PatientView,
  openingId: string,
  board: Board,
  pairings: Pairing[],
): { text: string; tone: ToneName } | undefined {
  const p = view.patient;
  const fx = view.fixedPairing;
  if (fx && fx.openingId === openingId) {
    return fx.status === 'accepted' ? { text: 'Accepted at the meeting', tone: 'green' } : { text: 'Pre-screening', tone: 'purple' };
  }
  const dismissed = pairings.find((pr) => pr.patientId === p.id && pr.openingId === openingId && pr.status === 'dismissed');
  if (dismissed) return { text: `Dismissed: ${dismissReasonLabel(dismissed.dismissReason).toLowerCase()}`, tone: 'grey' };
  if (view.decision?.kind === 'proposed' && view.decision.openingId === openingId) return { text: "Proposed in Thursday's review", tone: 'blue' };
  const ov = board.openingById[openingId];
  if (!ov) return undefined;
  if (ov.opening.state === 'on_hold') return { text: 'Opening on hold', tone: 'amber' };
  const c = ov.candidates.find((x) => x.patientId === p.id);
  if (!c) return undefined;
  switch (c.status) {
    case 'not_eligible':
      return { text: 'Not eligible now', tone: 'red' };
    case 'placed_elsewhere':
      return { text: 'Placed at another choice', tone: 'grey' };
    case 'reserve':
      return ov.openNow === 0 ? { text: 'No open slot here', tone: 'red' } : { text: 'Reserve: lost to a higher rank', tone: 'amber' };
    default:
      return undefined;
  }
}

/** Matches with open slots (the "Matches (n)" count). */
export function matchCount(view: PatientView, board: Board): number {
  return buildOptionRows(view, board).matches.length;
}
