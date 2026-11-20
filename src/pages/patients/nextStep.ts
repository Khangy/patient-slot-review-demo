import type { Board, PatientView } from '@/domain/board';
import { isFit } from '@/domain/matching';
import type { Trial, UserId, Watch } from '@/domain/types';
import { daysBetween, fmtShort, fmtWeekday, relDays, TODAY } from '@/domain/dates';
import { labelFor, member } from '@/domain/names';
import { NOT_SEEKING_LABEL } from '@/state/store';
import type { ToneName } from '@/components/ui';

// Board 05: My Patients grouped by what needs you, the event leading each row.
//   Needs you   = waiting on a person today
//   Coming up   = scheduled within the next two weeks
//   Nothing due = the rest

export type NextGroup = 'needs_you' | 'coming_up' | 'nothing_due';

export const GROUP_LABEL: Record<NextGroup, string> = {
  needs_you: 'Needs you',
  coming_up: 'Coming up',
  nothing_due: 'Nothing due',
};

export interface NextStep {
  group: NextGroup;
  verb: string;
  status?: string;
  date?: string;
  sub?: string;
  tone: ToneName;
  /** ISO date used to order rows inside a group */
  sortDate: string;
}

const SOON_DAYS = 14;

function watchWhere(trials: Trial[], w: Watch): string {
  if (w.openingId) return labelFor(trials, w.openingId);
  return `${trials.find((t) => t.id === w.trialId)?.short ?? 'Trial'} (any opening)`;
}

function watchWhat(w: Watch): string {
  if (w.reason === 'slot') return 'waiting for a slot';
  if (w.reason === 'status_change') return `waiting for ${w.waitFor ?? 'a status change'}`;
  return 'watching';
}

