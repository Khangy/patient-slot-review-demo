import { Box, Button, ButtonBase, Popover, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { placeCheck, type Board, type OpeningView, type PatientView } from '@/domain/board';
import { isFit } from '@/domain/matching';
import { ordinal } from '@/domain/names';
import { useStore, MAX_QUEUE } from '@/state/store';
import { useToast } from '@/components/Toast';
import { ToneChip, useTone, useTones, type ToneName } from '@/components/ui';
import { BOARD_STATUS } from '@/components/statusMeta';
import { DesignNote } from '@/notes/DesignNote';
import { useBoardUi } from './boardUi';
import { useBoardActions } from './BoardActions';
import { Muted, ReduceBar, Row } from './parts';
import { openingsForPatient, patientsForOpening, sectionOf, SECTIONS, useShowAll, type SectionKey } from './reduce';

// SR7 Matrix: every patient in review against every open slot, one cell per pairing. The
// shape crew-pairing, bed-board and residency-match tools use to show a whole allocation at
// once. A cell opens what can be done with that pairing: accept, dismiss, place, queue.

type CellKind =
  | 'accepted'
  | 'pre_screening'
  | 'proposed'
  | 'reserve'
  | 'placed_elsewhere'
  | 'queued_no_slot'
  | 'not_eligible'
  | 'dismissed'
  | 'fits'
  | 'fits_no_slot'
  | 'none';

interface Cell {
  kind: CellKind;
  choice?: number;
  rank?: number;
}

const CELL: Record<CellKind, { label: string; tone: ToneName; mark: 'solid' | 'outline' | 'dashed' | 'dot' | 'ring' | 'none' }> = {
  accepted: { label: 'Accepted', tone: 'green', mark: 'solid' },
  pre_screening: { label: 'Pre-screening', tone: 'purple', mark: 'solid' },
  proposed: { label: 'Proposed', tone: 'blue', mark: 'solid' },
  reserve: { label: 'Queued, in reserve', tone: 'amber', mark: 'outline' },
  placed_elsewhere: { label: 'Queued, placed elsewhere', tone: 'grey', mark: 'outline' },
  queued_no_slot: { label: 'Queued, no open slot', tone: 'amber', mark: 'dashed' },
  not_eligible: { label: 'Queued, not eligible', tone: 'red', mark: 'outline' },
  dismissed: { label: 'Dismissed', tone: 'grey', mark: 'outline' },
  fits: { label: 'Fits, not queued', tone: 'teal', mark: 'dot' },
  fits_no_slot: { label: 'Fits, no open slot', tone: 'teal', mark: 'ring' },
  none: { label: 'Not a fit', tone: 'grey', mark: 'none' },
};

function cellOf(pv: PatientView, ov: OpeningView): Cell {
  const oid = ov.opening.id;
  const fx = pv.fixedPairing;
  if (fx?.openingId === oid) return { kind: fx.status === 'accepted' ? 'accepted' : 'pre_screening', choice: fx.choice };
  const d = pv.decision;
  if (d?.kind === 'proposed' && d.openingId === oid) return { kind: 'proposed', choice: d.choice };
  const cand = ov.candidates.find((c) => c.patientId === pv.patient.id);
  if (cand) {
    if (cand.status === 'dismissed') return { kind: 'dismissed', choice: cand.choice };
    if (cand.status === 'not_eligible') return { kind: 'not_eligible', choice: cand.choice };
    if (cand.status === 'placed_elsewhere') return { kind: 'placed_elsewhere', choice: cand.choice, rank: cand.rank };
    return { kind: ov.openNow ? 'reserve' : 'queued_no_slot', choice: cand.choice, rank: cand.rank };
  }
  if (isFit(pv.matchById[oid])) return { kind: ov.openNow ? 'fits' : 'fits_no_slot' };
  return { kind: 'none' };
}

function Mark({ cell }: { cell: Cell }) {
  const tones = useTones();
  const meta = CELL[cell.kind];
  const t = tones[meta.tone];
  const text = cell.kind === 'accepted' || cell.kind === 'pre_screening' ? '✓' : cell.kind === 'dismissed' ? '×' : cell.kind === 'not_eligible' ? '!' : cell.choice ? String(cell.choice) : '';
  if (meta.mark === 'none') return null;
  if (meta.mark === 'dot') return <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: t.solid }} />;
  if (meta.mark === 'ring') return <Box sx={{ width: 9, height: 9, borderRadius: '50%', border: `1.5px solid ${t.solid}` }} />;
  return (
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        border: `1.5px ${meta.mark === 'dashed' ? 'dashed' : 'solid'} ${t.solid}`,
        bgcolor: meta.mark === 'solid' ? t.solid : 'transparent',
        color: meta.mark === 'solid' ? '#fff' : t.fg,
      }}
    >
      {text}
    </Box>
  );
}

