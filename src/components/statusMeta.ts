import type { BoardStatus, CandidateStatus, DecisionKind, BlockedReason } from '@/domain/board';
import type { MatchResult } from '@/domain/matching';
import type { PatientStatus } from '@/domain/types';
import type { ToneName } from './ui';

// One label and one color per status, shared by the Patients pages and the meeting board.

export const BOARD_STATUS: Record<BoardStatus, { label: string; tone: ToneName }> = {
  seeking: { label: 'Seeking slot', tone: 'blue' },
  near_future: { label: 'Near future', tone: 'amber' },
  pre_screening: { label: 'Pre-screening', tone: 'purple' },
  slot_accepted: { label: 'Slot accepted', tone: 'green' },
  no_possible: { label: 'No possible slots', tone: 'red' },
  not_queued: { label: 'Nothing queued for Optimized Match', tone: 'grey' },
};

// A decision is about the patient's slot; a candidate is a patient listed under a slot.
export const DECISION: Record<DecisionKind, { label: string; tone: ToneName }> = {
  proposed: { label: 'Optimizer proposed slot', tone: 'blue' },
  accepted: { label: 'Accepted', tone: 'green' },
  pre_screening: { label: 'Pre-screening', tone: 'purple' },
  dismissed: { label: 'Dismissed', tone: 'grey' },
};

export const CANDIDATE: Record<CandidateStatus, { label: string; tone: ToneName }> = {
  accepted: { label: 'Accepted', tone: 'green' },
  pre_screening: { label: 'Pre-screening', tone: 'purple' },
  proposed: { label: 'Optimizer proposed patient', tone: 'blue' },
  next_in_line: { label: 'Next in line', tone: 'amber' },
  placed_elsewhere: { label: 'Placed elsewhere', tone: 'grey' },
  queued: { label: 'Queued for Optimized Match', tone: 'grey' },
  dismissed: { label: 'Dismissed', tone: 'grey' },
  not_eligible: { label: 'Not eligible', tone: 'red' },
};

export const BLOCKED: Record<BlockedReason, { tone: ToneName }> = {
  no_slot_in_opening: { tone: 'red' },
  seats_taken: { tone: 'amber' },
  no_longer_eligible: { tone: 'red' },
  dismissed: { tone: 'grey' },
};

export const PATIENT_STATUS: Record<PatientStatus, { label: string; tone: ToneName }> = {
  undeclared: { label: 'Undeclared', tone: 'amber' },
  seeking: { label: 'Seeking', tone: 'green' },
  watchlist: { label: 'Watchlist', tone: 'blue' },
  not_seeking: { label: 'Not seeking', tone: 'grey' },
};

export const MATCH: Record<MatchResult, { label: string; tone: ToneName }> = {
  eligible: { label: 'Fits', tone: 'green' },
  pending_review: { label: 'Fit pending review', tone: 'amber' },
  needs_status_change: { label: 'Needs a status change', tone: 'amber' },
  not_eligible: { label: 'Not a fit', tone: 'grey' },
};
