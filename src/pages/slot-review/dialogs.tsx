import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useMemo, useState } from 'react';
import type { DismissReason, Pairing, Step, UserId } from '@/domain/types';
import { TEAM, SITE_NAME } from '@/domain/seed';
import { addDays, fmtShort, fmtTime, fmtWeekday, fmtWhen, nextBusinessDay, TODAY } from '@/domain/dates';
import { labelFor, member, ordinal } from '@/domain/names';
import { dxStage, keyMarker } from '@/domain/summary';
import { dismissReasonLabel } from '@/domain/board';
import { useStore, type AcceptPlan } from '@/state/store';
import { useToast } from '@/components/Toast';
import { PersonTag, ToneChip, Mono } from '@/components/ui';
import { PATIENT_STATUS } from '@/components/statusMeta';
import { currentStep, dueInfo, useBoardUi } from './boardUi';
import { Muted } from './parts';

function PersonSelect({ label, value, onChange }: { label: string; value: UserId; onChange: (u: UserId) => void }) {
  return (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value as UserId)} sx={{ minWidth: 200 }}>
      {TEAM.map((m) => (
        <MenuItem key={m.id} value={m.id}>
          {m.short} · {m.role}
        </MenuItem>
      ))}
    </TextField>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <TextField
      type="date"
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: TODAY } }}
      sx={{ minWidth: 170 }}
    />
  );
}

// ── Accept (SR3) ────────────────────────────────────────────────────────

export function AcceptDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: { patientId: string; openingId: string; choice: number } | null;
  onClose: () => void;
  onConfirm: (plan: AcceptPlan) => void;
}) {
  const { state, me } = useStore();
  const ui = useBoardUi();
  const [consentBy, setConsentBy] = useState<UserId>('u-maya');
  const [consentDue, setConsentDue] = useState(nextBusinessDay(TODAY));
  const [labsBy, setLabsBy] = useState<UserId>('u-luis');
  if (!target) return null;
  const opening = labelFor(state.trials, target.openingId, true);
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        Accept {ui.nameOf(target.patientId)} → {opening}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Muted size={13.5}>
            {ordinal(target.choice)} choice on the patient's Interest List. Accepting holds the slot and gives each next step a person and a date.
          </Muted>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <StepDot n="✓" done />
              <Typography sx={{ fontWeight: 600, flex: 1, minWidth: 180 }}>Accepted at the meeting</Typography>
              <PersonTag userId={me.id} suffix={`· today, ${fmtShort(TODAY)}`} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <StepDot n="2" current />
              <Typography sx={{ fontWeight: 600, flex: 1, minWidth: 180 }}>Consent call</Typography>
              <PersonSelect label="Assigned to" value={consentBy} onChange={setConsentBy} />
              <DateField label="Due" value={consentDue} onChange={setConsentDue} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <StepDot n="3" />
              <Typography sx={{ fontWeight: 600, flex: 1, minWidth: 180 }}>Book pre-screen labs</Typography>
              <PersonSelect label="Assigned to" value={labsBy} onChange={setLabsBy} />
              <Muted>after consent</Muted>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <StepDot n="4" />
              <Typography sx={{ flex: 1, minWidth: 180 }}>Pre-screening opens on the patient's Enrollment tab</Typography>
              <Muted>automatic</Muted>
            </Box>
          </Stack>
          <Muted size={13}>
            The slot is held 7 days for consent (until {fmtWeekday(addDays(TODAY, 7))}). If consent is not reached by then, it shows in Near future as a slot coming back.
          </Muted>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!consentDue} onClick={() => onConfirm({ consentBy, consentDue, labsBy })}>
          Accept and assign
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function StepDot({ n, done, current }: { n: string; done?: boolean; current?: boolean }) {
  return (
    <Box
      aria-hidden="true"
      sx={(t) => ({
        width: 24,
        height: 24,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        border: '1.5px solid',
        borderColor: done ? t.palette.success.main : current ? t.palette.primary.main : t.palette.divider,
        bgcolor: done ? t.palette.success.main : current ? t.palette.primary.main : 'transparent',
        color: done || current ? t.palette.primary.contrastText : t.palette.text.secondary,
      })}
    >
      {n}
    </Box>
  );
}

// ── Dismiss with a reason (A6) ──────────────────────────────────────────

const REASONS: { value: DismissReason; label: string }[] = [
  { value: 'patient_declined', label: 'Patient declined' },
  { value: 'not_a_fit', label: 'Not a fit on review' },
  { value: 'wrong_timing', label: 'Wrong timing, keep for later' },
  { value: 'other', label: 'Other' },
];

