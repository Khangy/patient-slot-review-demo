import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { NotSeekingReason, Patient, Watch } from '@/domain/types';
import { addDays, fmtShort, TODAY } from '@/domain/dates';
import { labelFor, openingOwnName } from '@/domain/names';
import { NOT_SEEKING_LABEL, useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { DesignNote } from '@/notes/DesignNote';

// ── Edit demographics (board 07: MRN, DOB and contact only) ─────────────

export function EditDemographicsDialog({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const [mrn, setMrn] = useState(patient.mrn);
  const [dob, setDob] = useState(patient.dob);
  const [phone, setPhone] = useState(patient.phone ?? '');
  const [email, setEmail] = useState(patient.email ?? '');
  const emailBad = email.trim() !== '' && !/^[^@\s]+@[^@\s]+$/.test(email.trim());
  const missing = !mrn.trim() ? 'Add the MRN to save' : !dob ? 'Add the date of birth to save' : emailBad ? 'Fix the email to save' : undefined;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Edit demographics
        <DesignNote id="07" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="MRN" required value={mrn} onChange={(e) => setMrn(e.target.value)} />
          <TextField label="Date of birth" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailBad} helperText={emailBad ? 'One @ and no spaces' : ' '} />
          <Typography variant="caption" color="text.secondary">
            The patient status is not here any more: it is the chip in the header.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!!missing}
          onClick={() => {
            actions.updateDemographics(patient.id, { mrn: mrn.trim(), dob, phone: phone.trim() || undefined, email: email.trim() || undefined });
            toast('Demographics saved.');
            onClose();
          }}
        >
          {missing ?? 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Not seeking: one click per reason (board 11 adds comfort care) ──────

const REASONS: NotSeekingReason[] = ['second_opinion', 'break', 'healthy', 'standard_of_care', 'comfort_care'];

export function NotSeekingDialog({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Not seeking: why?
        <DesignNote id="11" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          {REASONS.map((r) => (
            <Button
              key={r}
              variant="outlined"
              fullWidth
              sx={{ justifyContent: 'flex-start', py: 1.1 }}
              onClick={() => {
                actions.setStatus(patient.id, 'not_seeking', r);
                toast(`Not seeking · ${NOT_SEEKING_LABEL[r]}. The queue was released and watches stopped.`);
                onClose();
              }}
            >
              {NOT_SEEKING_LABEL[r]}
            </Button>
          ))}
          <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
            Not seeking releases the queue and stops every trial watch for this patient.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Keep… with a note (board 10) ────────────────────────────────────────

const LOOK_AGAIN: { days: number; label: string }[] = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '30 days' },
  { days: 60, label: '60 days' },
];

export function KeepDialog({ patient, watch, onClose }: { patient: Patient; watch: Watch; onClose: () => void }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [days, setDays] = useState<number>(watch.reviewEveryDays);
  const where = watch.openingId ? labelFor(state.trials, watch.openingId) : state.trials.find((t) => t.id === watch.trialId)?.short ?? 'this trial';
  const next = addDays(TODAY, days);
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Keep watching {where}
        <DesignNote id="10" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Note (optional)"
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Called the patient. Wants to wait for this opening, not switch."
          />
          <FormControl>
            <FormLabel sx={{ mb: 1, fontSize: 13 }}>Look again in</FormLabel>
            <ToggleButtonGroup exclusive size="small" value={days} onChange={(_, v: number | null) => v && setDays(v)} aria-label="Look again in">
              {LOOK_AGAIN.map((o) => (
                <ToggleButton key={o.days} value={o.days} sx={{ px: 1.5 }}>
                  {o.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            The schedule stays every {watch.reviewEveryDays} days. This only sets when to look next; the note shows on the watch.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            actions.keepWatch(patient.id, watch.id, note, days);
            toast(`Kept. Next review ${fmtShort(next)}.`);
            onClose();
          }}
        >
          Keep · review {fmtShort(next)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Watch this trial… ───────────────────────────────────────────────────

export interface WatchDraft {
  trialId: string;
  openingId?: string;
  reason: Watch['reason'];
  waitFor?: string;
}

const STAGE_TARGETS = ['Stage II', 'Stage III', 'Stage IV'];

export function WatchDialog({ patient, draft, onClose }: { patient: Patient; draft: WatchDraft; onClose: () => void }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const trial = state.trials.find((t) => t.id === draft.trialId);
  const [openingId, setOpeningId] = useState(draft.openingId ?? '');
  const [reason, setReason] = useState<Watch['reason']>(draft.reason);
  const [waitFor, setWaitFor] = useState(draft.waitFor && STAGE_TARGETS.includes(draft.waitFor) ? draft.waitFor : 'Stage IV');
  const [note, setNote] = useState('');
  const [every, setEvery] = useState<30 | 60>(60);
  if (!trial) return null;
  const first = addDays(TODAY, every);
  const where = openingId ? labelFor(state.trials, openingId) : `${trial.short} (any opening)`;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Watch {trial.short}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          <TextField select label="Opening" value={openingId} onChange={(e) => setOpeningId(e.target.value)} helperText="A watch is for one arm or cohort, or the whole trial">
            <MenuItem value="">Any opening of the trial</MenuItem>
            {trial.openings.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {openingOwnName(o)}
                {o.state === 'on_hold' ? ' (on hold)' : ''}
              </MenuItem>
            ))}
          </TextField>
          <FormControl>
            <FormLabel sx={{ fontSize: 13 }}>Waiting for</FormLabel>
            <RadioGroup value={reason} onChange={(e) => setReason(e.target.value as Watch['reason'])}>
              <FormControlLabel value="slot" control={<Radio size="small" />} label="A slot to open" />
              <FormControlLabel value="status_change" control={<Radio size="small" />} label="A status change" />
              <FormControlLabel value="other" control={<Radio size="small" />} label="Other" />
            </RadioGroup>
          </FormControl>
          {reason === 'status_change' ? (
            <TextField select label="Wait for" value={waitFor} onChange={(e) => setWaitFor(e.target.value)} helperText={`Now ${patient.clinical.stage ? `Stage ${patient.clinical.stage}` : 'not staged'}`}>
              {STAGE_TARGETS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Restaging CT after cycle 6" />
          <FormControl>
            <FormLabel sx={{ mb: 1, fontSize: 13 }}>Re-review every</FormLabel>
            <ToggleButtonGroup exclusive size="small" value={every} onChange={(_, v: 30 | 60 | null) => v && setEvery(v)} aria-label="Re-review every">
              <ToggleButton value={30}>30 days</ToggleButton>
              <ToggleButton value={60}>60 days</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              First review {fmtShort(first)} (the {every === 30 ? '1-month' : '2-month'} review), then every {every} days from today.
            </Typography>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            actions.addWatch(patient.id, {
              trialId: trial.id,
              openingId: openingId || undefined,
              reason,
              waitFor: reason === 'status_change' ? waitFor : undefined,
              reviewEveryDays: every,
              note: note.trim() || undefined,
            });
            toast(`Watching ${where}. First review ${fmtShort(first)}.`);
            onClose();
          }}
        >
          Start watching
        </Button>
      </DialogActions>
    </Dialog>
  );
}
