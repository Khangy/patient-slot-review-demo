import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DismissReason, Pairing, PlaceReason, Step, UserId } from '@/domain/types';
import { computeBoard, placeCheck, simulatePlace, simulateRevert, type RevertOutcome } from '@/domain/board';
import { fmtWeekday } from '@/domain/dates';
import { labelFor, member } from '@/domain/names';
import { useStore, type AcceptPlan } from '@/state/store';
import { useToast } from '@/components/Toast';
import { useBoardUi } from './boardUi';
import { AcceptDialog, DismissDialog, HandOffDialog, PlaceDialog, placeChangeLines, RevertDialog } from './dialogs';

// The board's decisions, opened from anywhere on it: a decision card, a matrix cell, a drop
// onto a slot, or the "Place here" button. One set of dialogs, one set of toasts with Undo.

export type Target = { patientId: string; openingId: string };

interface BoardActionsApi {
  accept(t: Target): void;
  dismiss(t: Target): void;
  handOff(pairing: Pairing, step: Step): void;
  /** After Accept or a placement: release the slot, back to the optimizer or dismissed (SR10). */
  revert(pairing: Pairing): void;
  /** A drop or "Place here": Accept when the optimizer proposed this pairing, Place by hand otherwise, or say why not. */
  tryPlace(patientId: string, openingId: string): void;
}

const BoardActionsContext = createContext<BoardActionsApi | null>(null);

export function useBoardActions(): BoardActionsApi {
  const api = useContext(BoardActionsContext);
  if (!api) throw new Error('useBoardActions outside the Patient Slot Review page');
  return api;
}

