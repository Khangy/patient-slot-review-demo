import { Box, Button, InputAdornment, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { PatientView } from '@/domain/board';
import { labelFor, member } from '@/domain/names';
import { dxStage, keyMarker } from '@/domain/summary';
import { useStore } from '@/state/store';
import { Mono, PersonTag, ToneChip, useTones, type ToneName } from '@/components/ui';
import { BOARD_STATUS, CANDIDATE } from '@/components/statusMeta';
import { DesignNote } from '@/notes/DesignNote';
import { useBoardUi, dueInfo, openStepsFor } from './boardUi';
import { CardButton, Column, GroupLabel, ListFrame, Muted, ReduceBar, Row } from './parts';
import { AddToReviewDialog } from './dialogs';
import { isDragging, useDrag } from './dnd';
import { patientsForOpening, sectionOf, SECTIONS, useShowAll, type SectionKey } from './reduce';

export function PatientsColumn() {
  const { board } = useStore();
  const ui = useBoardUi();
  const [q, setQ] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const { patientId: selPid, openingId: selOid } = ui.selection;
  const [showAll, setShowAll] = useShowAll(selOid);
  const ref = useRef<HTMLElement>(null);
  const list = ui.view === 'list';

  const inReview = useMemo(() => board.patients.filter((v) => v.inReview).sort((a, b) => a.patient.last.localeCompare(b.patient.last)), [board]);
  const matchesQ = (v: PatientView) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    const p = v.patient;
    return `${p.first} ${p.last} ${p.last}, ${p.first} ${p.mrn} ${ui.nameOf(p.id)}`.toLowerCase().includes(s);
  };
  const views = inReview.filter(matchesQ);

  // A selected slot narrows this list to the patients it applies to (SR6): who holds it, the
  // proposals, who is next in line, and everyone else queued or fitting.
  const forOpening = selOid ? patientsForOpening(board, selOid) : null;
  const narrow = forOpening && !showAll ? forOpening : null;
  const groups: { key: string; title: string; items: PatientView[] }[] = (() => {
    if (narrow) {
      const pick = (ids: string[]) => ids.map((id) => board.patientById[id]).filter((v): v is PatientView => !!v && matchesQ(v));
      return [
        { key: 'holding', title: 'Holding a slot here', items: pick(narrow.holding) },
        { key: 'proposed', title: 'Proposed here', items: pick(narrow.proposed) },
        { key: 'line', title: 'Next in line', items: pick(narrow.nextInLine) },
        { key: 'queued', title: 'Also queued here', items: pick(narrow.queued) },
        { key: 'fits', title: 'Fits, not queued', items: pick(narrow.fits) },
        { key: 'ne', title: 'Queued, not eligible', items: pick(narrow.notEligible) },
      ];
    }
    const out: Record<SectionKey, PatientView[]> = { decide: [], blocked: [], none: [], progress: [], other: [] };
    views.forEach((v) => out[sectionOf(v)].push(v));
    return SECTIONS.map(({ key, title }) => ({ key, title, items: out[key] }));
  })();

  useEffect(() => {
    if (!ui.wide || (!selPid && !selOid) || isDragging()) return;
    const target = selPid ? ref.current?.querySelector(`[data-pid="${selPid}"]`) : ref.current?.querySelector('[data-bright="true"]');
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selPid, selOid, ui.wide]);

  const shownCount = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Column
      ref={ref}
      label="Patients"
      title={
        <>
          Patients
          <DesignNote id="SR5" />
        </>
      }
      sub="Select a patient to see their possible slots, or drag one onto a slot"
      actions={
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ whiteSpace: 'nowrap' }}>
          Add to Review
        </Button>
      }
      tabs={
        <TextField
          size="small"
          placeholder={`Search ${inReview.length} patients by name or MRN`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
            htmlInput: { 'aria-label': 'Search patients in review' },
          }}
        />
      }
    >
      {forOpening ? (
        <ReduceBar
          shown={forOpening.all.length}
          total={inReview.length}
          noun="patients"
          who={board.openingById[selOid!]?.short ?? ''}
          all={showAll}
          onToggle={setShowAll}
        />
      ) : null}
      {shownCount === 0 && q ? <Muted>No patient {narrow ? 'for this slot ' : 'in the review '}matches "{q}".</Muted> : null}
      {narrow && narrow.all.length === 0 ? <Muted>No patient in the review is queued for this slot or fits it.</Muted> : null}
      {groups.map((g) =>
        g.items.length ? (
          <Box key={g.key} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <GroupLabel>
              {g.title} · {g.items.length}
            </GroupLabel>
            <ListFrame list={list}>
              {g.items.map((v) => (
                <PatientCard key={v.patient.id} view={v} narrowed={!!narrow} />
              ))}
            </ListFrame>
          </Box>
        ) : null,
      )}
      <AddToReviewDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Column>
  );
}