export function DismissDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: { patientId: string; openingId: string } | null;
  onClose: () => void;
  onConfirm: (reason: DismissReason, note: string) => void;
}) {
  const { state } = useStore();
  const ui = useBoardUi();
  const [reason, setReason] = useState<DismissReason | null>(null);
  const [note, setNote] = useState('');
  if (!target) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>Why not this slot?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Muted size={13.5}>
            {ui.nameOf(target.patientId)} → {labelFor(state.trials, target.openingId, true)}. The patient stays on the Interest List; the next patient in line moves up.
          </Muted>
          <ToggleButtonGroup
            exclusive
            value={reason}
            onChange={(_, v: DismissReason | null) => setReason(v)}
            aria-label="Reason"
            sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButton-root': { borderRadius: '999px !important', border: '1px solid', borderColor: 'divider', textTransform: 'none', px: 1.75, ml: '0 !important' } }}
          >
            {REASONS.map((r) => (
              <ToggleButton key={r.value} value={r.value} size="small">
                {r.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            label="Note (optional)"
            placeholder="e.g. prefers to stay local, travel to the site is too far"
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" disabled={!reason} onClick={() => reason && onConfirm(reason, note)}>
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Hand off a step (SR3) ───────────────────────────────────────────────

export function HandOffDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: { pairing: Pairing; step: Step } | null;
  onClose: () => void;
  onConfirm: (to: UserId, due: string, note: string) => void;
}) {
  const ui = useBoardUi();
  const { state } = useStore();
  const firstOther = TEAM.find((m) => m.id !== target?.step.assignee)?.id ?? 'u-maya';
  const [to, setTo] = useState<UserId>(firstOther);
  const [due, setDue] = useState(target?.step.due ?? nextBusinessDay(TODAY));
  const [note, setNote] = useState('');
  if (!target) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>Hand off: {target.step.label}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Muted size={13.5}>
            {ui.nameOf(target.pairing.patientId)} → {labelFor(state.trials, target.pairing.openingId)}
            {target.step.assignee ? ` · now with ${member(target.step.assignee).short}` : ''}
          </Muted>
          <PersonSelect label="Hand to" value={to} onChange={setTo} />
          <DateField label="Due" value={due} onChange={setDue} />
          <TextField label="Note for them" multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What they need to know" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onConfirm(to, due, note)}>
          Hand off
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Add to Review ───────────────────────────────────────────────────────

export function AddToReviewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { board, actions } = useStore();
  const ui = useBoardUi();
  const toast = useToast();
  const [q, setQ] = useState('');
  const rows = useMemo(
    () =>
      board.patients
        .filter((v) => !v.inReview && (v.patient.status === 'seeking' || v.patient.status === 'undeclared'))
        .filter((v) => {
          const s = q.trim().toLowerCase();
          if (!s) return true;
          const p = v.patient;
          return `${p.last} ${p.first} ${p.first} ${p.mrn}`.toLowerCase().includes(s);
        })
        .sort((a, b) => a.patient.last.localeCompare(b.patient.last)),
    [board, q],
  );
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>Add to Review</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <Muted size={13.5}>
            Bring a patient to this Thursday's discussion without queueing them. Queueing a patient from their chart (Trial Options) also adds them.
          </Muted>
          <TextField
            size="small"
            placeholder="Search by name or MRN"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
          {rows.length === 0 ? (
            <Muted>Everyone who is seeking or undeclared is already in the review.</Muted>
          ) : (
            rows.map((v) => (
              <Box key={v.patient.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ fontWeight: 600 }}>
                    {ui.nameOf(v.patient.id)} <Mono sx={{ color: 'text.secondary', fontWeight: 400 }}>{ui.mrnOf(v.patient.id)}</Mono>
                  </Box>
                  <Muted>
                    {dxStage(v.patient)}
                    {keyMarker(v.patient) ? ` · ${keyMarker(v.patient)}` : ''} · {v.possibleNow.length} possible slot{v.possibleNow.length === 1 ? '' : 's'} now
                  </Muted>
                </Box>
                <ToneChip tone={PATIENT_STATUS[v.patient.status].tone} label={PATIENT_STATUS[v.patient.status].label} size="tiny" />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    actions.addToReview(v.patient.id);
                    toast(`Added ${ui.nameOf(v.patient.id)} to the review.`);
                  }}
                >
                  Add
                </Button>
              </Box>
            ))
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Export summary (meeting minutes) ────────────────────────────────────

export function ExportSummaryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, board, me, now } = useStore();
  const ui = useBoardUi();
  const toast = useToast();
  const text = useMemo(() => {
    if (!open) return '';
    const name = ui.nameOf;
    const label = (oid: string) => labelFor(state.trials, oid, true);
    const snapAt = state.snapshot.at;
    const L: string[] = [];
    L.push('Patient Slot Review · Thursday New Patient Meeting');
    L.push(`${SITE_NAME} · ${fmtWeekday(TODAY)}, 2026 · meeting snapshot ${fmtTime(snapAt)} by ${member(state.snapshot.by).short}`);
    L.push(`Exported ${fmtTime(now())} by ${me.short}`);
    L.push('');

    const since = state.pairings.filter((p) => p.decidedAt >= snapAt).sort((a, b) => (a.decidedAt < b.decidedAt ? -1 : 1));
    L.push(`DECIDED SINCE THE ${fmtTime(snapAt)} SNAPSHOT`);
    if (!since.length) L.push('- Nothing yet');
    for (const p of since) {
      if (p.status === 'dismissed') {
        L.push(`- Dismissed: ${name(p.patientId)} → ${label(p.openingId)}. ${dismissReasonLabel(p.dismissReason)}${p.dismissNote ? `: ${p.dismissNote}` : ''} (${member(p.decidedBy).short}, ${fmtWhen(p.decidedAt)})`);
      } else {
        const steps = p.steps.filter((s) => !s.doneAt && !s.auto);
        const who = steps.map((s) => `${s.label}: ${s.assignee ? member(s.assignee).short : 'unassigned'}, ${s.due ? `due ${fmtWeekday(s.due)}` : s.dueText ?? ''}`).join('; ');
        L.push(`- Accepted: ${name(p.patientId)} → ${label(p.openingId)} (${ordinal(p.choice)} choice). ${who}`);
      }
    }
    L.push('');

    const proposed = board.decisions.filter((d) => d.kind === 'proposed');
    L.push(`STILL TO DECIDE (${proposed.length} proposals)`);
    if (!proposed.length) L.push('- None');
    for (const d of proposed) L.push(`- ${name(d.patientId)} → ${label(d.openingId)} (${ordinal(d.choice)} choice)`);
    L.push('');

    const inFlight = state.pairings.filter((p) => p.status !== 'dismissed' && p.decidedAt < snapAt);
    L.push('IN PROGRESS FROM EARLIER MEETINGS');
    if (!inFlight.length) L.push('- None');
    for (const p of inFlight) {
      const s = currentStep(p);
      const due = dueInfo(s);
      L.push(`- ${name(p.patientId)} → ${label(p.openingId)} · ${p.status === 'pre_screening' ? 'pre-screening' : 'accepted'}${s ? ` · next: ${s.label} (${s.assignee ? member(s.assignee).short : 'unassigned'}${due ? `, ${due.text}` : ''})` : ''}`);
    }
    L.push('');

    L.push(`BLOCKED (${board.blocked.length})`);
    if (!board.blocked.length) L.push('- Nobody');
    for (const b of board.blocked) L.push(`- ${name(b.patientId)}: ${b.label}. ${b.detail}`);
    L.push('');

    L.push('NEAR FUTURE');
    for (const n of board.nearFuture) {
      const waiting = n.waiting.map((w) => `${name(w.patientId)} (${w.why})`).join('; ');
      L.push(`- ${labelFor(state.trials, n.openingId)}: ${n.title}. ${n.note}.${waiting ? ` Waiting: ${waiting}` : ''}`);
    }
    L.push('');
    L.push(`Tiles: ${board.tiles.inReview} patients in review · ${board.tiles.openNow} slots open now · ${board.tiles.openingSoon} opening soon · ${board.tiles.blocked} blocked`);
    return L.join('\n');
  }, [open, state, board, ui.nameOf, me, now]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Summary copied.');
    } catch {
      toast('Copy was blocked by the browser. Select the text and copy it by hand.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>Meeting summary</DialogTitle>
      <DialogContent>
        <Muted size={13}>Plain text, ready to paste into the minutes or an email. Names follow the board's Names setting.</Muted>
        <Box
          component="pre"
          tabIndex={0}
          aria-label="Meeting summary text"
          sx={{
            mt: 1.5,
            p: 2,
            m: 0,
            borderRadius: 1.5,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontSize: 12.5,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '60vh',
            overflow: 'auto',
          }}
        >
          {text}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={copy}>
          Copy
        </Button>
      </DialogActions>
    </Dialog>
  );
}

