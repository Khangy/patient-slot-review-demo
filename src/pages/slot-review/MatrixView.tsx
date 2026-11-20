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
  | 'next_in_line'
  | 'queued'
  | 'placed_elsewhere'
  | 'queued_no_slot'
  | 'not_eligible'
  | 'dismissed'
  | 'fits'
  | 'fits_no_slot'
  | 'none';

interface Cell {
  kind: CellKind;
  /** next_in_line: place in line if an offer here falls through */
  inLine?: number;
}

const CELL: Record<CellKind, { label: string; tone: ToneName; mark: 'solid' | 'outline' | 'dashed' | 'dot' | 'ring' | 'none' }> = {
  accepted: { label: 'Accepted', tone: 'green', mark: 'solid' },
  pre_screening: { label: 'Pre-screening', tone: 'purple', mark: 'solid' },
  proposed: { label: 'Optimizer proposed', tone: 'blue', mark: 'solid' },
  next_in_line: { label: 'Queued for Optimized Match, next in line', tone: 'amber', mark: 'outline' },
  queued: { label: 'Queued for Optimized Match, every slot proposed', tone: 'amber', mark: 'outline' },
  placed_elsewhere: { label: 'Queued for Optimized Match, placed elsewhere', tone: 'grey', mark: 'outline' },
  queued_no_slot: { label: 'Queued for Optimized Match, no open slot', tone: 'amber', mark: 'dashed' },
  not_eligible: { label: 'Queued for Optimized Match, not eligible', tone: 'red', mark: 'outline' },
  dismissed: { label: 'Dismissed', tone: 'grey', mark: 'outline' },
  fits: { label: 'Fits, not queued', tone: 'teal', mark: 'dot' },
  fits_no_slot: { label: 'Fits, no open slot', tone: 'teal', mark: 'ring' },
  none: { label: 'Not a fit', tone: 'grey', mark: 'none' },
};

function cellOf(pv: PatientView, ov: OpeningView): Cell {
  const oid = ov.opening.id;
  const fx = pv.fixedPairing;
  if (fx?.openingId === oid) return { kind: fx.status === 'accepted' ? 'accepted' : 'pre_screening' };
  const d = pv.decision;
  if (d?.kind === 'proposed' && d.openingId === oid) return { kind: 'proposed' };
  const cand = ov.candidates.find((c) => c.patientId === pv.patient.id);
  if (cand) {
    if (cand.status === 'dismissed') return { kind: 'dismissed' };
    if (cand.status === 'not_eligible') return { kind: 'not_eligible' };
    if (cand.status === 'placed_elsewhere') return { kind: 'placed_elsewhere' };
    if (!ov.openNow) return { kind: 'queued_no_slot' };
    if (cand.status === 'next_in_line') return { kind: 'next_in_line', inLine: cand.inLine };
    return { kind: 'queued' };
  }
  if (isFit(pv.matchById[oid])) return { kind: ov.openNow ? 'fits' : 'fits_no_slot' };
  return { kind: 'none' };
}

