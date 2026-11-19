import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  DemoState,
  DismissReason,
  FeedbackAnswer,
  Lab,
  NotSeekingReason,
  Pairing,
  PatientStatus,
  PlaceReason,
  Settings,
  Staging,
  Step,
  TeamMember,
  UserId,
  Watch,
} from '@/domain/types';
import { freshState, STATE_VERSION } from '@/domain/seed';
import { computeBoard, dismissReasonLabel, placeReasonLabel, type Board } from '@/domain/board';
import { addDays, demoNow, fmtShort, MEETING_SNAPSHOT_AT, nextBusinessDay, TODAY } from '@/domain/dates';
import { findOpening, labelFor, member } from '@/domain/names';
import { stageBase } from '@/domain/matching';

// One store for the whole demo. Actions clone the state, change the clone and log to the
// patient's Activity History, so both halves of the app (Patients, Patient Slot Review) stay
// in step. State persists in this browser; Reset demo restores the starting point.

const STORAGE_KEY = `psr-demo-state-v${STATE_VERSION}`;

export const NOT_SEEKING_LABEL: Record<NotSeekingReason, string> = {
  second_opinion: 'Came for second opinion',
  break: 'Break from cancer treatment',
  healthy: 'Healthy',
  standard_of_care: 'On standard of care treatment',
  comfort_care: 'Hospice or comfort care',
};

export const STATUS_LABEL: Record<PatientStatus, string> = {
  undeclared: 'Undeclared',
  seeking: 'Seeking',
  watchlist: 'Watchlist',
  not_seeking: 'Not seeking',
};

export const MAX_QUEUE = 3;

const rid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function initState(): DemoState {
  const base = freshState();
  try {
    // an explicit host theme (data-theme on <html>) wins over the OS setting
    const host = document.documentElement.dataset.theme;
    if (host === 'dark' || (host !== 'light' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)) base.settings.themeMode = 'dark';
  } catch {
    // keep light
  }
  const board = computeBoard({ ...base });
  return { ...base, snapshot: { at: MEETING_SNAPSHOT_AT, by: 'u-patel', proposals: board.proposals } };
}

function loadState(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed?.version === STATE_VERSION) return parsed;
    }
  } catch {
    // private window or blocked storage: start fresh
  }
  return initState();
}

function log(s: DemoState, patientId: string, at: string, verb: string, text: string, by?: UserId) {
  s.activity.unshift({ id: rid('a'), patientId, at, by, verb, text });
}

/** Accept (or place by hand): hold the slot and give each next step a person and a date. */
function acceptInto(
  s: DemoState,
  at: string,
  me: UserId,
  patientId: string,
  openingId: string,
  choice: number,
  plan: AcceptPlan,
  placedByHand?: Pairing['placedByHand'],
) {
  s.pairings = s.pairings.filter((pr) => !(pr.patientId === patientId && pr.openingId === openingId));
  const consentWho = member(plan.consentBy).short;
  const labsWho = member(plan.labsBy).short;
  const where = labelFor(s.trials, openingId);
  const how = placedByHand
    ? `Placed by hand at the meeting, ahead of the optimizer's order · ${placeReasonLabel(placedByHand.reason)}${placedByHand.note ? `: ${placedByHand.note}` : ''}.`
    : 'Accepted at the meeting.';
  const steps: Step[] = [
    { id: rid('st'), kind: 'accepted', label: placedByHand ? 'Placed at the meeting' : 'Accepted at the meeting', assignee: me, due: TODAY, doneAt: at, doneBy: me },
    { id: rid('st'), kind: 'consent_call', label: 'Consent call', assignee: plan.consentBy, due: plan.consentDue },
    { id: rid('st'), kind: 'prescreen_labs', label: 'Book pre-screen labs', assignee: plan.labsBy, dueText: 'after consent' },
    { id: rid('st'), kind: 'prescreening_opens', label: "Pre-screening opens on the patient's Enrollment tab", dueText: 'automatic', auto: true },
  ];
  s.pairings.push({
    id: rid('pair'),
    patientId,
    openingId,
    status: 'accepted',
    choice,
    decidedAt: at,
    decidedBy: me,
    holdUntil: addDays(TODAY, 7),
    placedByHand,
    steps,
    trail: [{ at, by: me, text: `${how} Consent call to ${consentWho}, due ${fmtShort(plan.consentDue)}; pre-screen labs to ${labsWho} after consent.` }],
  });
  log(
    s,
    patientId,
    at,
    placedByHand ? 'PLACED BY HAND' : 'ACCEPTED',
    `${where} at the Thursday meeting${placedByHand ? ` · ${placeReasonLabel(placedByHand.reason)}` : ''} · consent call: ${consentWho}, due ${fmtShort(plan.consentDue)}`,
    me,
  );
}