export function BoardActionsProvider({ children }: { children: ReactNode }) {
  const { state, board, actions, me, now } = useStore();
  const ui = useBoardUi();
  const toast = useToast();
  const latest = useRef({ state, board, ui });
  latest.current = { state, board, ui };
  const [accepting, setAccepting] = useState<Target | null>(null);
  const [placing, setPlacing] = useState<{ patientId: string; openingId: string } | null>(null);
  const [dismissing, setDismissing] = useState<Target | null>(null);
  const [handing, setHanding] = useState<{ pairing: Pairing; step: Step } | null>(null);
  const [reverting, setReverting] = useState<Pairing | null>(null);

  const undoLatest = (patientId: string, openingId: string, status: Pairing['status']) => () => {
    const pr = latest.current.state.pairings.find((x) => x.patientId === patientId && x.openingId === openingId && x.status === status);
    if (pr) actions.undoPairing(pr.id);
  };

  const api = useMemo<BoardActionsApi>(
    () => ({
      accept: setAccepting,
      dismiss: setDismissing,
      handOff: (pairing, step) => setHanding({ pairing, step }),
      revert: setReverting,
      tryPlace: (patientId, openingId) => {
        const c = placeCheck(latest.current.board, patientId, openingId);
        if (!c.ok) toast(`${latest.current.ui.nameOf(patientId)} → ${latest.current.board.openingById[openingId]?.short ?? 'this slot'}: ${c.reason}.`);
        else if (c.kind === 'accept') setAccepting({ patientId, openingId });
        else setPlacing({ patientId, openingId });
      },
    }),
    [toast],
  );

  const confirmAccept = (plan: AcceptPlan) => {
    if (!accepting) return;
    const t = accepting;
    actions.accept(t.patientId, t.openingId, plan);
    setAccepting(null);
    toast(`Accepted. Consent call: ${member(plan.consentBy).short}, due ${fmtWeekday(plan.consentDue)}.`, {
      actionLabel: 'Undo',
      onAction: undoLatest(t.patientId, t.openingId, 'accepted'),
    });
  };

  const confirmPlace = (plan: AcceptPlan, reason: PlaceReason, note: string) => {
    if (!placing) return;
    const t = placing;
    const sim = simulatePlace(state, board, t.patientId, t.openingId, me.id, now());
    const first = placeChangeLines(sim, t.patientId, ui.nameOf, (oid) => labelFor(state.trials, oid))[0];
    actions.place(t.patientId, t.openingId, plan, reason, note);
    setPlacing(null);
    toast(`Placed by hand. ${first ?? `Consent call: ${member(plan.consentBy).short}, due ${fmtWeekday(plan.consentDue)}.`}`, {
      actionLabel: 'Undo',
      onAction: undoLatest(t.patientId, t.openingId, 'accepted'),
    });
  };

  const confirmDismiss = (reason: DismissReason, note: string) => {
    if (!dismissing) return;
    const t = dismissing;
    // Who moves up: re-plan with this pairing dismissed and see who is newly proposed here.
    const sim = computeBoard({
      patients: state.patients,
      trials: state.trials,
      pairings: [
        ...state.pairings.filter((x) => !(x.patientId === t.patientId && x.openingId === t.openingId)),
        { id: 'sim', patientId: t.patientId, openingId: t.openingId, status: 'dismissed', decidedAt: now(), decidedBy: me.id, steps: [], trail: [] },
      ],
    });
    const before = new Set(board.openingById[t.openingId]?.proposed ?? []);
    const moved = sim.openingById[t.openingId]?.proposed.find((pid) => !before.has(pid) && pid !== t.patientId);
    actions.dismiss(t.patientId, t.openingId, reason, note);
    setDismissing(null);
    const where = labelFor(state.trials, t.openingId);
    toast(moved ? `Dismissed. ${ui.nameOf(moved)} is proposed for ${where} now.` : `Dismissed. No one else is waiting for ${where}.`, {
      actionLabel: 'Undo',
      onAction: undoLatest(t.patientId, t.openingId, 'dismissed'),
    });
  };

  const confirmRevert = (outcome: RevertOutcome, reason: DismissReason | null, note: string) => {
    if (!reverting) return;
    const pr = reverting;
    const sim = simulateRevert(state, board, pr, outcome);
    actions.revertPairing(pr.id, outcome, reason ?? undefined, note);
    setReverting(null);
    const where = labelFor(state.trials, pr.openingId);
    const taker = sim.changes.find((c) => c.to === pr.openingId);
    const own = sim.own.to
      ? `${ui.nameOf(pr.patientId)} is proposed for ${labelFor(state.trials, sim.own.to)}${sim.own.to === pr.openingId ? ' again' : ''}.`
      : `No one else is waiting for ${where}.`;
    toast(`Reverted. ${taker ? `${ui.nameOf(taker.patientId)} is proposed for ${where} now.` : own}`, {
      actionLabel: 'Undo',
      onAction: () => actions.restorePairing(pr),
    });
  };

  const confirmHandOff = (to: UserId, due: string, note: string) => {
    if (!handing) return;
    actions.handOff(handing.pairing.id, handing.step.id, to, note, due);
    toast(`${handing.step.label} handed to ${member(to).short}, due ${fmtWeekday(due)}.`);
    setHanding(null);
  };

  return (
    <BoardActionsContext.Provider value={api}>
      {children}
      {accepting ? <AcceptDialog key={`a-${accepting.patientId}-${accepting.openingId}`} target={accepting} onClose={() => setAccepting(null)} onConfirm={confirmAccept} /> : null}
      {placing ? <PlaceDialog key={`p-${placing.patientId}-${placing.openingId}`} target={placing} onClose={() => setPlacing(null)} onConfirm={confirmPlace} /> : null}
      {dismissing ? (
        <DismissDialog key={`d-${dismissing.patientId}-${dismissing.openingId}`} target={dismissing} onClose={() => setDismissing(null)} onConfirm={confirmDismiss} />
      ) : null}
      {handing ? <HandOffDialog key={`h-${handing.step.id}`} target={handing} onClose={() => setHanding(null)} onConfirm={confirmHandOff} /> : null}
      {reverting ? <RevertDialog key={`r-${reverting.id}`} pairing={reverting} onClose={() => setReverting(null)} onConfirm={confirmRevert} /> : null}
    </BoardActionsContext.Provider>
  );
}