function describe(board: Board, pv: PatientView, ov: OpeningView, cell: Cell): string {
  const choice = cell.choice ? `${ordinal(cell.choice)} choice` : '';
  switch (cell.kind) {
    case 'proposed':
      return `Proposed by the optimizer, ${choice}.`;
    case 'accepted':
      return pv.fixedPairing?.placedByHand ? 'Placed by hand at the meeting.' : 'Accepted at the meeting.';
    case 'pre_screening':
      return 'In pre-screening for this slot.';
    case 'reserve':
      return `Queued (${choice}), #${cell.rank} in line: every open slot here is proposed to someone ranked ahead.`;
    case 'placed_elsewhere':
      return `Queued (${choice}), but proposed or placed for ${board.openingById[pv.decision?.openingId ?? pv.fixedPairing?.openingId ?? '']?.short ?? 'another slot'}.`;
    case 'queued_no_slot':
      return `Queued (${choice}); no slot is open here right now.`;
    case 'not_eligible':
    case 'none': {
      const c = placeCheck(board, pv.patient.id, ov.opening.id);
      const why = c.ok ? '' : c.reason;
      return cell.kind === 'not_eligible' ? `Queued (${choice}), not eligible on the last match. ${why}.` : `${why}.`;
    }
    case 'dismissed':
      return 'Dismissed by the team at this meeting.';
    case 'fits':
      return 'Fits and a slot is open, but this slot is not on their queue.';
    case 'fits_no_slot':
      return 'Fits, but no slot is open here right now.';
  }
}