export function nextStepFor(view: PatientView, board: Board, trials: Trial[], me: UserId): NextStep {
  const p = view.patient;
  const label = (oid: string) => labelFor(trials, oid);

  // ── Needs you ──
  if (p.status === 'undeclared') {
    const n = view.matches.filter((m) => isFit(m) && board.openingById[m.openingId]?.opening.state === 'open').length;
    return {
      group: 'needs_you',
      verb: 'Undeclared',
      status: 'referred',
      date: fmtShort(p.referredOn),
      sub: `${n} match${n === 1 ? '' : 'es'} waiting on a status`,
      tone: 'amber',
      sortDate: p.referredOn,
    };
  }

  const changed = p.watches.find((w) => w.statusChanged);
  if (changed?.statusChanged) {
    const trial = trials.find((t) => t.id === changed.trialId);
    return {
      group: 'needs_you',
      verb: 'Status changed',
      status: `${changed.statusChanged.from} → ${changed.statusChanged.to}`,
      date: fmtShort(changed.statusChanged.on),
      sub: `${trial?.short ?? 'The watched trial'} may fit now · re-check, then review the watch`,
      tone: 'amber',
      sortDate: changed.statusChanged.on,
    };
  }

  if (view.blocked?.reason === 'no_longer_eligible') {
    return {
      group: 'needs_you',
      verb: 'No longer eligible',
      status: 're-matched',
      date: fmtShort(p.matchesCheckedOn),
      sub: view.blocked.detail,
      tone: 'red',
      sortDate: p.matchesCheckedOn,
    };
  }

  const step = view.openStep;
  if (step && step.step.assignee === me && step.step.due && step.step.due <= TODAY) {
    const overdue = step.step.due < TODAY;
    return {
      group: 'needs_you',
      verb: step.step.label,
      status: overdue ? 'overdue' : 'due',
      date: overdue ? fmtShort(step.step.due) : 'today',
      sub: `${member(step.step.assignee).short} · ${label(step.pairing.openingId)}`,
      tone: overdue ? 'red' : 'amber',
      sortDate: step.step.due,
    };
  }

  const reviewDue = p.watches.filter((w) => w.nextReview <= TODAY).sort((a, b) => a.nextReview.localeCompare(b.nextReview))[0];
  if (reviewDue) {
    return {
      group: 'needs_you',
      verb: 'Review due',
      status: reviewDue.nextReview === TODAY ? 'today' : 'overdue',
      date: fmtShort(reviewDue.nextReview),
      sub: `${watchWhere(trials, reviewDue)} · ${watchWhat(reviewDue)} · every ${reviewDue.reviewEveryDays} days`,
      tone: 'amber',
      sortDate: reviewDue.nextReview,
    };
  }

  if (p.status === 'seeking' && p.queue.length === 0 && p.watches.length === 0 && !view.fixedPairing && !p.elsewhere) {
    const days = daysBetween(p.statusSince, TODAY);
    const open = view.possibleNow.map(label);
    return {
      group: 'needs_you',
      verb: 'Nothing queued',
      status: `seeking ${days} day${days === 1 ? '' : 's'}`,
      sub: open.length
        ? `${open.length} match${open.length === 1 ? '' : 'es'} with open slots: ${open.slice(0, 2).join(', ')}${open.length > 2 ? ` +${open.length - 2}` : ''}`
        : 'No match with open slots yet',
      tone: 'amber',
      sortDate: p.statusSince,
    };
  }

  // ── Coming up ──
  if (step) {
    const s = step.step;
    if (s.due && daysBetween(TODAY, s.due) <= SOON_DAYS) {
      const held = step.pairing.holdUntil ? ` · slot held until ${fmtShort(step.pairing.holdUntil)}` : '';
      return {
        group: 'coming_up',
        verb: s.label,
        status: 'due',
        date: fmtWeekday(s.due),
        sub: `${s.assignee ? member(s.assignee).short : 'Unassigned'} · ${label(step.pairing.openingId)}${held}`,
        tone: 'blue',
        sortDate: s.due,
      };
    }
  }

  if (view.inReview) {
    if (view.decision?.kind === 'proposed') {
      return {
        group: 'coming_up',
        verb: "In Thursday's review",
        status: 'today',
        sub: `Proposed: ${label(view.decision.openingId)}`,
        tone: 'blue',
        sortDate: TODAY,
      };
    }
    if (view.blocked) {
      const soon = board.nearFuture.find((n) => view.blocked!.openingIds.includes(n.openingId) && n.date);
      const extra =
        view.blocked.reason === 'seats_taken' ? '' : soon ? ` · ${soon.title.charAt(0).toLowerCase()}${soon.title.slice(1)}` : '';
      return {
        group: 'coming_up',
        verb: "In Thursday's review",
        status: 'today',
        sub: `Blocked: ${view.blocked.label.toLowerCase()}${extra}`,
        tone: 'blue',
        sortDate: TODAY,
      };
    }
  }

  const nextWatch = [...p.watches].sort((a, b) => a.nextReview.localeCompare(b.nextReview))[0];
  if (nextWatch && daysBetween(TODAY, nextWatch.nextReview) <= SOON_DAYS) {
    return {
      group: 'coming_up',
      verb: 'Next review',
      status: relDays(nextWatch.nextReview),
      date: fmtShort(nextWatch.nextReview),
      sub: `${watchWhere(trials, nextWatch)} · ${watchWhat(nextWatch)}`,
      tone: 'blue',
      sortDate: nextWatch.nextReview,
    };
  }

  // ── Nothing due ──
  if (p.status === 'not_seeking') {
    return {
      group: 'nothing_due',
      verb: 'Not seeking',
      status: p.notSeekingReason ? NOT_SEEKING_LABEL[p.notSeekingReason] : undefined,
      date: `since ${fmtShort(p.statusSince)}`,
      tone: 'grey',
      sortDate: p.statusSince,
    };
  }
  if (p.elsewhere) {
    return {
      group: 'nothing_due',
      verb: p.elsewhere.step,
      status: `${p.elsewhere.trial}${p.elsewhere.upn ? ` · UPN ${p.elsewhere.upn}` : ''}`,
      date: `since ${fmtShort(p.elsewhere.since)}`,
      tone: 'grey',
      sortDate: p.elsewhere.since,
    };
  }
  if (nextWatch) {
    return {
      group: 'nothing_due',
      verb: 'Next review',
      status: relDays(nextWatch.nextReview),
      date: fmtShort(nextWatch.nextReview),
      sub: `${watchWhere(trials, nextWatch)} · ${watchWhat(nextWatch)}`,
      tone: 'grey',
      sortDate: nextWatch.nextReview,
    };
  }
  if (step?.step.due) {
    return {
      group: 'nothing_due',
      verb: step.step.label,
      status: 'due',
      date: fmtShort(step.step.due),
      sub: `${step.step.assignee ? member(step.step.assignee).short : 'Unassigned'} · ${label(step.pairing.openingId)}`,
      tone: 'grey',
      sortDate: step.step.due,
    };
  }
  if (p.status === 'watchlist') {
    return { group: 'nothing_due', verb: 'Watchlist', status: 'maybe later', date: `since ${fmtShort(p.statusSince)}`, tone: 'grey', sortDate: p.statusSince };
  }
  if (p.queue.length) {
    return {
      group: 'nothing_due',
      verb: 'Queued',
      status: label(p.queue[0].openingId),
      date: `since ${fmtShort(p.queue[0].queuedOn)}`,
      tone: 'grey',
      sortDate: p.queue[0].queuedOn,
    };
  }
  return { group: 'nothing_due', verb: 'Seeking', date: `since ${fmtShort(p.statusSince)}`, tone: 'grey', sortDate: p.statusSince };
}
