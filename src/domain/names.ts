import type { BoardNames, Opening, Patient, TeamMember, Trial, UserId } from './types';
import { TEAM } from './seed';

// ── People ──────────────────────────────────────────────────────────────

/** "Okafor, Samuel" — the app's list format */
export const lastFirst = (p: Patient) => `${p.last}, ${p.first}`;
/** "Samuel Okafor" */
export const firstLast = (p: Patient) => `${p.first} ${p.last}`;
/** A9 option B: "Samuel O." */
export const meetingName = (p: Patient) => `${p.first} ${p.last[0]}.`;

const star = (s: string) => s[0] + '*'.repeat(Math.max(s.length - 1, 2));
/** Board 02 masking: "O*****, S*****" */
export const maskedName = (p: Patient) => `${star(p.last)}, ${star(p.first)}`;
export const maskedMrn = (p: Patient) => `***${p.mrn.slice(-4)}`;
export const maskedDob = (p: Patient) => `**/**/${p.dob.slice(0, 4)}`;

/** Patient pages: the Profile switch decides, a per-row reveal overrides (board 02: keep as is). */
export function listName(p: Patient, showPii: boolean, revealed = false) {
  return showPii || revealed ? lastFirst(p) : maskedName(p);
}
export function listMrn(p: Patient, showPii: boolean, revealed = false) {
  return showPii || revealed ? p.mrn : maskedMrn(p);
}

/** Meeting board names (A9). 'masked' follows the Profile switch like the Patients list. */
export function boardName(p: Patient, mode: BoardNames, showPii: boolean, revealed = false): string {
  if (revealed) return lastFirst(p);
  if (mode === 'meeting') return meetingName(p);
  if (mode === 'masked') return showPii ? lastFirst(p) : maskedName(p);
  return lastFirst(p);
}
export function boardMrn(p: Patient, mode: BoardNames, showPii: boolean, revealed = false): string {
  if (revealed || mode === 'full') return p.mrn;
  if (mode === 'masked' && showPii) return p.mrn;
  return maskedMrn(p);
}

export const member = (id: UserId): TeamMember => TEAM.find((m) => m.id === id)!;

// ── Trials and openings ─────────────────────────────────────────────────

export function findOpening(trials: Trial[], openingId: string): { trial: Trial; opening: Opening } | undefined {
  for (const trial of trials) {
    const opening = trial.openings.find((o) => o.id === openingId);
    if (opening) return { trial, opening };
  }
  return undefined;
}

/** "SPX-201 › Arm A2" — trial short name and the opening's own name */
export function openingShort(trial: Trial, opening: Opening): string {
  return opening.path.length ? `${trial.short} › ${opening.path[opening.path.length - 1]}` : trial.short;
}

/** "SPX-201 › Part 2 › Cohort A › Arm A2" */
export function openingFull(trial: Trial, opening: Opening): string {
  return [trial.short, ...opening.path].join(' › ');
}

/** The opening's own name, or "Whole trial" */
export function openingOwnName(opening: Opening): string {
  return opening.path.length ? opening.path.join(' › ') : 'Whole trial';
}

export function labelFor(trials: Trial[], openingId: string, full = false): string {
  const f = findOpening(trials, openingId);
  if (!f) return openingId;
  return full ? openingFull(f.trial, f.opening) : openingShort(f.trial, f.opening);
}

export const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
