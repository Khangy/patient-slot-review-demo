import type { DemoState, Opening, Pairing, Patient, PlaceReason, Snapshot, Step, Trial, UserId } from './types';
import { isFit, matchPatient, type Match } from './matching';
import { daysBetween, fmtShort, TODAY } from './dates';
import { labelFor, openingFull, openingShort, ordinal } from './names';
import { makeSolver } from './optimizer';

// Everything the Patient Slot Review board and the patient pages derive from the demo state.
// computeBoard is pure: the store memoizes it, so every change (accept, dismiss, queue, re-check)
// flows to every column at once.
//
// The optimizer is the app's (optimizer.ts): the Interest List is a set, not a ranking. Every
// queued slot the patient fits counts the same, the plan seats as many patients as it can, and
// only ties go to whoever entered the pool first. Accepted and pre-screening pairings keep their
// slots and take the patient out of the pool. Next in line for an opening is who would get a
// slot if one of its offers fell through, from the same re-solve the app uses for backfill.
//
// Kept from the demo's design, not the app: a dismissed pairing is never proposed again (the
// app's reject leaves the patient in the pool, so its next run may propose the same pairing).

export type CandidateStatus =
  | 'accepted'
  | 'pre_screening'
  | 'proposed'
  | 'next_in_line'
  | 'placed_elsewhere'
  | 'queued'
  | 'dismissed'
  | 'not_eligible';

export interface Candidate {
  patientId: string;
  status: CandidateStatus;
  /** next_in_line: 1 = first to get a slot here if an offer falls through */
  inLine?: number;
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
  /** who would get a slot here if one of its offers fell through, first in line first */
  nextInLine: string[];
  /** proposals, then next in line, then everyone else queued, then not eligible */
  candidates: Candidate[];
  /** patients (seeking or undeclared) who fit but are not queued here */
  fitNotQueued: string[];
  watching: string[];
  /** queued candidates left with no slot anywhere if this goes as proposed */
  blocks: string[];
  /** open slots nobody is proposed for */
  unfilled: number;
}

export type BlockedReason = 'no_slot_in_opening' | 'seats_taken' | 'no_longer_eligible' | 'dismissed';

export interface Blocked {
  patientId: string;
  reason: BlockedReason;
  label: string; // chip text
  detail: string; // one sentence, no patient names (the UI adds them in the board's name mode)
  openingIds: string[];
  /** open now, the patient fits, but it is not on their Interest List */
  hintOpeningIds: string[];
  /** seats_taken: who holds the proposals in those openings */
  aheadIds?: string[];
  /** seats_taken: first in line here if an offer falls through (opening id, place in line) */
  inLine?: { openingId: string; n: number };
  pairing?: Pairing; // dismissed
}

export type DecisionKind = 'proposed' | 'accepted' | 'pre_screening' | 'dismissed';

export interface Decision {
  key: string;
  kind: DecisionKind;
  patientId: string;
  openingId: string;
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
  /** pool seniority: the earliest queue date among the slots they fit; breaks ties only */
  inPoolSince?: string;
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
  sinceSnapshot: { accepted: number; placed: number; dismissed: number; newProposals: number; droppedProposals: number };
}

const DISMISS_LABEL: Record<string, string> = {
  patient_declined: 'Patient declined',
  not_a_fit: 'Not a fit on review',
  wrong_timing: 'Wrong timing, keep for later',
  other: 'Other',
};
export const dismissReasonLabel = (r?: string) => (r ? DISMISS_LABEL[r] ?? r : '');

export const PLACE_REASONS: { value: PlaceReason; label: string }[] = [
  { value: 'clinical_urgency', label: 'Clinical urgency' },
  { value: 'patient_preference', label: 'Patient preference' },
  { value: 'pi_decision', label: 'PI decision' },
  { value: 'other', label: 'Other' },
];
export const placeReasonLabel = (r?: string) => PLACE_REASONS.find((x) => x.value === r)?.label ?? r ?? '';

const key = (patientId: string, openingId: string) => `${patientId}|${openingId}`;