export interface QueueResult {
  ok: boolean;
  message: string;
}

export interface AcceptPlan {
  consentBy: UserId;
  consentDue: string;
  labsBy: UserId;
}

export interface Actions {
  setSettings(patch: Partial<Settings>): void;
  resetDemo(): void;
  setFeedback(questionId: string, answer: FeedbackAnswer): void;

  toggleFollow(patientId: string): void;
  setStatus(patientId: string, status: PatientStatus, reason?: NotSeekingReason): void;
  queue(patientId: string, openingId: string): QueueResult;
  unqueue(patientId: string, openingId: string): void;
  reorderQueue(patientId: string, openingIds: string[]): void;
  addWatch(patientId: string, watch: Omit<Watch, 'id' | 'since' | 'nextReview'>): void;
  keepWatch(patientId: string, watchId: string, note: string | undefined, lookAgainInDays: number): void;
  stopWatch(patientId: string, watchId: string): void;
  saveStaging(patientId: string, diagnosisId: string, staging: Omit<Staging, 'id'>, mode: 'new' | 'restaging' | 'fix'): void;
  recheckMatches(patientId: string): void;
  setPrimaryDiagnosis(patientId: string, diagnosisId: string): void;
  addLab(patientId: string, lab: Omit<Lab, 'id'>): void;
  updateDemographics(patientId: string, d: { mrn: string; dob: string; phone?: string; email?: string }): void;
  addToReview(patientId: string): void;
  removeFromReview(patientId: string): void;

  accept(patientId: string, openingId: string, choice: number, plan: AcceptPlan): void;
  /** Drag to a slot: places the patient ahead of the optimizer's order, with a reason. */
  place(patientId: string, openingId: string, plan: AcceptPlan, reason: PlaceReason, note?: string): void;
  dismiss(patientId: string, openingId: string, choice: number, reason: DismissReason, note?: string): void;
  undoPairing(pairingId: string): void;
  completeStep(pairingId: string, stepId: string): void;
  handOff(pairingId: string, stepId: string, to: UserId, note?: string, due?: string): void;
  addPairingNote(pairingId: string, text: string): void;
  /** Saves a new meeting snapshot (the demo board already re-plans live). */
  runOptimizer(): { added: number; removed: number; at: string };
}

