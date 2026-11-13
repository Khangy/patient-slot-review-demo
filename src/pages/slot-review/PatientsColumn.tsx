import { Box, Button, InputAdornment, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PatientView } from '@/domain/board';
import { labelFor, member } from '@/domain/names';
import { dxStage, keyMarker } from '@/domain/summary';
import { useStore } from '@/state/store';
import { Mono, PersonTag, ToneChip, useTones } from '@/components/ui';
import { BOARD_STATUS, CANDIDATE } from '@/components/statusMeta';
import { useBoardUi, dueInfo, openStepsFor } from './boardUi';
import { CardButton, Column, GroupLabel, Muted, Row } from './parts';
import { AddToReviewDialog } from './dialogs';

type SectionKey = 'decide' | 'blocked' | 'none' | 'progress' | 'other';

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: 'decide', title: 'To decide' },
  { key: 'blocked', title: 'Blocked' },
  { key: 'none', title: 'Nothing queued' },
  { key: 'progress', title: 'In progress' },
  { key: 'other', title: 'Other' },
];

function sectionOf(v: PatientView): SectionKey {
  if (v.boardStatus === 'slot_accepted' || v.boardStatus === 'pre_screening') return 'progress';
  if (v.decision?.kind === 'proposed') return 'decide';
  if (v.blocked) return 'blocked';
  if (v.boardStatus === 'not_queued') return 'none';
  return 'other';
}

export function PatientsColumn() {
  const { board } = useStore();
  const ui = useBoardUi();
  const [q, setQ] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const views = useMemo(() => {
    const s = q.trim().toLowerCase();
    return board.patients
      .filter((v) => v.inReview)
      .filter((v) => {
        if (!s) return true;
        const p = v.patient;
        return `${p.first} ${p.last} ${p.last}, ${p.first} ${p.mrn} ${ui.nameOf(p.id)}`.toLowerCase().includes(s);
      })
      .sort((a, b) => a.patient.last.localeCompare(b.patient.last));
  }, [board, q, ui]);

  const grouped = useMemo(() => {
    const out: Record<SectionKey, PatientView[]> = { decide: [], blocked: [], none: [], progress: [], other: [] };
    views.forEach((v) => out[sectionOf(v)].push(v));
    return out;
  }, [views]);

  const sel = ui.selection;
  useEffect(() => {
    if (!ui.wide || !sel) return;
    const target =
      sel.kind === 'patient'
        ? ref.current?.querySelector(`[data-pid="${sel.id}"]`)
        : ref.current?.querySelector('[data-bright="true"]');
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [sel, ui.wide]);

  const total = board.patients.filter((v) => v.inReview).length;

  return (
    <Column
      ref={ref}
      label="Patients"
      title="Patients"
      sub="Select a patient to see their possible slots"
      actions={
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ whiteSpace: 'nowrap' }}>
          Add to Review
        </Button>
      }
      tabs={
        <TextField
          size="small"
          placeholder={`Search ${total} patients by name or MRN`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
            htmlInput: { 'aria-label': 'Search patients in review' },
          }}
        />
      }
    >
      {views.length === 0 ? <Muted>No patient in the review matches "{q}".</Muted> : null}
      {SECTIONS.map(({ key, title }) =>
        grouped[key].length ? (
          <Box key={key} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <GroupLabel>
              {title} · {grouped[key].length}
            </GroupLabel>
            {grouped[key].map((v) => (
              <PatientCard key={v.patient.id} view={v} />
            ))}
          </Box>
        ) : null,
      )}
      <AddToReviewDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Column>
  );
}

function PatientCard({ view: v }: { view: PatientView }) {
  const { state, board } = useStore();
  const ui = useBoardUi();
  const tones = useTones();
  const p = v.patient;
  const sel = ui.selection;
  const selected = sel?.kind === 'patient' && sel.id === p.id;

  // Opening selected: its candidates and fits-not-queued stay bright, with a pill (SR2).
  let pill: { label: string; tone: keyof typeof tones } | undefined;
  let dim = false;
  if (sel?.kind === 'opening') {
    const ov = board.openingById[sel.id];
    const cand = ov?.candidates.find((c) => c.patientId === p.id);
    if (cand) {
      const meta = CANDIDATE[cand.status];
      pill = { label: cand.rank ? `#${cand.rank} ${meta.label}` : meta.label, tone: meta.tone };
    } else if (ov?.fitNotQueued.includes(p.id)) pill = { label: 'Fits, not queued', tone: 'teal' };
    else dim = true;
  }

  const stepsForFilter = ui.assigned !== 'everyone' && v.fixedPairing ? openStepsFor(v.fixedPairing, ui.assigned) : [];
  const status = BOARD_STATUS[v.boardStatus];
  const marker = keyMarker(p);
  const step = v.openStep?.step;
  const due = dueInfo(step);

  return (
    <CardButton selected={selected} dim={dim} highlight={!!pill} onClick={() => ui.selectPatient(p.id)} data={{ 'data-pid': p.id, 'data-bright': pill ? 'true' : 'false' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box component="span" sx={{ fontWeight: 600, fontSize: 14.5 }}>
              {ui.nameOf(p.id)}
            </Box>
            <Mono sx={{ ml: 0.75, color: 'text.secondary', fontSize: 12 }}>{ui.mrnOf(p.id)}</Mono>
          </Box>
          <ToneChip tone={status.tone} label={status.label} size="tiny" />
        </Box>
        <Muted>
          {dxStage(p)}
          {marker ? ` · ${marker}` : ''}
        </Muted>
        <Box sx={{ fontSize: 12.5 }}>
          {v.fixedPairing ? (
            <>→ {labelFor(state.trials, v.fixedPairing.openingId)}</>
          ) : (
            <>
              <b>{v.possibleNow.length}</b> possible slot{v.possibleNow.length === 1 ? '' : 's'} now · <b>{v.possibleSoon.length}</b> soon
            </>
          )}
        </Box>
        {p.queue.length && !v.fixedPairing ? (
          <Muted size={12}>Queued: {p.queue.map((e) => labelFor(state.trials, e.openingId)).join('; ')}</Muted>
        ) : null}
        {!p.queue.length && p.addedToReviewBy ? <Muted size={12}>Added by {member(p.addedToReviewBy).short}, nothing queued yet</Muted> : null}
        {step?.assignee ? (
          <Row>
            <PersonTag userId={step.assignee} suffix={`· ${step.label.toLowerCase()}`} />
            {due ? (
              <Box component="span" sx={{ fontSize: 12, fontWeight: due.tone === 'grey' ? 400 : 600, color: due.tone === 'grey' ? 'text.secondary' : tones[due.tone].fg }}>
                {due.text}
              </Box>
            ) : null}
          </Row>
        ) : null}
        {pill || stepsForFilter.length ? (
          <Row sx={{ mt: 0.25 }}>
            {pill ? <ToneChip tone={pill.tone} label={pill.label} size="tiny" /> : null}
            {stepsForFilter.length && ui.assigned !== 'everyone' ? (
              <ToneChip tone="teal" variant="solid" label={`Step for ${member(ui.assigned).short}`} size="tiny" />
            ) : null}
          </Row>
        ) : null}
      </Box>
    </CardButton>
  );
}