function PatientCard({ view: v, narrowed }: { view: PatientView; narrowed: boolean }) {
  const { state, board } = useStore();
  const ui = useBoardUi();
  const drag = useDrag();
  const tones = useTones();
  const p = v.patient;
  const { patientId: selPid, openingId: selOid } = ui.selection;
  const selected = selPid === p.id;

  // Opening selected: its candidates and fits-not-queued get a pill (SR2); with the list
  // narrowed to them nothing is dimmed (SR6), with "Show all" the rest dims as before.
  let pill: { label: string; tone: ToneName } | undefined;
  let dim = false;
  if (selOid) {
    const ov = board.openingById[selOid];
    const cand = ov?.candidates.find((c) => c.patientId === p.id);
    const held = ov?.fixed.find((f) => f.patientId === p.id);
    if (cand) {
      const meta = CANDIDATE[cand.status];
      pill = { label: cand.inLine && cand.inLine > 1 ? `${meta.label} · ${cand.inLine}` : meta.label, tone: meta.tone };
    } else if (held) pill = { label: held.status === 'accepted' ? 'Accepted here' : 'Pre-screening here', tone: held.status === 'accepted' ? 'green' : 'purple' };
    else if (ov?.fitNotQueued.includes(p.id)) pill = { label: 'Fits, not queued', tone: 'teal' };
    else dim = !narrowed;
  }

  const stepsForFilter = ui.assigned !== 'everyone' && v.fixedPairing ? openStepsFor(v.fixedPairing, ui.assigned) : [];
  const status = BOARD_STATUS[v.boardStatus];
  const marker = keyMarker(p);
  const step = v.openStep?.step;
  const due = dueInfo(step);
  const canDrag = !v.fixedPairing && p.status !== 'not_seeking';
  const where = v.fixedPairing ? (
    <>→ {labelFor(state.trials, v.fixedPairing.openingId)}</>
  ) : (
    <>
      <b>{v.possibleNow.length}</b> possible now · <b>{v.possibleSoon.length}</b> soon
    </>
  );
  const grip = canDrag ? (
    <DragIndicatorIcon aria-hidden="true" sx={{ fontSize: 16, color: 'text.disabled', mt: '2px', ml: -0.5, flexShrink: 0 }} />
  ) : (
    <Box sx={{ width: 12, flexShrink: 0 }} />
  );
  const common = {
    selected,
    dim,
    highlight: !!pill && !narrowed,
    grab: canDrag,
    ghosted: drag.patientId === p.id,
    onClick: () => ui.selectPatient(p.id),
    onPointerDown: canDrag ? (e: ReactPointerEvent) => drag.start(p.id, e) : undefined,
    data: { 'data-pid': p.id, 'data-bright': pill ? 'true' : 'false' },
  };

  // Compact and List keep everyone short; the selected patient opens as a full card so the
  // team sees what it needs to decide (SR8).
  if (ui.view === 'list' && !selected) {
    return (
      <CardButton {...common} variant="row">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', columnGap: 0.75 }}>
          {grip}
          <Box sx={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13.5 }}>
            <Box component="span" sx={{ fontWeight: 600 }}>
              {ui.nameOf(p.id)}
            </Box>
            <Mono sx={{ ml: 0.75, color: 'text.secondary', fontSize: 11.5 }}>{ui.mrnOf(p.id)}</Mono>
            <Muted size={12}> · {v.fixedPairing ? `→ ${labelFor(state.trials, v.fixedPairing.openingId)}` : `${v.possibleNow.length} now · ${v.possibleSoon.length} soon`}</Muted>
          </Box>
          {pill ? <ToneChip tone={pill.tone} label={pill.label} size="tiny" /> : <ToneChip tone={status.tone} label={status.label} size="tiny" />}
        </Box>
      </CardButton>
    );
  }

  if (ui.view === 'compact' && !selected) {
    return (
      <CardButton {...common} dense>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {grip}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Box component="span" sx={{ fontWeight: 600, fontSize: 14 }}>
                  {ui.nameOf(p.id)}
                </Box>
                <Mono sx={{ ml: 0.75, color: 'text.secondary', fontSize: 11.5 }}>{ui.mrnOf(p.id)}</Mono>
              </Box>
              <ToneChip tone={status.tone} label={status.label} size="tiny" />
            </Box>
            <Box sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {dxStage(p)} · <Box component="span" sx={{ color: 'text.primary' }}>{where}</Box>
            </Box>
            {pill || stepsForFilter.length ? (
              <Row>
                {pill ? <ToneChip tone={pill.tone} label={pill.label} size="tiny" /> : null}
                {stepsForFilter.length && ui.assigned !== 'everyone' ? <ToneChip tone="teal" variant="solid" label={`Step for ${member(ui.assigned).short}`} size="tiny" /> : null}
              </Row>
            ) : null}
          </Box>
        </Box>
      </CardButton>
    );
  }

  return (
    <CardButton {...common} variant={ui.view === 'list' ? 'row' : 'card'} sx={ui.view === 'list' ? { py: 1.25 } : undefined}>
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        {grip}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
          <Box sx={{ fontSize: 12.5 }}>{where}</Box>
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
      </Box>
    </CardButton>
  );
}