interface Store {
  state: DemoState;
  board: Board;
  actions: Actions;
  /** demo clock, 'YYYY-MM-DDTHH:mm' */
  now(): string;
  me: TeamMember;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // storage unavailable: the demo still works for this visit
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [state]);

  const board = useMemo(() => computeBoard(state), [state]);

  const now = useCallback(() => demoNow(stateRef.current.clockStartedAt), []);

  /** Clone, mutate, commit. */
  const mutate = useCallback((fn: (draft: DemoState, at: string, me: UserId) => void) => {
    setState((prev) => {
      const draft: DemoState = structuredClone(prev);
      fn(draft, demoNow(prev.clockStartedAt), prev.settings.viewingAs);
      return draft;
    });
  }, []);

  const actions = useMemo<Actions>(() => {
    const patientIn = (s: DemoState, id: string) => s.patients.find((p) => p.id === id)!;
    const pairingIn = (s: DemoState, id: string) => s.pairings.find((p) => p.id === id)!;
    const name = (s: DemoState, oid: string) => labelFor(s.trials, oid);

    return {
      setSettings: (patch) => mutate((s) => void Object.assign(s.settings, patch)),
      resetDemo: () => {
        const keep = stateRef.current.settings;
        const fresh = initState();
        fresh.settings = { ...fresh.settings, themeMode: keep.themeMode };
        fresh.feedback = stateRef.current.feedback; // answers survive a reset
        setState(fresh);
      },
      setFeedback: (id, answer) => mutate((s) => void (s.feedback[id] = { ...s.feedback[id], ...answer })),

      toggleFollow: (patientId) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          const on = p.followers.includes(me);
          p.followers = on ? p.followers.filter((u) => u !== me) : [...p.followers, me];
          log(s, p.id, at, on ? 'UNFOLLOWED' : 'FOLLOWED', on ? 'Stopped following' : 'Following: alerts for this patient', me);
        }),

      setStatus: (patientId, status, reason) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          const from = STATUS_LABEL[p.status];
          p.status = status;
          p.statusSince = TODAY;
          p.notSeekingReason = status === 'not_seeking' ? reason : undefined;
          if (status === 'not_seeking') {
            p.queue.forEach((e) => log(s, p.id, at, 'REMOVED FROM QUEUE', name(s, e.openingId), me));
            p.queue = [];
            p.watches.forEach((w) => log(s, p.id, at, 'WATCH STOPPED', `${s.trials.find((t) => t.id === w.trialId)?.short}: not seeking`, me));
            p.watches = [];
            p.addedToReviewBy = undefined;
            const released = s.pairings.filter((pr) => pr.patientId === p.id && pr.status !== 'dismissed');
            released.forEach((pr) => log(s, p.id, at, 'SLOT RELEASED', name(s, pr.openingId), me));
            s.pairings = s.pairings.filter((pr) => !(pr.patientId === p.id && pr.status !== 'dismissed'));
          }
          const why = status === 'not_seeking' && reason ? ` · ${NOT_SEEKING_LABEL[reason]}` : '';
          log(s, p.id, at, 'STATUS CHANGED', `${from} → ${STATUS_LABEL[status]}${why}`, me);
        }),

      queue: (patientId, openingId) => {
        const s0 = stateRef.current;
        const p0 = patientIn(s0, patientId);
        if (p0.queue.some((e) => e.openingId === openingId)) return { ok: false, message: 'Already queued for this opening.' };
        if (p0.queue.length >= MAX_QUEUE) return { ok: false, message: `The queue is full (${MAX_QUEUE} of ${MAX_QUEUE}). Remove one first.` };
        if (p0.status === 'not_seeking') return { ok: false, message: 'Not seeking: change the status before queueing.' };
        const label = name(s0, openingId);
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          if (p.status !== 'seeking') {
            log(s, p.id, at, 'STATUS CHANGED', `${STATUS_LABEL[p.status]} → Seeking (queued a match)`, me);
            p.status = 'seeking';
            p.statusSince = TODAY;
          }
          p.queue.push({ openingId, queuedOn: TODAY, queuedBy: me });
          const trialId = findOpening(s.trials, openingId)?.trial.id;
          const ended = p.watches.filter((w) => w.trialId === trialId && (!w.openingId || w.openingId === openingId));
          ended.forEach(() => log(s, p.id, at, 'WATCH ENDED', `${label}: queued instead`, me));
          p.watches = p.watches.filter((w) => !ended.includes(w));
          log(s, p.id, at, 'QUEUED', `${label} (choice ${p.queue.length}) for Optimized Match`, me);
        });
        return { ok: true, message: `Queued for ${label}. Thursday's review picks it up.` };
      },

      unqueue: (patientId, openingId) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          p.queue = p.queue.filter((e) => e.openingId !== openingId);
          log(s, p.id, at, 'REMOVED FROM QUEUE', name(s, openingId), me);
        }),

      reorderQueue: (patientId, openingIds) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          p.queue = openingIds.map((oid) => p.queue.find((e) => e.openingId === oid)!).filter(Boolean);
          log(s, p.id, at, 'QUEUE REORDERED', p.queue.map((e, i) => `${i + 1}. ${name(s, e.openingId)}`).join('  '), me);
        }),

      addWatch: (patientId, watch) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          const w: Watch = { ...watch, id: rid('w'), since: TODAY, nextReview: addDays(TODAY, watch.reviewEveryDays) };
          p.watches.push(w);
          const where = w.openingId ? name(s, w.openingId) : `${s.trials.find((t) => t.id === w.trialId)?.short} (any opening)`;
          const what = w.reason === 'slot' ? 'waiting for a slot' : w.reason === 'status_change' ? `waiting for ${w.waitFor}` : 'other';
          log(s, p.id, at, 'WATCH STARTED', `${where} · ${what} · first review ${fmtShort(w.nextReview)}`, me);
        }),

      keepWatch: (patientId, watchId, note, days) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          const w = p.watches.find((x) => x.id === watchId);
          if (!w) return;
          w.nextReview = addDays(TODAY, days);
          if (note?.trim()) w.note = note.trim();
          w.statusChanged = undefined;
          log(s, p.id, at, 'KEPT', `Watch kept · next review ${fmtShort(w.nextReview)}${note?.trim() ? ` · "${note.trim()}"` : ''}`, me);
        }),

      stopWatch: (patientId, watchId) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          const w = p.watches.find((x) => x.id === watchId);
          p.watches = p.watches.filter((x) => x.id !== watchId);
          if (w) log(s, p.id, at, 'WATCH STOPPED', s.trials.find((t) => t.id === w.trialId)?.short ?? '', me);
        }),

      saveStaging: (patientId, diagnosisId, staging, mode) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          const dx = p.diagnoses.find((d) => d.id === diagnosisId);
          if (!dx) return;
          const old = p.clinical.stage;
          if (mode === 'fix' && dx.stagings.length) {
            const last = dx.stagings[dx.stagings.length - 1];
            Object.assign(last, staging);
          } else {
            dx.stagings.push({ ...staging, id: rid('s') });
          }
          const isPrimary = dx.primary || p.diagnoses.length === 1;
          if (isPrimary && old !== staging.group) {
            p.clinical.stage = staging.group;
            if (!p.matchBasis || !('stage' in p.matchBasis)) p.matchBasis = { ...(p.matchBasis ?? {}), stage: old };
            p.recordChangedOn = TODAY;
            p.recordChange = 'Staging changed';
            for (const w of p.watches) {
              if (w.reason === 'status_change' && w.waitFor === `Stage ${stageBase(staging.group)}`) {
                w.statusChanged = { from: old ? `Stage ${old}` : 'not staged', to: `Stage ${staging.group}`, on: TODAY };
                w.nextReview = TODAY;
                log(s, p.id, at, 'STATUS CHANGED', `${w.statusChanged.from} → ${w.statusChanged.to} · the ${s.trials.find((t) => t.id === w.trialId)?.short} watch was waiting for it`);
              }
            }
          }
          const verb = mode === 'fix' ? 'STAGING CORRECTED' : 'STAGED';
          log(s, p.id, at, verb, `Stage ${staging.group} (${staging.t} ${staging.n} ${staging.m}) dated ${fmtShort(staging.date)}`, me);
        }),

      recheckMatches: (patientId) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          p.matchBasis = undefined;
          p.matchesCheckedOn = TODAY;
          log(s, p.id, at, 'RE-CHECKED', 'Matches re-checked against the current record', me);
        }),

      setPrimaryDiagnosis: (patientId, diagnosisId) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          p.diagnoses.forEach((d) => (d.primary = d.id === diagnosisId));
          log(s, p.id, at, 'PRIMARY SET', p.diagnoses.find((d) => d.id === diagnosisId)?.label ?? '', me);
        }),

      addLab: (patientId, lab) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          p.labs.unshift({ ...lab, id: rid('lab') });
          log(s, p.id, at, 'LAB ADDED', `${lab.name} ${lab.value} ${lab.unit}`, me);
        }),

      updateDemographics: (patientId, d) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          Object.assign(p, d);
          log(s, p.id, at, 'DEMOGRAPHICS EDITED', 'MRN, date of birth or contact details', me);
        }),

      addToReview: (patientId) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          p.addedToReviewBy = me;
          log(s, p.id, at, 'ADDED TO REVIEW', "Thursday's Patient Slot Review", me);
        }),

      removeFromReview: (patientId) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          p.addedToReviewBy = undefined;
          log(s, p.id, at, 'REMOVED FROM REVIEW', "Thursday's Patient Slot Review", me);
        }),

      accept: (patientId, openingId, choice, plan) => mutate((s, at, me) => acceptInto(s, at, me, patientId, openingId, choice, plan)),

      place: (patientId, openingId, plan, reason, note) =>
        mutate((s, at, me) => {
          const p = patientIn(s, patientId);
          if (p.status !== 'seeking') {
            log(s, p.id, at, 'STATUS CHANGED', `${STATUS_LABEL[p.status]} → Seeking (placed in a slot)`, me);
            p.status = 'seeking';
            p.statusSince = TODAY;
          }
          const choice = p.queue.findIndex((e) => e.openingId === openingId) + 1;
          acceptInto(s, at, me, patientId, openingId, choice, plan, { reason, note: note?.trim() || undefined });
        }),

      dismiss: (patientId, openingId, choice, reason, note) =>
        mutate((s, at, me) => {
          s.pairings = s.pairings.filter((pr) => !(pr.patientId === patientId && pr.openingId === openingId));
          const text = `${dismissReasonLabel(reason)}${note?.trim() ? `: ${note.trim()}` : ''}`;
          s.pairings.push({
            id: rid('pair'),
            patientId,
            openingId,
            status: 'dismissed',
            choice,
            decidedAt: at,
            decidedBy: me,
            dismissReason: reason,
            dismissNote: note?.trim() || undefined,
            steps: [],
            trail: [{ at, by: me, text: `Dismissed at the meeting · ${text}` }],
          });
          log(s, patientId, at, 'DISMISSED', `${name(s, openingId)} · ${text}`, me);
        }),

      undoPairing: (pairingId) =>
        mutate((s, at, me) => {
          const pr = pairingIn(s, pairingId);
          if (!pr) return;
          s.pairings = s.pairings.filter((x) => x.id !== pairingId);
          log(s, pr.patientId, at, 'UNDONE', `${pr.status === 'dismissed' ? 'Dismissal' : 'Acceptance'} of ${name(s, pr.openingId)} undone`, me);
        }),

      completeStep: (pairingId, stepId) =>
        mutate((s, at, me) => {
          const pr = pairingIn(s, pairingId);
          const step = pr?.steps.find((x) => x.id === stepId);
          if (!pr || !step || step.doneAt) return;
          step.doneAt = at;
          step.doneBy = me;
          pr.trail.push({ at, by: me, text: `${step.label}: done` });
          log(s, pr.patientId, at, 'STEP DONE', `${step.label} · ${name(s, pr.openingId)}`, me);
          if (step.kind === 'consent_call') pr.holdUntil = undefined;
          if (step.kind === 'prescreen_labs') {
            const auto = pr.steps.find((x) => x.kind === 'prescreening_opens');
            if (auto) auto.doneAt = at;
            pr.status = 'pre_screening';
            const pi = findOpening(s.trials, pr.openingId)?.trial.pi ?? 'u-patel';
            pr.steps.push({ id: rid('st'), kind: 'review_results', label: 'Review pre-screen results', assignee: pi, due: nextBusinessDay(TODAY, 4) });
            pr.trail.push({ at, text: `Pre-screening opened. Results review assigned to ${member(pi).short}.` });
            log(s, pr.patientId, at, 'PRE-SCREENING', `Pre-screening opened for ${name(s, pr.openingId)}`);
          }
          const next = pr.steps.find((x) => !x.doneAt && !x.auto);
          if (next && !next.due) {
            next.due = nextBusinessDay(TODAY, 2);
            next.dueText = undefined;
          }
        }),

      handOff: (pairingId, stepId, to, note, due) =>
        mutate((s, at, me) => {
          const pr = pairingIn(s, pairingId);
          const step = pr?.steps.find((x) => x.id === stepId);
          if (!pr || !step) return;
          const from = step.assignee ? member(step.assignee).short : 'nobody';
          step.assignee = to;
          if (due) {
            step.due = due;
            step.dueText = undefined;
          }
          const text = `${step.label} handed from ${from} to ${member(to).short}${due ? `, due ${fmtShort(due)}` : ''}${note?.trim() ? `: ${note.trim()}` : ''}`;
          pr.trail.push({ at, by: me, text });
          log(s, pr.patientId, at, 'HANDED OFF', text, me);
        }),

      addPairingNote: (pairingId, text) =>
        mutate((s, at, me) => {
          const pr = pairingIn(s, pairingId);
          if (!pr || !text.trim()) return;
          pr.trail.push({ at, by: me, text: text.trim() });
          log(s, pr.patientId, at, 'STEP NOTE', text.trim(), me);
        }),

      runOptimizer: () => {
        const s0 = stateRef.current;
        const at = demoNow(s0.clockStartedAt);
        const b = computeBoard(s0);
        const old = s0.snapshot.proposals;
        const same = (a: { patientId: string; openingId: string }, c: { patientId: string; openingId: string }) =>
          a.patientId === c.patientId && a.openingId === c.openingId;
        const added = b.proposals.filter((x) => !old.some((y) => same(x, y))).length;
        const removed = old.filter(
          (x) => !b.proposals.some((y) => same(x, y)) && !s0.pairings.some((pr) => same(pr, x)),
        ).length;
        mutate((s, _at, me) => {
          s.previousSnapshotAt = s.snapshot.at;
          s.snapshot = { at, by: me, proposals: b.proposals };
        });
        return { added, removed, at };
      },
    };
  }, [mutate]);

  const value = useMemo<Store>(
    () => ({ state, board, actions, now, me: member(state.settings.viewingAs) }),
    [state, board, actions, now],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
