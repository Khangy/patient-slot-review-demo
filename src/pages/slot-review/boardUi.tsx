import { createContext, useContext } from 'react';
import type { BoardView, Pairing, Step, UserId } from '@/domain/types';
import { daysBetween, fmtWeekday, TODAY } from '@/domain/dates';
import type { ToneName } from '@/components/ui';

// Board-wide UI state for Patient Slot Review: the one selection that drives all three columns
// (SR2), the column tabs, and the "Assigned to" filter (SR3). Kept in the URL by the page.

export type Selection = { kind: 'patient' | 'opening'; id: string } | null;
export type SlotsTab = 'now' | 'soon';
export type DecisionsTab = 'tracking' | 'blocked';
export type Assigned = 'everyone' | UserId;

export interface BoardUi {
  selection: Selection;
  /** toggles: selecting the selected patient again clears the selection */
  selectPatient(id: string): void;
  /** selects without toggling (drag start) */
  focusPatient(id: string): void;
  selectOpening(id: string): void;
  clearSelection(): void;
  slotsTab: SlotsTab;
  setSlotsTab(t: SlotsTab): void;
  decisionsTab: DecisionsTab;
  setDecisionsTab(t: DecisionsTab): void;
  assigned: Assigned;
  setAssigned(a: Assigned): void;
  /** the patient's name in the board's name mode (A9) */
  nameOf(patientId: string): string;
  mrnOf(patientId: string): string;
  /** three columns side by side (desktop) */
  wide: boolean;
  /** SR7: Cards, Compact, List or Matrix */
  view: BoardView;
}

export const BoardUiContext = createContext<BoardUi | null>(null);

export function useBoardUi(): BoardUi {
  const ui = useContext(BoardUiContext);
  if (!ui) throw new Error('useBoardUi outside the Patient Slot Review page');
  return ui;
}

/** The step the team is on: the first one not done (automatic steps excluded). */
export function currentStep(pairing: Pairing): Step | undefined {
  return pairing.steps.find((s) => !s.doneAt && !s.auto);
}

/** Every open step of a pairing assigned to one person (current or coming). */
export function openStepsFor(pairing: Pairing, user: UserId): Step[] {
  return pairing.steps.filter((s) => !s.doneAt && !s.auto && s.assignee === user);
}

export function dueInfo(step?: Step): { text: string; tone: ToneName } | undefined {
  if (!step) return undefined;
  if (step.due) {
    const n = daysBetween(TODAY, step.due);
    if (n < 0) return { text: `overdue, was due ${fmtWeekday(step.due)}`, tone: 'red' };
    if (n === 0) return { text: 'due today', tone: 'amber' };
    return { text: `due ${fmtWeekday(step.due)}`, tone: 'grey' };
  }
  return step.dueText ? { text: step.dueText, tone: 'grey' } : undefined;
}

/** Due within the coming week (or overdue). */
export function dueThisWeek(step: Step): boolean {
  return !!step.due && daysBetween(TODAY, step.due) <= 7;
}
