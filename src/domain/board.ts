import type { DemoState, Opening, Pairing, Patient, Snapshot, Step, Trial } from './types';
import { isFit, matchPatient, type Match } from './matching';
import { daysBetween, fmtShort, TODAY } from './dates';
import { labelFor, openingFull, openingShort } from './names';

// Everything the Patient Slot Review board and the patient pages derive from the demo state.
// computeBoard is pure: the store memoizes it, so every change (accept, dismiss, queue, re-check)
// flows to every column at once.
//
// The demo optimizer: patients are placed in rank order (longest on the queue first) into the
// highest choice on their Interest List that still has an open slot. Accepted and pre-screening
// pairings hold their slots first; a dismissed pairing is never proposed again. The real
// optimizer weighs fit and enrollment; how it scores is out of scope for this prototype.

export type CandidateStatus =
  | 'accepted'
  | 'pre_screening'
  | 'proposed'
  | 'placed_elsewhere'
  | 'reserve'
  | 'dismissed'
  | 'not_eligible';

export interface Candidate {
  patientId: string;
  /** rank among eligible candidates (1 = first in line); undefined when not eligible */
  rank?: number;
  status: CandidateStatus;
  /** this opening's place in the patient's own order of choice */
  choice: number;
  elsewhereOpeningId?: string;
  match: Match;
  blocked: boolean;
}

export interface OpeningView {
  trial: Trial;
  opening: Opening;
  short: string; // "SPX-201 › Arm A2"
  full: string; // "SPX-201 › Part 2 › Cohort A › Arm A2"
  /** open slots before this meeting's proposals (0 while on hold) */
  openNow: number;
  /** accepted / pre-screening pairings holding a slot here */
  fixed: Pairing[];
  proposed: string[];
  candidates: Candidate[];
  /** patients (seeking or undeclared) who fit but are not queued here */
  fitNotQueued: string[];
  watching: string[];
  /** queued candidates left with no slot anywhere if this goes as proposed */
  blocks: string[];
  /** open slots nobody is proposed for */
  unfilled: number;
}

export type BlockedReason = 'no_slot_in_opening' | 'outranked' | 'no_longer_eligible' | 'dismissed';

export interface Blocked {
  patientId: string;
  reason: BlockedReason;
  label: string; // chip text
  detail: string; // one sentence, no patient names (the UI adds them in the board's name mode)
  openingIds: string[];
  /** open now, the patient fits, but it is not on their Interest List */
  hintOpeningIds: string[];
  /** outranked: who holds the proposals in the opening */
  aheadIds?: string[];
  pairing?: Pairing; // dismissed
}

export type DecisionKind = 'proposed' | 'accepted' | 'pre_screening' | 'dismissed';

export interface Decision {
  key: string;
  kind: DecisionKind;
  patientId: string;
  openingId: string;
  choice: number;
  pairing?: Pairing;
  newSinceSnapshot?: boolean;
}

export interface NearFutureItem {
  id: string;
  openingId: string;
  kind: 'opens_on' | 'may_return' | 'no_date';
  date?: string;
  slots: number;
  title: string; // "Opens Dec 1" | "1 slot may come back Nov 24" | "On hold, no date set"
  note: string;
  /** accepted pairing whose slot returns without consent */
  heldForPatientId?: string;
  waiting: { patientId: string; why: 'queued' | 'watching' | 'fits' }[];
  /** patients who fit but already have a proposal or a held slot elsewhere */
  placedElsewhere: number;
}

export type BoardStatus = 'slot_accepted' | 'pre_screening' | 'seeking' | 'near_future' | 'no_possible' | 'not_queued';

export interface PatientView {
  patient: Patient;
  matches: Match[];
  matchById: Record<string, Match>;
  inReview: boolean;
  possibleNow: string[]; // opening ids
  possibleSoon: string[]; // near-future item ids
  decision?: Decision;
  blocked?: Blocked;
  boardStatus: BoardStatus;
  fixedPairing?: Pairing;
  openStep?: { pairing: Pairing; step: Step };
  /** the date the patient's ranking starts from (earliest queue date) */
  queuedSince?: string;
}

export interface Board {
  openings: OpeningView[];
  openingById: Record<string, OpeningView>;
  patients: PatientView[];
  patientById: Record<string, PatientView>;
  decisions: Decision[];
  blocked: Blocked[];
  nearFuture: NearFutureItem[];
  proposals: { patientId: string; openingId: string }[];
  tiles: { inReview: number; openNow: number; openingSoon: number; openingSoonNoDate: number; blocked: number };
  sinceSnapshot: { accepted: number; dismissed: number; newProposals: number; droppedProposals: number };
}

