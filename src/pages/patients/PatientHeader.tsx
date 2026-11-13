import { Box, Button, ButtonBase, ListItemText, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useState, type ReactNode } from 'react';
import type { PatientView } from '@/domain/board';
import { ageOn, fmtNumeric, fmtShort } from '@/domain/dates';
import { listMrn, listName, maskedDob } from '@/domain/names';
import { headerDiagnosis } from '@/domain/summary';
import { NOT_SEEKING_LABEL, useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { Mono, useTone } from '@/components/ui';
import { PATIENT_STATUS } from '@/components/statusMeta';
import { DesignNote } from '@/notes/DesignNote';
import { FollowStar, RevealButton } from './common';
import { EditDemographicsDialog, NotSeekingDialog } from './dialogs';
import { matchCount } from './trialOptions';

function Cell({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        {label}
        {note ? <DesignNote id={note} /> : null}
      </Typography>
      <Box sx={{ mt: 0.25 }}>{children}</Box>
    </Box>
  );
}

export function PatientHeader({
  view,
  revealed,
  onToggleReveal,
  onChoosePrimary,
}: {
  view: PatientView;
  revealed: boolean;
  onToggleReveal: () => void;
  onChoosePrimary: () => void;
}) {
  const { state, board, actions } = useStore();
  const toast = useToast();
  const p = view.patient;
  const showPii = state.settings.showPii;
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [notSeeking, setNotSeeking] = useState(false);
  const [editing, setEditing] = useState(false);
  const meta = PATIENT_STATUS[p.status];
  const tone = useTone(meta.tone);
  const amber = useTone('amber');
  const dx = headerDiagnosis(p);
  const matches = matchCount(view, board);
  const visible = showPii || revealed;

  const choose = (s: 'seeking' | 'watchlist') => {
    setMenu(null);
    if (p.status === s) return;
    actions.setStatus(p.id, s);
    toast(s === 'seeking' ? 'Status: Seeking, look now.' : 'Status: Watchlist, maybe later.');
  };

  const statusText = p.status === 'not_seeking' && p.notSeekingReason ? `${meta.label} · ${NOT_SEEKING_LABEL[p.notSeekingReason]}` : meta.label;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'minmax(220px, 1.4fr) auto auto minmax(200px, 1.6fr) auto' },
          gap: { xs: 1.5, md: 3 },
          alignItems: 'start',
        }}
      >
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <FollowStar patient={p} size="medium" />
          {!showPii ? <RevealButton revealed={revealed} onToggle={onToggleReveal} /> : null}
          <Cell label="Name">
            <Typography component="h1" sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25, wordBreak: 'break-word' }}>
              {listName(p, showPii, revealed)}
            </Typography>
          </Cell>
        </Box>
        <Cell label="MRN">
          <Mono sx={{ fontWeight: 600 }}>{listMrn(p, showPii, revealed)}</Mono>
        </Cell>
        <Cell label="DOB (age)">
          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
            {visible ? fmtNumeric(p.dob) : maskedDob(p)} ({ageOn(p.dob)})
          </Typography>
        </Cell>
        <Cell label="Primary diagnosis" note="06">
          {dx ? (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {dx}
            </Typography>
          ) : (
            <Button size="small" variant="outlined" onClick={onChoosePrimary} sx={{ mt: 0.25 }}>
              {p.diagnoses.length} diagnoses · Choose primary
            </Button>
          )}
        </Cell>
        <Cell label="Patient status" note="R2">
          <ButtonBase
            onClick={(e) => setMenu(e.currentTarget)}
            aria-haspopup="menu"
            aria-expanded={!!menu}
            aria-label={`Patient status: ${statusText}. Change status`}
            sx={{
              mt: 0.25,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.25,
              pl: 1.25,
              pr: 0.5,
              minHeight: 30,
              borderRadius: 999,
              border: `1px solid ${tone.border}`,
              bgcolor: tone.bg,
              color: tone.fg,
              fontWeight: 600,
              fontSize: 13,
              textAlign: 'left',
              '&:hover': { borderColor: tone.solid },
              '&:focus-visible': { outline: `2px solid ${tone.solid}`, outlineOffset: 2 },
            }}
          >
            {statusText}
            <ArrowDropDownIcon fontSize="small" />
          </ButtonBase>
        </Cell>
      </Box>

      <Stack direction="row" alignItems="center" sx={{ mt: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
          Referred {fmtShort(p.referredOn)} · status since {fmtShort(p.statusSince)}
        </Typography>
        <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={() => setEditing(true)}>
          Edit demographics
        </Button>
        <DesignNote id="07" />
      </Stack>

      {p.status === 'undeclared' ? (
        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: amber.bg, border: `1px solid ${amber.border}` }}>
          <Typography sx={{ fontWeight: 600, color: amber.fg }}>
            New referral {fmtShort(p.referredOn)}. Is this patient looking for a trial?
            <DesignNote id="07" />
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
            <Button variant="contained" onClick={() => choose('seeking')}>
              Seeking, look now
            </Button>
            <Button variant="outlined" onClick={() => choose('watchlist')}>
              Watchlist, maybe later
            </Button>
            <Button variant="outlined" onClick={() => setNotSeeking(true)}>
              Not seeking…
            </Button>
          </Stack>
          <Typography variant="caption" component="div" sx={{ mt: 1, color: 'text.secondary' }}>
            Queueing one of the {matches} match{matches === 1 ? '' : 'es'} below also marks Seeking.
          </Typography>
        </Box>
      ) : null}

      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem selected={p.status === 'seeking'} onClick={() => choose('seeking')}>
          <ListItemText primary="Seeking, look now" secondary="Matched and queued for trials now" />
        </MenuItem>
        <MenuItem selected={p.status === 'watchlist'} onClick={() => choose('watchlist')}>
          <ListItemText primary="Watchlist, maybe later" secondary="May need a trial in the future" />
        </MenuItem>
        <MenuItem
          selected={p.status === 'not_seeking'}
          onClick={() => {
            setMenu(null);
            setNotSeeking(true);
          }}
        >
          <ListItemText primary="Not seeking…" secondary="Choose a reason" />
        </MenuItem>
      </Menu>

      {notSeeking ? <NotSeekingDialog patient={p} onClose={() => setNotSeeking(false)} /> : null}
      {editing ? <EditDemographicsDialog patient={p} onClose={() => setEditing(false)} /> : null}
    </Paper>
  );
}