/** Next-in-line names per opening, as the app computes backfill (it stores 2 per seat). */
const BACKFILL_DEPTH = 2;

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

  // Pool seniority, as the app reads it: the earliest of the patient's queued rows that are
  // still a fit (eligible or pending review). It only ever breaks ties.
  const inPoolSince = (p: Patient): string | undefined =>
    p.queue
      .filter((e) => isFit(matchOf(p.id, e.openingId)))
      .map((e) => e.queuedOn)
      .sort()[0] ?? p.queue.map((e) => e.queuedOn).sort()[0];
  const bySeniority = (a: Patient, b: Patient): number => {
    const da = inPoolSince(a) ?? '9999';
    const db = inPoolSince(b) ?? '9999';
    if (da !== db) return da < db ? -1 : 1;
    return a.last.localeCompare(b.last) || a.id.localeCompare(b.id);
  };

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

  // ── allocation: the app's optimizer ──
  // The pool: seeking patients without a held slot, with every open slot they are queued for
  // and fit (in any order: the Interest List is a set).
  const wantsOf = (p: Patient) =>
    p.queue
      .map((e) => e.openingId)
      .filter((oid) => openNow[oid] > 0 && isFit(matchOf(p.id, oid)) && !dismissedKeys.has(key(p.id, oid)));
  const placeable = patients.filter((p) => p.status === 'seeking' && p.queue.length > 0 && !fixedByPatient[p.id]).sort(bySeniority);
  const pool = placeable.map((p) => ({ p, wants: wantsOf(p) })).filter((x) => x.wants.length > 0);
  // One column per open slot, in trial order. An opening never needs more columns than patients
  // who want it (the playground's cap): the plan is the same, the solve is smaller.
  const seats: { openingId: string; trialId: string }[] = [];
  for (const { trial, opening } of openingPairs) {
    const want = pool.filter((x) => x.wants.includes(opening.id)).length;
    for (let k = 0; k < Math.min(openNow[opening.id], want); k++) seats.push({ openingId: opening.id, trialId: trial.id });
  }
  const solve = makeSolver({
    fits: pool.map((x) => seats.map((s) => x.wants.includes(s.openingId))),
    seniority: pool.map((x) => Date.parse(inPoolSince(x.p) ?? '9999-12-31')),
    slotGroups: seats.map((s) => s.trialId),
  });
  const plan = solve();
  const assignment: Record<string, string> = {};
  plan.forEach((j, i) => {
    if (j >= 0) assignment[pool[i].p.id] = seats[j].openingId;
  });
  const proposals = pool.filter((x) => assignment[x.p.id]).map((x) => ({ patientId: x.p.id, openingId: assignment[x.p.id] }));

  // Next in line, from the app's backfill re-solve: take one proposed patient out of the trial
  // and re-solve; whoever gets a slot then and has none now is next in line, then the one after.
  // (The app keeps the patient who lands in that exact seat; with several identical slots in
  // one opening that can be someone already proposed there, so the board reads it per opening.)
  const lineRank: Record<string, Record<string, number>> = {};
  const unplaced = (i: number) => plan[i] < 0;
  plan.forEach((j, occupant) => {
    if (j < 0) return;
    const oid = seats[j].openingId;
    const banned = new Set<number>([occupant]);
    for (let k = 1; k <= BACKFILL_DEPTH; k++) {
      const cf = solve({ banned, group: seats[j].trialId });
      const next = cf.findIndex((sj, i) => sj >= 0 && seats[sj].openingId === oid && !banned.has(i) && unplaced(i));
      if (next < 0) break;
      const pid = pool[next].p.id;
      const ranks = (lineRank[oid] ??= {});
      ranks[pid] = Math.min(ranks[pid] ?? k, k);
      banned.add(next);
    }
  });
  const order = new Map(pool.map((x, i) => [x.p.id, i]));
  const nextInLineOf = (oid: string) =>
    Object.entries(lineRank[oid] ?? {})
      .sort(([a, ra], [b, rb]) => ra - rb || (order.get(a) ?? 0) - (order.get(b) ?? 0))
      .map(([pid]) => pid);

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
    eligible.filter((p) => p.queue.some((e) => e.openingId === oid) && !assignment[p.id]).sort(bySeniority).forEach((p) => add(p.id, 'queued'));
    const o = openingOf(oid);
    patients
      .filter((p) => p.watches.some((w) => w.reason === 'slot' && (w.openingId === oid || (!w.openingId && w.trialId === o?.trial.id))))
      .forEach((p) => add(p.id, 'watching'));
    eligible.filter((p) => !assignment[p.id]).sort(bySeniority).forEach((p) => add(p.id, 'fits'));
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
          // Every slot they want is proposed to someone else. With the plan already seating as
          // many patients as it can, those are patients who entered the pool earlier (or the
          // same day): seating this one instead would only swap who waits.
          const n = withSlots.reduce((sum, oid) => sum + openNow[oid], 0);
          const ahead = proposals.filter((x) => withSlots.includes(x.openingId)).map((x) => x.patientId);
          const line = withSlots
            .map((oid) => ({ openingId: oid, n: nextInLineOf(oid).indexOf(p.id) + 1 }))
            .filter((x) => x.n > 0)
            .sort((a, c) => a.n - c.n)[0];
          const names = withSlots.map((oid) => labelFor(trials, oid)).join(' and ');
          b = {
            patientId: p.id,
            reason: 'seats_taken',
            label: line ? 'Next in line' : 'Slots proposed to others',
            detail:
              `${names}: ${n} open slot${n === 1 ? '' : 's'}, all proposed to others. The plan already seats as many patients as it can, and ties go to whoever entered the pool first. ` +
              (line
                ? `${line.n === 1 ? 'First' : ordinal(line.n)} in line ${withSlots.length === 1 ? 'there' : `for ${labelFor(trials, line.openingId)}`} if an offer falls through.`
                : 'Not next in line yet.'),
            openingIds: withSlots,
            hintOpeningIds,
            aheadIds: ahead,
            inLine: line,
          };
        }
      }
    }
    blocked.push(b);
    blockedBy[p.id] = b;
  }

  // openings
  const STATUS_ORDER: CandidateStatus[] = ['accepted', 'pre_screening', 'proposed', 'next_in_line', 'placed_elsewhere', 'queued', 'dismissed', 'not_eligible'];
  const openings: OpeningView[] = openingPairs.map(({ trial, opening }) => {
    const queued = patients
      .filter((p) => p.status !== 'not_seeking' && p.queue.some((e) => e.openingId === opening.id))
      .sort(bySeniority);
    const line = nextInLineOf(opening.id);
    const rows: Candidate[] = queued.map((p) => {
      const m = matchOf(p.id, opening.id)!;
      const fx = fixedByPatient[p.id];
      const asg = assignment[p.id];
      let status: CandidateStatus;
      let elsewhereOpeningId: string | undefined;
      if (fx?.openingId === opening.id) status = fx.status as 'accepted' | 'pre_screening';
      else if (asg === opening.id) status = 'proposed';
      else if (dismissedKeys.has(key(p.id, opening.id))) status = 'dismissed';
      else if (!isFit(m)) status = 'not_eligible';
      else if (fx || asg) {
        status = 'placed_elsewhere';
        elsewhereOpeningId = fx?.openingId ?? asg;
      } else if (line.includes(p.id)) status = 'next_in_line';
      else status = 'queued';
      return {
        patientId: p.id,
        status,
        inLine: status === 'next_in_line' ? line.indexOf(p.id) + 1 : undefined,
        elsewhereOpeningId,
        match: m,
        blocked: !!blockedBy[p.id],
      };
    });
    // stable sort: within a status, pool seniority (next in line: their place in line)
    const candidates = rows
      .map((r, i) => ({ r, i }))
      .sort((a, b) => STATUS_ORDER.indexOf(a.r.status) - STATUS_ORDER.indexOf(b.r.status) || (a.r.inLine ?? 0) - (b.r.inLine ?? 0) || a.i - b.i)
      .map((x) => x.r);
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
      nextInLine: line.filter((pid) => rows.some((r) => r.patientId === pid && r.status === 'next_in_line')),
      candidates,
      fitNotQueued: patients
        .filter((p) => seekingLike(p) && !queuedIds.has(p.id) && !fixedByPatient[p.id] && isFit(matchOf(p.id, opening.id)))
        .map((p) => p.id),
      watching: patients
        .filter((p) => p.watches.some((w) => w.reason === 'slot' && (w.openingId === opening.id || (!w.openingId && w.trialId === trial.id))))
        .map((p) => p.id),
      blocks: candidates.filter((c) => (c.status === 'next_in_line' || c.status === 'queued') && c.blocked).map((c) => c.patientId),
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
      newSinceSnapshot: snapshot ? !inSnapshot(x.patientId, x.openingId) : false,
    })),
    ...fixed.map((pr) => ({
      key: pr.id,
      kind: pr.status as 'accepted' | 'pre_screening',
      patientId: pr.patientId,
      openingId: pr.openingId,
      pairing: pr,
    })),
    ...dismissedPairings.map((pr) => ({
      key: pr.id,
      kind: 'dismissed' as const,
      patientId: pr.patientId,
      openingId: pr.openingId,
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
      inPoolSince: inPoolSince(p),
    };
  });

  const snapAt = snapshot?.at ?? '0000';
  const sinceSnapshot = {
    accepted: pairings.filter((pr) => pr.status !== 'dismissed' && !pr.placedByHand && pr.decidedAt >= snapAt).length,
    placed: pairings.filter((pr) => pr.status !== 'dismissed' && !!pr.placedByHand && pr.decidedAt >= snapAt).length,
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

// ── Drag a patient onto a slot ──────────────────────────────────────────

export type PlaceCheck =
  | { ok: false; reason: string }
  /** accept: the optimizer already proposed this pairing; place: by hand, a deviation from the plan */
  | { ok: true; kind: 'accept' | 'place' };

/** Can this patient go into this opening's slot right now, and is it an Accept or a placement by hand? */
export function placeCheck(board: Board, patientId: string, openingId: string): PlaceCheck {
  const pv = board.patientById[patientId];
  const ov = board.openingById[openingId];
  if (!pv || !ov) return { ok: false, reason: 'Not a slot' };
  const fx = pv.fixedPairing;
  if (fx) {
    const what = fx.status === 'accepted' ? 'Accepted' : 'Pre-screening';
    return { ok: false, reason: fx.openingId === openingId ? `${what} here already` : `${what} for ${board.openingById[fx.openingId]?.short ?? 'another slot'}: undo that first` };
  }
  if (pv.patient.status === 'not_seeking') return { ok: false, reason: 'Not seeking: change the status first' };
  if (ov.opening.state !== 'open') return { ok: false, reason: 'On hold: no slot open yet' };
  const m = pv.matchById[openingId];
  if (!isFit(m)) {
    if (m?.result === 'needs_status_change') return { ok: false, reason: `Not a fit until the record shows ${m.needs}` };
    const chk = m?.checks.find((x) => x.outcome === 'not_met');
    return { ok: false, reason: chk ? `Not a fit: ${chk.patientHas}, needs ${chk.trialWants}` : 'Not a fit' };
  }
  if (ov.openNow === 0) return { ok: false, reason: 'No open slot here' };
  if (pv.decision?.kind === 'proposed' && pv.decision.openingId === openingId) return { ok: true, kind: 'accept' };
  return { ok: true, kind: 'place' };
}

export interface PlaceChange {
  patientId: string;
  /** their proposal before the placement (undefined: none) */
  from?: string;
  /** their proposal after it (undefined: none) */
  to?: string;
  /** set when they end up with no proposal */
  blockedLabel?: string;
  blockedReason?: BlockedReason;
}

/**
 * Re-plans the board as if the patient were placed in the opening by hand, and lists every
 * other patient whose proposal changes: the one who loses this slot, and anyone who moves up
 * into the slot the patient was proposed for before.
 */
export function simulatePlace(
  state: Pick<DemoState, 'patients' | 'trials' | 'pairings'>,
  board: Board,
  patientId: string,
  openingId: string,
  me: UserId,
  at: string,
): { released?: string; changes: PlaceChange[] } {
  const sim = computeBoard({
    patients: state.patients,
    trials: state.trials,
    pairings: [
      ...state.pairings.filter((x) => !(x.patientId === patientId && x.openingId === openingId)),
      { id: 'sim', patientId, openingId, status: 'accepted', decidedAt: at, decidedBy: me, steps: [], trail: [], placedByHand: { reason: 'other' } },
    ],
  });
  const before = Object.fromEntries(board.proposals.map((x) => [x.patientId, x.openingId]));
  const after = Object.fromEntries(sim.proposals.map((x) => [x.patientId, x.openingId]));
  const changes: PlaceChange[] = [];
  for (const p of state.patients) {
    if (p.id === patientId || before[p.id] === after[p.id]) continue;
    const b = after[p.id] ? undefined : sim.patientById[p.id]?.blocked;
    changes.push({ patientId: p.id, from: before[p.id], to: after[p.id], blockedLabel: b?.label, blockedReason: b?.reason });
  }
  const mine = before[patientId];
  return { released: mine && mine !== openingId ? mine : undefined, changes };
}

export interface Alternative {
  openingId: string;
  /** patients who would lose their proposal and get no other (the price of the swap) */
  strands: string[];
}

/**
 * "Why this slot" for a proposal: the patient's other queued open slots, each with who would
 * be left without a slot if the team placed them there instead. The same question as the
 * playground's substitution impact matrix; an empty list means a free swap.
 */
export function alternativesFor(
  state: Pick<DemoState, 'patients' | 'trials' | 'pairings'>,
  board: Board,
  patientId: string,
  me: UserId,
  at: string,
): Alternative[] {
  const pv = board.patientById[patientId];
  if (!pv || pv.decision?.kind !== 'proposed') return [];
  const here = pv.decision.openingId;
  return pv.patient.queue
    .map((e) => e.openingId)
    .filter((oid) => oid !== here)
    .filter((oid) => {
      const c = placeCheck(board, patientId, oid);
      return c.ok && !state.pairings.some((x) => x.patientId === patientId && x.openingId === oid && x.status === 'dismissed');
    })
    .map((oid) => {
      const sim = simulatePlace(state, board, patientId, oid, me, at);
      return { openingId: oid, strands: sim.changes.filter((c) => c.from && !c.to).map((c) => c.patientId) };
    });
}