const DISMISS_LABEL: Record<string, string> = {
  patient_declined: 'Patient declined',
  not_a_fit: 'Not a fit on review',
  wrong_timing: 'Wrong timing, keep for later',
  other: 'Other',
};
export const dismissReasonLabel = (r?: string) => (r ? DISMISS_LABEL[r] ?? r : '');

const key = (patientId: string, openingId: string) => `${patientId}|${openingId}`;

export function priorityDate(p: Patient): string | undefined {
  return p.queue.map((e) => e.queuedOn).sort()[0];
}

function byPriority(a: Patient, b: Patient): number {
  const da = priorityDate(a) ?? '9999';
  const db = priorityDate(b) ?? '9999';
  if (da !== db) return da < db ? -1 : 1;
  return a.last.localeCompare(b.last);
}

export function computeBoard(state: Pick<DemoState, 'patients' | 'trials' | 'pairings'> & { snapshot?: Snapshot }): Board {
  const { patients, trials, pairings, snapshot } = state;
  const openingPairs = trials.flatMap((trial) => trial.openings.map((opening) => ({ trial, opening })));
  const openingOf = (id: string) => openingPairs.find((x) => x.opening.id === id);

  // matches
  const matchesBy: Record<string, Record<string, Match>> = {};
  const matchLists: Record<string, Match[]> = {};
  for (const p of patients) {
    const list = matchPatient(p, trials);
    matchLists[p.id] = list;
    matchesBy[p.id] = Object.fromEntries(list.map((m) => [m.openingId, m]));
  }
  const matchOf = (pid: string, oid: string) => matchesBy[pid]?.[oid];

  // pairings
  const fixed = pairings.filter((pr) => pr.status === 'accepted' || pr.status === 'pre_screening');
  const fixedByPatient = Object.fromEntries(fixed.map((pr) => [pr.patientId, pr]));
  const dismissedPairings = pairings.filter((pr) => pr.status === 'dismissed');
  const dismissedKeys = new Set(dismissedPairings.map((pr) => key(pr.patientId, pr.openingId)));

  // capacity
  const openNow: Record<string, number> = {};
  for (const { opening } of openingPairs) {
    const held = opening.externalHolds.length + fixed.filter((pr) => pr.openingId === opening.id).length;
    openNow[opening.id] = opening.state === 'open' ? Math.max(0, opening.slotsTotal - held) : 0;
  }
  const remaining = { ...openNow };

  // allocation
  const placeable = patients
    .filter((p) => p.status === 'seeking' && p.queue.length > 0 && !fixedByPatient[p.id])
    .sort(byPriority);
  const assignment: Record<string, { openingId: string; choice: number }> = {};
  for (const p of placeable) {
    for (let i = 0; i < p.queue.length; i++) {
      const oid = p.queue[i].openingId;
      const o = openingOf(oid);
      if (!o || o.opening.state !== 'open') continue;
      if (!isFit(matchOf(p.id, oid))) continue;
      if (dismissedKeys.has(key(p.id, oid))) continue;
      if (remaining[oid] > 0) {
        assignment[p.id] = { openingId: oid, choice: i + 1 };
        remaining[oid] -= 1;
        break;
      }
    }
  }
  const proposals = Object.entries(assignment).map(([patientId, a]) => ({ patientId, openingId: a.openingId }));

  // possible slots now
  const possibleNowOf = (p: Patient) =>
    openingPairs
      .filter(({ opening }) => opening.state === 'open' && openNow[opening.id] > 0 && isFit(matchOf(p.id, opening.id)))
      .map(({ opening }) => opening.id);

  // near future
  const nearFuture: NearFutureItem[] = [];
  const seekingLike = (p: Patient) => p.status === 'seeking' || p.status === 'undeclared';
  const waitingFor = (oid: string, exclude: string[] = []) => {
    const out: NearFutureItem['waiting'] = [];
    const seen = new Set(exclude);
    const add = (patientId: string, why: 'queued' | 'watching' | 'fits') => {
      if (seen.has(patientId)) return;
      seen.add(patientId);
      out.push({ patientId, why });
    };
    const eligible = patients.filter((p) => seekingLike(p) && !fixedByPatient[p.id] && isFit(matchOf(p.id, oid)));
    eligible.filter((p) => p.queue.some((e) => e.openingId === oid) && !assignment[p.id]).sort(byPriority).forEach((p) => add(p.id, 'queued'));
    const o = openingOf(oid);
    patients
      .filter((p) => p.watches.some((w) => w.reason === 'slot' && (w.openingId === oid || (!w.openingId && w.trialId === o?.trial.id))))
      .forEach((p) => add(p.id, 'watching'));
    eligible.filter((p) => !assignment[p.id]).sort(byPriority).forEach((p) => add(p.id, 'fits'));
    return out;
  };
  for (const { opening } of openingPairs) {
    if (opening.state === 'on_hold') {
      nearFuture.push(
        opening.opensOn
          ? {
              id: `nf-open-${opening.id}`,
              openingId: opening.id,
              kind: 'opens_on',
              date: opening.opensOn,
              slots: opening.slotsTotal,
              title: `Opens ${fmtShort(opening.opensOn)}`,
              note: `On hold · ${opening.slotsTotal} slots when it opens`,
              placedElsewhere: 0,
              waiting: waitingFor(opening.id),
            }
          : {
              id: `nf-nodate-${opening.id}`,
              openingId: opening.id,
              kind: 'no_date',
              slots: opening.slotsTotal,
              title: 'On hold, no date set',
              note: `${opening.slotsTotal} slots when it opens`,
              placedElsewhere: 0,
              waiting: waitingFor(opening.id),
            },
      );
    }
    opening.externalHolds.forEach((h, i) => {
      if (!h.mayReturnOn) return;
      nearFuture.push({
        id: `nf-ext-${opening.id}-${i}`,
        openingId: opening.id,
        kind: 'may_return',
        date: h.mayReturnOn,
        slots: 1,
        title: `1 slot may come back ${fmtShort(h.mayReturnOn)}`,
        note: h.returnNote ?? h.label,
        placedElsewhere: 0,
              waiting: waitingFor(opening.id),
      });
    });
    fixed
      .filter((pr) => pr.openingId === opening.id && pr.status === 'accepted' && pr.holdUntil)
      .filter((pr) => !pr.steps.find((s) => s.kind === 'consent_call')?.doneAt)
      .forEach((pr) => {
        nearFuture.push({
          id: `nf-hold-${pr.id}`,
          openingId: opening.id,
          kind: 'may_return',
          date: pr.holdUntil,
          slots: 1,
          title: `1 slot back ${fmtShort(pr.holdUntil!)} without consent`,
          note: `Held without consent; returns if consent is not reached by ${fmtShort(pr.holdUntil!)}`,
          heldForPatientId: pr.patientId,
          placedElsewhere: 0,
              waiting: waitingFor(opening.id, [pr.patientId]),
        });
      });
  }
  for (const n of nearFuture) {
    n.placedElsewhere = patients.filter(
      (p) => seekingLike(p) && p.id !== n.heldForPatientId && isFit(matchOf(p.id, n.openingId)) && (!!assignment[p.id] || !!fixedByPatient[p.id]),
    ).length;
  }
  nearFuture.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));

  // blocked
  const blocked: Blocked[] = [];
  const blockedBy: Record<string, Blocked> = {};
  for (const p of placeable) {
    if (assignment[p.id]) continue;
    const queueIds = p.queue.map((e) => e.openingId);
    const hintOpeningIds = possibleNowOf(p).filter((oid) => !queueIds.includes(oid));
    const fitIds = queueIds.filter((oid) => isFit(matchOf(p.id, oid)));
    let b: Blocked;
    if (fitIds.length === 0) {
      const sc = queueIds.map((oid) => matchOf(p.id, oid)).find((m) => m?.result === 'needs_status_change');
      const stage = p.clinical.stage ? `Stage ${p.clinical.stage}` : 'not staged';
      b = {
        patientId: p.id,
        reason: 'no_longer_eligible',
        label: 'No longer eligible',
        detail: sc
          ? `Re-matched ${fmtShort(p.matchesCheckedOn)}: ${labelFor(trials, sc.openingId)} needs ${sc.needs}; the record says ${stage}. Still on the Interest List.`
          : `Not eligible for ${queueIds.map((oid) => labelFor(trials, oid)).join(', ')} on the ${fmtShort(p.matchesCheckedOn)} match. Still on the Interest List.`,
        openingIds: queueIds,
        hintOpeningIds,
      };
    } else {
      const live = fitIds.filter((oid) => !dismissedKeys.has(key(p.id, oid)));
      if (live.length === 0) {
        const pr = dismissedPairings.filter((x) => x.patientId === p.id).sort((a, c) => (a.decidedAt < c.decidedAt ? 1 : -1))[0];
        b = {
          patientId: p.id,
          reason: 'dismissed',
          label: 'Dismissed by the team',
          detail: `${labelFor(trials, pr.openingId)} · ${dismissReasonLabel(pr.dismissReason)}${pr.dismissNote ? `: ${pr.dismissNote}` : ''}. Still on the Interest List.`,
          openingIds: fitIds,
          hintOpeningIds,
          pairing: pr,
        };
      } else {
        const withSlots = live.filter((oid) => openNow[oid] > 0);
        if (withSlots.length === 0) {
          const soon = nearFuture.find((n) => live.includes(n.openingId) && n.date);
          const names = live.map((oid) => labelFor(trials, oid)).join(' or ');
          b = {
            patientId: p.id,
            reason: 'no_slot_in_opening',
            label: 'No open slot in the opening',
            detail: `Fits only ${names} on the Interest List, which ${live.length > 1 ? 'have' : 'has'} no open slot here.${soon ? ` ${soon.title}.` : ''}`,
            openingIds: live,
            hintOpeningIds,
          };
        } else {
          const oid = withSlots[0];
          const ahead = proposals.filter((x) => x.openingId === oid).map((x) => x.patientId);
          const n = openNow[oid];
          b = {
            patientId: p.id,
            reason: 'outranked',
            label: 'Lost to a higher rank',
            detail: `${labelFor(trials, oid)}: ${n} open slot${n === 1 ? '' : 's'}, all proposed to patients ranked ahead. Next in line if one falls through.`,
            openingIds: withSlots,
            hintOpeningIds,
            aheadIds: ahead,
          };
        }
      }
    }
    blocked.push(b);
    blockedBy[p.id] = b;
  }

  // openings
  const openings: OpeningView[] = openingPairs.map(({ trial, opening }) => {
    const queued = patients
      .filter((p) => p.status !== 'not_seeking' && p.queue.some((e) => e.openingId === opening.id))
      .sort(byPriority);
    const rows: Candidate[] = queued.map((p) => {
      const m = matchOf(p.id, opening.id)!;
      const fx = fixedByPatient[p.id];
      const asg = assignment[p.id];
      let status: CandidateStatus;
      let elsewhereOpeningId: string | undefined;
      if (fx?.openingId === opening.id) status = fx.status as 'accepted' | 'pre_screening';
      else if (asg?.openingId === opening.id) status = 'proposed';
      else if (dismissedKeys.has(key(p.id, opening.id))) status = 'dismissed';
      else if (!isFit(m)) status = 'not_eligible';
      else if (fx || asg) {
        status = 'placed_elsewhere';
        elsewhereOpeningId = fx?.openingId ?? asg?.openingId;
      } else status = 'reserve';
      return {
        patientId: p.id,
        status,
        choice: p.queue.findIndex((e) => e.openingId === opening.id) + 1,
        elsewhereOpeningId,
        match: m,
        blocked: !!blockedBy[p.id],
      };
    });
    const eligibleRows = rows.filter((r) => r.status !== 'not_eligible');
    eligibleRows.forEach((r, i) => (r.rank = i + 1));
    const candidates = [...eligibleRows, ...rows.filter((r) => r.status === 'not_eligible')];
    const queuedIds = new Set(queued.map((p) => p.id));
    const proposed = proposals.filter((x) => x.openingId === opening.id).map((x) => x.patientId);
    return {
      trial,
      opening,
      short: openingShort(trial, opening),
      full: openingFull(trial, opening),
      openNow: openNow[opening.id],
      fixed: fixed.filter((pr) => pr.openingId === opening.id),
      proposed,
      candidates,
      fitNotQueued: patients
        .filter((p) => seekingLike(p) && !queuedIds.has(p.id) && !fixedByPatient[p.id] && isFit(matchOf(p.id, opening.id)))
        .map((p) => p.id),
      watching: patients
        .filter((p) => p.watches.some((w) => w.reason === 'slot' && (w.openingId === opening.id || (!w.openingId && w.trialId === trial.id))))
        .map((p) => p.id),
      blocks: candidates.filter((c) => c.status === 'reserve' && c.blocked).map((c) => c.patientId),
      unfilled: Math.max(0, openNow[opening.id] - proposed.length),
    };
  });
  const openingById = Object.fromEntries(openings.map((o) => [o.opening.id, o]));

  // decisions
  const inSnapshot = (pid: string, oid: string) => !!snapshot?.proposals.some((x) => x.patientId === pid && x.openingId === oid);
  const decisions: Decision[] = [
    ...proposals.map((x) => ({
      key: `prop|${x.patientId}|${x.openingId}`,
      kind: 'proposed' as const,
      patientId: x.patientId,
      openingId: x.openingId,
      choice: assignment[x.patientId].choice,
      newSinceSnapshot: snapshot ? !inSnapshot(x.patientId, x.openingId) : false,
    })),
    ...fixed.map((pr) => ({
      key: pr.id,
      kind: pr.status as 'accepted' | 'pre_screening',
      patientId: pr.patientId,
      openingId: pr.openingId,
      choice: pr.choice,
      pairing: pr,
    })),
    ...dismissedPairings.map((pr) => ({
      key: pr.id,
      kind: 'dismissed' as const,
      patientId: pr.patientId,
      openingId: pr.openingId,
      choice: pr.choice,
      pairing: pr,
    })),
  ];

  // patients
  const patientViews: PatientView[] = patients.map((p) => {
    const fx = fixedByPatient[p.id];
    const inReview = p.status !== 'not_seeking' && (p.queue.length > 0 || !!p.addedToReviewBy || !!fx);
    const possibleNow = possibleNowOf(p);
    const possibleSoon = nearFuture.filter((n) => n.heldForPatientId !== p.id && n.waiting.some((w) => w.patientId === p.id)).map((n) => n.id);
    const decision =
      decisions.find((d) => d.patientId === p.id && (d.kind === 'accepted' || d.kind === 'pre_screening')) ??
      decisions.find((d) => d.patientId === p.id && d.kind === 'proposed') ??
      decisions.filter((d) => d.patientId === p.id && d.kind === 'dismissed').sort((a, b) => ((a.pairing?.decidedAt ?? '') < (b.pairing?.decidedAt ?? '') ? 1 : -1))[0];
    let boardStatus: BoardStatus;
    if (fx?.status === 'accepted') boardStatus = 'slot_accepted';
    else if (fx?.status === 'pre_screening') boardStatus = 'pre_screening';
    else if (inReview && p.queue.length === 0) boardStatus = 'not_queued';
    else if (possibleNow.length > 0) boardStatus = 'seeking';
    else if (possibleSoon.length > 0) boardStatus = 'near_future';
    else boardStatus = 'no_possible';
    const openStep = fx ? fx.steps.find((s) => !s.doneAt && !s.auto) : undefined;
    return {
      patient: p,
      matches: matchLists[p.id],
      matchById: matchesBy[p.id],
      inReview,
      possibleNow,
      possibleSoon,
      decision,
      blocked: blockedBy[p.id],
      boardStatus,
      fixedPairing: fx,
      openStep: fx && openStep ? { pairing: fx, step: openStep } : undefined,
      queuedSince: priorityDate(p),
    };
  });

  const snapAt = snapshot?.at ?? '0000';
  const sinceSnapshot = {
    accepted: pairings.filter((pr) => pr.status !== 'dismissed' && pr.decidedAt >= snapAt).length,
    dismissed: dismissedPairings.filter((pr) => pr.decidedAt >= snapAt).length,
    newProposals: decisions.filter((d) => d.kind === 'proposed' && d.newSinceSnapshot).length,
    droppedProposals: (snapshot?.proposals ?? []).filter(
      // a proposal the team accepted or dismissed is counted there, not as dropped
      (x) => !proposals.some((y) => y.patientId === x.patientId && y.openingId === x.openingId) && !pairings.some((pr) => pr.patientId === x.patientId && pr.openingId === x.openingId),
    ).length,
  };

  const reviewViews = patientViews.filter((v) => v.inReview);
  return {
    openings,
    openingById,
    patients: patientViews,
    patientById: Object.fromEntries(patientViews.map((v) => [v.patient.id, v])),
    decisions,
    blocked,
    nearFuture,
    proposals,
    tiles: {
      inReview: reviewViews.length,
      openNow: openings.reduce((n, o) => n + o.openNow, 0),
      openingSoon: nearFuture.filter((n) => n.date && daysBetween(TODAY, n.date) <= 28).reduce((n, x) => n + x.slots, 0),
      openingSoonNoDate: nearFuture.filter((n) => n.kind === 'no_date').length,
      blocked: blocked.length,
    },
    sinceSnapshot,
  };
}
