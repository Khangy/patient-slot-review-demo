import { Box, IconButton, Link, Stack, Tooltip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { Link as RouterLink } from 'react-router';
import type { Board, PatientView } from '@/domain/board';
import type { Patient, Trial } from '@/domain/types';
import { labelFor, listMrn, listName } from '@/domain/names';
import { NOT_SEEKING_LABEL, useStore } from '@/state/store';
import { Mono, useTone, type ToneName } from '@/components/ui';
import { PATIENT_STATUS } from '@/components/statusMeta';
import { matchCount } from './trialOptions';

/** ★ = Follow (memory decision e): the hover says it sends alerts. */
export function FollowStar({ patient, size = 'small' }: { patient: Patient; size?: 'small' | 'medium' }) {
  const { me, actions } = useStore();
  const on = patient.followers.includes(me.id);
  const amber = useTone('amber');
  const name = `${patient.last}, ${patient.first}`;
  return (
    <Tooltip title={on ? 'Following: you get this patient\'s alerts. Click to stop.' : "Follow: get this patient's alerts"}>
      <IconButton
        size={size}
        aria-label={on ? `Stop following ${name}` : `Follow ${name}`}
        aria-pressed={on}
        onClick={(e) => {
          e.stopPropagation();
          actions.toggleFollow(patient.id);
        }}
        sx={{ color: on ? amber.solid : 'text.secondary' }}
      >
        {on ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

/** Eye button that reveals one patient's identifiers while masking is on (board 02). */
export function RevealButton({ revealed, onToggle, name }: { revealed: boolean; onToggle: () => void; name?: string }) {
  return (
    <Tooltip title={revealed ? 'Hide identifiers' : 'Reveal identifiers (logged)'}>
      <IconButton
        size="small"
        aria-label={revealed ? `Hide identifiers${name ? ` for ${name}` : ''}` : `Reveal identifiers${name ? ` for ${name}` : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        sx={{ color: 'text.secondary' }}
      >
        {revealed ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

/** "Okafor, Samuel" over the MRN, with the reveal eye when masked. */
export function PatientNameCell({ patient, revealed, onToggleReveal }: { patient: Patient; revealed: boolean; onToggleReveal: () => void }) {
  const { state } = useStore();
  const showPii = state.settings.showPii;
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
      {!showPii ? <RevealButton revealed={revealed} onToggle={onToggleReveal} /> : null}
      <Box sx={{ minWidth: 0 }}>
        <Link
          component={RouterLink}
          to={`/patients/${patient.id}`}
          onClick={(e) => e.stopPropagation()}
          underline="hover"
          sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap' }}
        >
          {listName(patient, showPii, revealed)}
        </Link>
        <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
          <Mono>{listMrn(patient, showPii, revealed)}</Mono>
        </Box>
      </Box>
    </Stack>
  );
}

export interface StatusSummary {
  label: string;
  tone: ToneName;
  sub?: string;
}

/** All Patients › Status: the trial step when there is one, else the patient status. */
export function statusSummary(view: PatientView, board: Board, trials: Trial[]): StatusSummary {
  const p = view.patient;
  const label = (oid: string) => labelFor(trials, oid);
  const fx = view.fixedPairing;
  if (fx?.status === 'accepted') return { label: 'Slot accepted', tone: 'green', sub: label(fx.openingId) };
  if (fx?.status === 'pre_screening') return { label: 'Pre-screening', tone: 'purple', sub: label(fx.openingId) };
  if (p.elsewhere) return { label: p.elsewhere.step, tone: 'indigo', sub: `${p.elsewhere.trial}${p.elsewhere.upn ? ` · UPN ${p.elsewhere.upn}` : ''}` };
  const base = PATIENT_STATUS[p.status];
  let sub: string | undefined;
  if (p.status === 'undeclared') {
    const n = matchCount(view, board);
    sub = `${n} match${n === 1 ? '' : 'es'}`;
  } else if (p.status === 'not_seeking') {
    sub = p.notSeekingReason ? NOT_SEEKING_LABEL[p.notSeekingReason] : undefined;
  } else if (view.decision?.kind === 'proposed') {
    sub = `Optimizer proposed slot · ${label(view.decision.openingId)}`;
  } else if (view.blocked) {
    sub = `Blocked · ${view.blocked.label.toLowerCase()}`;
  } else if (p.queue.length) {
    sub = `Queued for Optimized Match · ${label(p.queue[0].openingId)}`;
  } else if (p.watches.length) {
    const w = p.watches[0];
    sub = `Watching · ${w.openingId ? label(w.openingId) : `${trials.find((t) => t.id === w.trialId)?.short} (any opening)`}`;
  } else if (p.status === 'seeking') {
    const n = view.possibleNow.length;
    sub = n ? `Nothing queued for Optimized Match · ${n} match${n === 1 ? '' : 'es'} with open slots` : 'Nothing queued for Optimized Match';
  }
  return { label: base.label, tone: base.tone, sub };
}