export function MatrixView() {
  const { board } = useStore();
  const ui = useBoardUi();
  const teal = useTone('teal');
  const [showAll, setShowAll] = useShowAll(ui.selection);
  const [open, setOpen] = useState<{ pid: string; oid: string; anchor: HTMLElement } | null>(null);
  const sel = ui.selection;

  const allCols = board.openings.filter((o) => o.opening.state === 'open');
  const inReview = board.patients.filter((v) => v.inReview).sort((a, b) => a.patient.last.localeCompare(b.patient.last));

  // The same narrowing as the columns (SR6): a patient narrows the slots, a slot narrows the patients.
  const forPatient = sel?.kind === 'patient' ? openingsForPatient(board, sel.id) : null;
  const forOpening = sel?.kind === 'opening' ? patientsForOpening(board, sel.id) : null;
  const cols = forPatient && !showAll ? forPatient.all.map((id) => board.openingById[id]).filter(Boolean) : allCols;
  const sections: { key: string; title: string; rows: PatientView[] }[] =
    forOpening && !showAll
      ? [
          { key: 'holding', title: 'Holding a slot here', rows: forOpening.holding.map((id) => board.patientById[id]) },
          { key: 'ranked', title: 'Candidates in rank order', rows: forOpening.ranked.map((id) => board.patientById[id]) },
          { key: 'fits', title: 'Fits, not queued', rows: forOpening.fits.map((id) => board.patientById[id]) },
          { key: 'ne', title: 'Queued, not eligible', rows: forOpening.notEligible.map((id) => board.patientById[id]) },
        ]
      : (() => {
          const by: Record<SectionKey, PatientView[]> = { decide: [], blocked: [], none: [], progress: [], other: [] };
          inReview.forEach((v) => by[sectionOf(v)].push(v));
          return SECTIONS.map(({ key, title }) => ({ key, title, rows: by[key] }));
        })();

  // header groups: consecutive openings of one trial
  const groups: { trialId: string; short: string; span: number }[] = [];
  cols.forEach((ov) => {
    const last = groups[groups.length - 1];
    if (last && last.trialId === ov.trial.id) last.span += 1;
    else groups.push({ trialId: ov.trial.id, short: ov.trial.short, span: 1 });
  });

  const stickyTh = { position: 'sticky', bgcolor: 'background.paper', zIndex: 2 } as const;
  const H1 = 30;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Row sx={{ px: 0.25, gap: 1.5 }}>
        <Typography component="h2" variant="h6" sx={{ fontSize: 17 }}>
          Matrix: patients by open slots
        </Typography>
        <DesignNote id="SR7" />
        <Legend />
      </Row>
      {forPatient ? <ReduceBar shown={forPatient.all.length} total={allCols.length} noun="openings" who={ui.nameOf(sel!.id)} all={showAll} onToggle={setShowAll} /> : null}
      {forOpening ? (
        <ReduceBar shown={forOpening.all.length} total={inReview.length} noun="patients" who={board.openingById[sel!.id]?.short ?? ''} all={showAll} onToggle={setShowAll} />
      ) : null}
      {cols.length === 0 ? <Muted>No open slot fits {sel ? ui.nameOf(sel.id) : 'anyone'} right now.</Muted> : null}
      <Box
        data-scroll-col=""
        sx={{ overflow: 'auto', maxHeight: { md: 'calc(100vh - 92px)' }, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}
      >
        <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, minWidth: '100%' }}>
          <thead>
            <tr>
              <Box
                component="th"
                rowSpan={2}
                scope="col"
                sx={{ ...stickyTh, top: 0, left: 0, zIndex: 3, textAlign: 'left', px: 1.5, verticalAlign: 'bottom', pb: 1, borderBottom: 1, borderRight: 1, borderColor: 'divider', minWidth: 220 }}
              >
                Patient
              </Box>
              {groups.map((g) => (
                <Box
                  component="th"
                  key={g.trialId}
                  colSpan={g.span}
                  scope="colgroup"
                  sx={{ ...stickyTh, top: 0, height: H1, px: 1, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', borderBottom: 1, borderLeft: 1, borderColor: 'divider' }}
                >
                  {g.short}
                </Box>
              ))}
            </tr>
            <tr>
              {cols.map((ov, i) => {
                const on = sel?.kind === 'opening' && sel.id === ov.opening.id;
                const first = i === 0 || cols[i - 1].trial.id !== ov.trial.id;
                const own = ov.opening.path[ov.opening.path.length - 1] ?? 'Whole trial';
                return (
                  <Box
                    component="th"
                    key={ov.opening.id}
                    scope="col"
                    sx={{ ...stickyTh, top: H1, p: 0, borderBottom: 1, borderLeft: first ? 1 : 0, borderColor: 'divider', bgcolor: on ? teal.bg : 'background.paper' }}
                  >
                    <ButtonBase
                      onClick={() => ui.selectOpening(ov.opening.id)}
                      title={ov.full}
                      aria-pressed={on}
                      sx={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 68, maxWidth: 104, px: 0.75, py: 0.75, fontFamily: 'inherit', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <Box sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25, textAlign: 'center' }}>{own}</Box>
                      <Box sx={{ fontSize: 11, color: ov.openNow ? 'text.secondary' : 'text.disabled', mt: 0.25 }}>{ov.openNow} open</Box>
                    </ButtonBase>
                  </Box>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sections.map((s) =>
              s.rows.length ? (
                <SectionRows key={s.key} title={s.title} rows={s.rows} cols={cols} onCell={(pid, oid, anchor) => setOpen({ pid, oid, anchor })} />
              ) : null,
            )}
          </tbody>
        </Box>
      </Box>
      {open ? <CellPopover {...open} onClose={() => setOpen(null)} /> : null}
    </Box>
  );
}

function SectionRows({
  title,
  rows,
  cols,
  onCell,
}: {
  title: string;
  rows: PatientView[];
  cols: OpeningView[];
  onCell: (pid: string, oid: string, anchor: HTMLElement) => void;
}) {
  const ui = useBoardUi();
  const teal = useTone('teal');
  const sel = ui.selection;
  return (
    <>
      <tr>
        <Box
          component="th"
          colSpan={cols.length + 1}
          scope="colgroup"
          sx={{ position: 'sticky', left: 0, textAlign: 'left', px: 1.5, pt: 1.25, pb: 0.5, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: 1, borderColor: 'divider' }}
        >
          {title} · {rows.length}
        </Box>
      </tr>
      {rows.map((pv) => {
        const p = pv.patient;
        const rowOn = sel?.kind === 'patient' && sel.id === p.id;
        const status = BOARD_STATUS[pv.boardStatus];
        return (
          <Box component="tr" key={p.id} sx={{ '&:hover td, &:hover th': { bgcolor: 'action.hover' } }}>
            <Box
              component="th"
              scope="row"
              sx={{ position: 'sticky', left: 0, zIndex: 1, p: 0, bgcolor: rowOn ? teal.bg : 'background.paper', borderBottom: 1, borderRight: 1, borderColor: 'divider', textAlign: 'left', fontWeight: 400 }}
            >
              <ButtonBase
                onClick={() => ui.selectPatient(p.id)}
                aria-pressed={rowOn}
                sx={{ display: 'flex', width: '100%', justifyContent: 'flex-start', gap: 1, px: 1.5, py: 0.75, fontFamily: 'inherit', textAlign: 'left' }}
              >
                <Box sx={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, fontSize: 13 }}>{ui.nameOf(p.id)}</Box>
                <ToneChip tone={status.tone} label={status.label} size="tiny" />
              </ButtonBase>
            </Box>
            {cols.map((ov, i) => {
              const cell = cellOf(pv, ov);
              const colOn = sel?.kind === 'opening' && sel.id === ov.opening.id;
              const first = i === 0 || cols[i - 1].trial.id !== ov.trial.id;
              const label = `${ui.nameOf(p.id)} · ${ov.short}: ${CELL[cell.kind].label}${cell.choice ? `, ${ordinal(cell.choice)} choice` : ''}`;
              return (
                <Box component="td" key={ov.opening.id} sx={{ p: 0, borderBottom: 1, borderLeft: first ? 1 : 0, borderColor: 'divider', bgcolor: colOn || rowOn ? teal.bg : undefined }}>
                  <ButtonBase
                    aria-label={label}
                    title={label}
                    onClick={(e) => onCell(p.id, ov.opening.id, e.currentTarget)}
                    sx={{ width: '100%', minWidth: 68, height: 38, '&:hover': { bgcolor: 'action.selected' } }}
                  >
                    <Mark cell={cell} />
                  </ButtonBase>
                </Box>
              );
            })}
          </Box>
        );
      })}
    </>
  );
}

function Legend() {
  const items: CellKind[] = ['proposed', 'accepted', 'pre_screening', 'reserve', 'queued_no_slot', 'placed_elsewhere', 'not_eligible', 'dismissed', 'fits', 'fits_no_slot'];
  return (
    <Box component="ul" aria-label="Legend" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, m: 0, p: 0, listStyle: 'none', fontSize: 12, color: 'text.secondary' }}>
      {items.map((k) => (
        <Box component="li" key={k} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 22, display: 'inline-flex', justifyContent: 'center', transform: 'scale(0.85)' }}>
            <Mark cell={{ kind: k, choice: k === 'proposed' || k === 'reserve' || k === 'queued_no_slot' || k === 'placed_elsewhere' ? 1 : undefined }} />
          </Box>
          {CELL[k].label}
        </Box>
      ))}
      <Box component="li" sx={{ color: 'text.secondary' }}>
        Number: their order of choice
      </Box>
    </Box>
  );
}