function Mark({ cell }: { cell: Cell }) {
  const tones = useTones();
  const meta = CELL[cell.kind];
  const t = tones[meta.tone];
  const text = cell.kind === 'accepted' || cell.kind === 'pre_screening' ? '✓' : cell.kind === 'dismissed' ? '×' : cell.kind === 'not_eligible' ? '!' : cell.inLine ? String(cell.inLine) : '';
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
  switch (cell.kind) {
    case 'proposed':
      return 'Optimizer proposed: of every plan, the one that seats the most patients.';
    case 'accepted':
      return pv.fixedPairing?.placedByHand ? 'Placed by hand at the meeting.' : 'Accepted at the meeting.';
    case 'pre_screening':
      return 'In pre-screening for this slot.';
    case 'next_in_line':
      return `Queued for Optimized Match. Every open slot here is proposed; ${cell.inLine === 1 ? 'first' : ordinal(cell.inLine ?? 1)} in line if an offer here falls through.`;
    case 'queued':
      return 'Queued for Optimized Match. Every open slot here is proposed to others, and the plan already seats as many patients as it can; ties go to whoever entered the pool first.';
    case 'placed_elsewhere':
      return `Queued for Optimized Match, but proposed or placed for ${board.openingById[pv.decision?.openingId ?? pv.fixedPairing?.openingId ?? '']?.short ?? 'another slot'}.`;
    case 'queued_no_slot':
      return 'Queued for Optimized Match; no slot is open here right now.';
    case 'not_eligible':
    case 'none': {
      const c = placeCheck(board, pv.patient.id, ov.opening.id);
      const why = c.ok ? '' : c.reason;
      return cell.kind === 'not_eligible' ? `Queued for Optimized Match, not eligible on the last match. ${why}.` : `${why}.`;
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
  const { patientId: selPid, openingId: selOid } = ui.selection;
  const [showAllCols, setShowAllCols] = useShowAll(selPid);
  const [showAllRows, setShowAllRows] = useShowAll(selOid);
  const [open, setOpen] = useState<{ pid: string; oid: string; anchor: HTMLElement } | null>(null);

  const allCols = board.openings.filter((o) => o.opening.state === 'open');
  const inReview = board.patients.filter((v) => v.inReview).sort((a, b) => a.patient.last.localeCompare(b.patient.last));

  // The same narrowing as the columns (SR6, SR8): a patient narrows the slots, a slot narrows
  // the patients, and with both selected both apply.
  const forPatient = selPid ? openingsForPatient(board, selPid) : null;
  const forOpening = selOid ? patientsForOpening(board, selOid) : null;
  // narrowed columns keep the board's trial order, so each trial stays one header group
  const cols = forPatient && !showAllCols ? allCols.filter((ov) => forPatient.all.includes(ov.opening.id)) : allCols;
  const rowsOf = (ids: string[]) => ids.map((id) => board.patientById[id]).filter((v): v is PatientView => !!v);
  const sections: { key: string; title: string; rows: PatientView[] }[] =
    forOpening && !showAllRows
      ? [
          { key: 'holding', title: 'Holding a slot here', rows: rowsOf(forOpening.holding) },
          { key: 'proposed', title: 'Optimizer proposed patient', rows: rowsOf(forOpening.proposed) },
          { key: 'line', title: 'Next in line', rows: rowsOf(forOpening.nextInLine) },
          { key: 'queued', title: 'Also queued for Optimized Match', rows: rowsOf(forOpening.queued) },
          { key: 'fits', title: 'Fits, not queued', rows: rowsOf(forOpening.fits) },
          { key: 'ne', title: 'Queued for Optimized Match, not eligible', rows: rowsOf(forOpening.notEligible) },
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
      {forPatient ? <ReduceBar shown={forPatient.all.length} total={allCols.length} noun="openings" who={ui.nameOf(selPid!)} all={showAllCols} onToggle={setShowAllCols} /> : null}
      {forOpening ? (
        <ReduceBar shown={forOpening.all.length} total={inReview.length} noun="patients" who={board.openingById[selOid!]?.short ?? ''} all={showAllRows} onToggle={setShowAllRows} />
      ) : null}
      {cols.length === 0 ? <Muted>No open slot fits {selPid ? ui.nameOf(selPid) : 'anyone'} right now.</Muted> : null}
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
                const on = selOid === ov.opening.id;
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
  const { patientId: selPid, openingId: selOid } = ui.selection;
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
        const rowOn = selPid === p.id;
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
              const colOn = selOid === ov.opening.id;
              const first = i === 0 || cols[i - 1].trial.id !== ov.trial.id;
              const label = `${ui.nameOf(p.id)} · ${ov.short}: ${CELL[cell.kind].label}${cell.inLine ? ` (${cell.inLine})` : ''}`;
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
  const items: CellKind[] = ['proposed', 'accepted', 'pre_screening', 'next_in_line', 'queued', 'queued_no_slot', 'placed_elsewhere', 'not_eligible', 'dismissed', 'fits', 'fits_no_slot'];
  return (
    <Box component="ul" aria-label="Legend" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, m: 0, p: 0, listStyle: 'none', fontSize: 12, color: 'text.secondary' }}>
      {items.map((k) => (
        <Box component="li" key={k} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 22, display: 'inline-flex', justifyContent: 'center', transform: 'scale(0.85)' }}>
            <Mark cell={{ kind: k, inLine: k === 'next_in_line' ? 1 : undefined }} />
          </Box>
          {CELL[k].label}
        </Box>
      ))}
      <Box component="li" sx={{ color: 'text.secondary' }}>
        Number: place in line if an offer falls through
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
      <Button key="acc" size="small" variant="contained" onClick={run(() => act.accept({ patientId: pid, openingId: oid }))}>
        Accept…
      </Button>,
      <Button key="dis" size="small" variant="outlined" color="inherit" onClick={run(() => act.dismiss({ patientId: pid, openingId: oid }))}>
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
  const fx = pv.fixedPairing;
  if (fx && fx.openingId === oid) {
    buttons.push(
      <Button key="revert" size="small" variant="outlined" color="inherit" onClick={run(() => act.revert(fx))}>
        Revert…
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
        <Button size="small" color="inherit" onClick={run(() => ui.selectPair(pid, oid))} sx={{ px: 0.5, minWidth: 0 }}>
          Focus on both
        </Button>
        <Button size="small" color="inherit" onClick={run(() => ui.focusPatient(pid))} sx={{ px: 0.5, minWidth: 0 }}>
          The patient
        </Button>
        <Button
          size="small"
          color="inherit"
          onClick={run(() => {
            // patches made in one tick merge, the last one wins: clear the patient after
            if (ui.selection.openingId !== oid) ui.selectOpening(oid);
            ui.clearPatient();
          })}
          sx={{ px: 0.5, minWidth: 0 }}
        >
          The slot
        </Button>
      </Row>
    </Popover>
  );
}