function CellPopover({ pid, oid, anchor, onClose }: { pid: string; oid: string; anchor: HTMLElement; onClose: () => void }) {
  const { state, board, actions } = useStore();
  const ui = useBoardUi();
  const act = useBoardActions();
  const toast = useToast();
  const pv = board.patientById[pid];
  const ov = board.openingById[oid];
  if (!pv || !ov) return null;
  const cell = cellOf(pv, ov);
  const check = placeCheck(board, pid, oid);
  const queued = pv.patient.queue.some((e) => e.openingId === oid);
  const dismissedPairing = state.pairings.find((pr) => pr.patientId === pid && pr.openingId === oid && pr.status === 'dismissed');
  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };

  const buttons: ReactNode[] = [];
  if (cell.kind === 'proposed') {
    buttons.push(
      <Button key="acc" size="small" variant="contained" onClick={run(() => act.accept({ patientId: pid, openingId: oid, choice: cell.choice ?? 1 }))}>
        Accept…
      </Button>,
      <Button key="dis" size="small" variant="outlined" color="inherit" onClick={run(() => act.dismiss({ patientId: pid, openingId: oid, choice: cell.choice ?? 1 }))}>
        Dismiss…
      </Button>,
    );
  } else if (check.ok) {
    buttons.push(
      <Button key="place" size="small" variant="outlined" onClick={run(() => act.tryPlace(pid, oid))}>
        Place by hand…
      </Button>,
    );
  }
  if (!queued && isFit(pv.matchById[oid]) && !pv.fixedPairing && pv.patient.queue.length < MAX_QUEUE && pv.patient.status !== 'not_seeking') {
    buttons.push(
      <Button key="queue" size="small" onClick={run(() => toast(actions.queue(pid, oid).message))}>
        Queue
      </Button>,
    );
  }
  if (dismissedPairing) {
    buttons.push(
      <Button
        key="undo"
        size="small"
        onClick={run(() => {
          actions.undoPairing(dismissedPairing.id);
          toast(`Dismissal undone. ${ui.nameOf(pid)} is back in line.`);
        })}
      >
        Undo dismiss
      </Button>,
    );
  }

  return (
    <Popover
      open
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{ paper: { sx: { p: 1.5, maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 1 } } }}
    >
      <Box sx={{ fontWeight: 700, fontSize: 14 }}>
        {ui.nameOf(pid)} → {ov.short}
      </Box>
      <Row>
        <ToneChip tone={CELL[cell.kind].tone} label={CELL[cell.kind].label} size="tiny" />
        <Muted size={12}>{ov.openNow} open here</Muted>
      </Row>
      <Box sx={{ fontSize: 13, lineHeight: 1.5 }}>{describe(board, pv, ov, cell)}</Box>
      {buttons.length ? <Row>{buttons}</Row> : null}
      <Row sx={{ fontSize: 12.5 }}>
        <Button size="small" color="inherit" onClick={run(() => ui.focusPatient(pid))} sx={{ px: 0.5, minWidth: 0 }}>
          Focus on the patient
        </Button>
        <Button
          size="small"
          color="inherit"
          onClick={run(() => {
            if (!(ui.selection?.kind === 'opening' && ui.selection.id === oid)) ui.selectOpening(oid);
          })}
          sx={{ px: 0.5, minWidth: 0 }}
        >
          Focus on the slot
        </Button>
      </Row>
    </Popover>
  );
}
