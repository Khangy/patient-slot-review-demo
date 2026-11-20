import {
  Box,
  Button,
  ButtonBase,
  IconButton,
  Link,
  Paper,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GridOnIcon from '@mui/icons-material/GridOn';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import type { BoardNames, BoardView, UserId } from '@/domain/types';
import { placeCheck } from '@/domain/board';
import { TEAM, SITE_NAME } from '@/domain/seed';
import { fmtTime, fmtWeekday, TODAY } from '@/domain/dates';
import { boardMrn, boardName, member } from '@/domain/names';
import { useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { PersonAvatar, useTone, useTones, type ToneName } from '@/components/ui';
import { DesignNote } from '@/notes/DesignNote';
import { BoardUiContext, useBoardUi, type Assigned, type BoardUi, type DecisionsTab, type SlotsTab } from './boardUi';
import { pairApplies } from './reduce';
import { PatientsColumn } from './PatientsColumn';
import { SlotsColumn } from './SlotsColumn';
import { DecisionsColumn } from './DecisionsColumn';
import { ExportSummaryDialog } from './dialogs';
import { MatrixView } from './MatrixView';
import { BoardActionsProvider, useBoardActions } from './BoardActions';
import { DragProvider } from './dnd';

// Patient Slot Review (SR1-SR4): one board for the Thursday New Patient Meeting. Patients,
// slots (now and near future) and the optimizer's decisions, connected by one selection.

const TEAM_IDS = TEAM.map((m) => m.id) as string[];

export function SlotReviewPage() {
  const { state, board } = useStore();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const [params, setParams] = useSearchParams();
  const settings = state.settings;

  // react-router's functional setSearchParams reads the params from the last render, so two
  // calls in one click (e.g. setAssigned then setDecisionsTab) would overwrite each other.
  // Patches made in the same tick are merged and written once.
  const pending = useRef<Record<string, string | null> | null>(null);
  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      if (pending.current) {
        Object.assign(pending.current, patch);
        return;
      }
      pending.current = { ...patch };
      queueMicrotask(() => {
        const all = pending.current ?? {};
        pending.current = null;
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            for (const [k, v] of Object.entries(all)) {
              if (v === null) next.delete(k);
              else next.set(k, v);
            }
            return next;
          },
          { replace: true },
        );
      });
    },
    [setParams],
  );

  const pidParam = params.get('patient');
  const oidParam = params.get('opening');
  const selPid = pidParam && board.patientById[pidParam] ? pidParam : null;
  const selOid = oidParam && board.openingById[oidParam] ? oidParam : null;
  const slotsTab: SlotsTab = params.get('slots') === 'soon' ? 'soon' : 'now';
  const decisionsTab: DecisionsTab = params.get('decisions') === 'blocked' ? 'blocked' : 'tracking';
  const assignedParam = params.get('assigned');
  const assigned: Assigned = assignedParam && TEAM_IDS.includes(assignedParam) ? (assignedParam as UserId) : 'everyone';

  const ui = useMemo<BoardUi>(
    () => ({
      selection: { patientId: selPid, openingId: selOid },
      hasSelection: !!(selPid || selOid),
      // SR8: a patient and a slot can be selected together; the other one stays only while it applies.
      selectPatient: (id) =>
        setParam(selPid === id ? { patient: null } : { patient: id, opening: selOid && pairApplies(board, id, selOid) ? selOid : null }),
      focusPatient: (id) => setParam({ patient: id, opening: null }),
      selectOpening: (id) =>
        setParam(
          selOid === id ? { opening: null } : { opening: id, patient: selPid && pairApplies(board, selPid, id) ? selPid : null, slots: null },
        ),
      selectPair: (patientId, openingId) => setParam({ patient: patientId, opening: openingId, slots: null }),
      clearPatient: () => setParam({ patient: null }),
      clearOpening: () => setParam({ opening: null }),
      clearSelection: () => setParam({ patient: null, opening: null }),
      slotsTab,
      setSlotsTab: (t) => setParam({ slots: t === 'now' ? null : t }),
      decisionsTab,
      setDecisionsTab: (t) => setParam({ decisions: t === 'tracking' ? null : t }),
      assigned,
      setAssigned: (a) => setParam({ assigned: a === 'everyone' ? null : a }),
      nameOf: (id) => {
        const p = board.patientById[id]?.patient;
        return p ? boardName(p, settings.boardNames, settings.showPii) : id;
      },
      mrnOf: (id) => {
        const p = board.patientById[id]?.patient;
        return p ? boardMrn(p, settings.boardNames, settings.showPii) : '';
      },
      wide,
      view: settings.boardView ?? 'cards',
    }),
    [selPid, selOid, slotsTab, decisionsTab, assigned, board, settings.boardNames, settings.showPii, settings.boardView, wide, setParam],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (params.get('patient') || params.get('opening'))) setParam({ patient: null, opening: null });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [params, setParam]);

  return (
    <BoardUiContext.Provider value={ui}>
      <BoardActionsProvider>
        <Dragging>
          <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <BoardHeader />
            <Tiles />
            <SelectionBar />
            {ui.view === 'matrix' ? (
              <MatrixView />
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' },
                  gap: 2,
                  alignItems: 'start',
                }}
              >
                <PatientsColumn />
                <SlotsColumn />
                <DecisionsColumn />
              </Box>
            )}
          </Box>
        </Dragging>
      </BoardActionsProvider>
    </BoardUiContext.Provider>
  );
}

// ── Drag a patient onto a slot (SR5) ────────────────────────────────────

function Dragging({ children }: { children: ReactNode }) {
  const ui = useBoardUi();
  const act = useBoardActions();
  return (
    <DragProvider
      onStart={(pid) => {
        // the slot column narrows to this patient's slots while dragging (SR6)
        ui.focusPatient(pid);
        ui.setSlotsTab('now');
      }}
      onDrop={act.tryPlace}
      renderGhost={(pid, oid) => <DragGhost patientId={pid} overId={oid} />}
    >
      {children}
    </DragProvider>
  );
}

/** Follows the pointer and says what letting go will do. */
function DragGhost({ patientId, overId }: { patientId: string; overId: string | null }) {
  const { board } = useStore();
  const ui = useBoardUi();
  const tones = useTones();
  const check = overId ? placeCheck(board, patientId, overId) : null;
  const where = overId ? board.openingById[overId]?.short : '';
  const line = !check
    ? { text: 'Drop on a slot · Esc to cancel', color: 'text.secondary' }
    : check.ok
      ? { text: check.kind === 'accept' ? `Accept for ${where}` : `Place by hand in ${where}`, color: tones.green.fg }
      : { text: check.reason, color: tones.red.fg };
  return (
    <Paper elevation={8} sx={{ px: 1.5, py: 1, borderRadius: 1.5, maxWidth: 320, border: 1, borderColor: check ? (check.ok ? tones.green.solid : tones.red.solid) : 'divider' }}>
      <Box sx={{ fontWeight: 700, fontSize: 13.5 }}>{ui.nameOf(patientId)}</Box>
      <Box sx={{ fontSize: 12.5, fontWeight: 600, color: line.color }}>{line.text}</Box>
    </Paper>
  );
}

// ── Header (SR1, A6, A9, A10) ───────────────────────────────────────────

const VIEWS: { value: BoardView; label: string; hint: string; icon: ReactNode }[] = [
  { value: 'cards', label: 'Cards', hint: 'Cards: everything on each card', icon: <ViewAgendaOutlinedIcon fontSize="small" /> },
  { value: 'compact', label: 'Compact', hint: 'Compact: two lines per card, more on screen', icon: <ViewHeadlineIcon fontSize="small" /> },
  { value: 'list', label: 'List', hint: 'List: one row per patient and slot', icon: <ViewListIcon fontSize="small" /> },
  { value: 'matrix', label: 'Matrix', hint: 'Matrix: every patient against every open slot', icon: <GridOnIcon fontSize="small" /> },
];

function BoardHeader() {
  const { state, board, actions, me } = useStore();
  const ctx = useBoardUi();
  const toast = useToast();
  const teal = useTone('teal');
  const [assignMenu, setAssignMenu] = useState<HTMLElement | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const snapAt = state.snapshot.at;
  const since = board.sinceSnapshot;
  const parts = [
    since.accepted && `${since.accepted} accepted`,
    since.placed && `${since.placed} placed by hand`,
    since.dismissed && `${since.dismissed} dismissed`,
    since.newProposals && `${since.newProposals} new proposal${since.newProposals === 1 ? '' : 's'}`,
    since.droppedProposals && `${since.droppedProposals} proposal${since.droppedProposals === 1 ? '' : 's'} dropped`,
  ].filter(Boolean);

  const assignedLabel = ctx.assigned === 'everyone' ? 'Everyone' : ctx.assigned === me.id ? `Me (${me.short})` : member(ctx.assigned).short;

  const run = () => {
    const old = state.snapshot.at;
    const r = actions.runOptimizer();
    toast(
      r.added || r.removed
        ? `Meeting snapshot saved ${fmtTime(r.at)}: ${r.added} new proposal${r.added === 1 ? '' : 's'}, ${r.removed} dropped.`
        : `Meeting snapshot saved ${fmtTime(r.at)}. No changes since ${fmtTime(old)}.`,
    );
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 260 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', color: teal.fg }}>THURSDAY NEW PATIENT MEETING</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 24, md: 28 } }}>
            Patient Slot Review
          </Typography>
          <DesignNote id="SR1" />
          <DesignNote id="A10" />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {SITE_NAME} · {fmtWeekday(TODAY)}, 2026 · meeting snapshot {fmtTime(snapAt)} by {member(state.snapshot.by).short}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {parts.length ? `Since the ${fmtTime(snapAt)} snapshot: ${parts.join(' · ')}` : `No decisions yet since the ${fmtTime(snapAt)} snapshot`}
          </Typography>
          <DesignNote id="A6" />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          color="inherit"
          endIcon={<ArrowDropDownIcon />}
          onClick={(e) => setAssignMenu(e.currentTarget)}
          aria-haspopup="menu"
          sx={{ whiteSpace: 'nowrap' }}
        >
          Assigned to: {assignedLabel}
        </Button>
        <Menu anchorEl={assignMenu} open={!!assignMenu} onClose={() => setAssignMenu(null)}>
          <MenuItem
            selected={ctx.assigned === 'everyone'}
            onClick={() => {
              ctx.setAssigned('everyone');
              setAssignMenu(null);
            }}
          >
            <ListItemText primary="Everyone" />
            {ctx.assigned === 'everyone' ? <CheckIcon fontSize="small" sx={{ ml: 2 }} /> : null}
          </MenuItem>
          {[me, ...TEAM.filter((m) => m.id !== me.id)].map((m) => (
            <MenuItem
              key={m.id}
              selected={ctx.assigned === m.id}
              onClick={() => {
                ctx.setAssigned(m.id);
                ctx.setDecisionsTab('tracking');
                setAssignMenu(null);
              }}
            >
              <ListItemIcon>
                <PersonAvatar userId={m.id} size={24} />
              </ListItemIcon>
              <ListItemText primary={m.id === me.id ? `Me (${m.short})` : m.short} secondary={m.roleLabel} />
              {ctx.assigned === m.id ? <CheckIcon fontSize="small" sx={{ ml: 2 }} /> : null}
            </MenuItem>
          ))}
        </Menu>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography component="span" variant="body2" color="text.secondary" id="view-label">
            View
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={ctx.view}
            onChange={(_, v: BoardView | null) => v && actions.setSettings({ boardView: v })}
            aria-labelledby="view-label"
            sx={{ '& .MuiToggleButton-root': { py: 0.5, px: 1, textTransform: 'none', fontSize: 13, gap: 0.5 } }}
          >
            {VIEWS.map((v) => (
              <ToggleButton key={v.value} value={v.value} aria-label={v.label}>
                <Tooltip title={v.hint}>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    {v.icon}
                    <Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>
                      {v.label}
                    </Box>
                  </Box>
                </Tooltip>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <DesignNote id="SR7" />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography component="span" variant="body2" color="text.secondary" id="names-label">
            Names
          </Typography>
          <Tooltip
            title={
              <Box sx={{ fontSize: 12.5, lineHeight: 1.5 }}>
                <b>Full</b>: "Nair, Priya" and the MRN, as the board shows today.
                <br />
                <b>Meeting</b>: "Priya N." and the last 4 of the MRN, for a projected screen.
                <br />
                <b>Masked</b>: follows the Profile switch, like the Patients list.
              </Box>
            }
          >
            <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} aria-label="What the Names options do" />
          </Tooltip>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={state.settings.boardNames}
            onChange={(_, v: BoardNames | null) => v && actions.setSettings({ boardNames: v })}
            aria-labelledby="names-label"
            sx={{ '& .MuiToggleButton-root': { py: 0.5, px: 1.25, textTransform: 'none', fontSize: 13 } }}
          >
            <ToggleButton value="full">Full</ToggleButton>
            <ToggleButton value="meeting">Meeting</ToggleButton>
            <ToggleButton value="masked">Masked</ToggleButton>
          </ToggleButtonGroup>
          <DesignNote id="A9" />
        </Box>

        <Button variant="outlined" color="inherit" onClick={() => setExportOpen(true)}>
          Export summary
        </Button>
        <Tooltip title="Saves a new meeting snapshot. In this demo the board already re-plans as you decide.">
          <Button variant="contained" onClick={run}>
            Run optimizer
          </Button>
        </Tooltip>
      </Box>
      <ExportSummaryDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </Box>
  );
}

// ── Tiles ───────────────────────────────────────────────────────────────

function Tile({
  label,
  value,
  sub,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  sub?: ReactNode;
  tone?: ToneName;
  active?: boolean;
  onClick: () => void;
}) {
  const t = useTone(tone ?? 'grey');
  const teal = useTone('teal');
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={active}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: active ? teal.solid : 'divider',
        boxShadow: active ? `0 0 0 1px ${teal.solid}` : 'none',
        bgcolor: 'background.paper',
        minWidth: 0,
        '&:hover': { borderColor: active ? teal.solid : 'text.secondary' },
        '&.Mui-focusVisible': { outline: `2px solid ${teal.solid}`, outlineOffset: 2 },
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: tone ? t.fg : 'text.primary' }}>{value}</Typography>
      {sub ? (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      ) : null}
    </ButtonBase>
  );
}

function Tiles() {
  const { board } = useStore();
  const ui = useBoardUi();
  const t = board.tiles;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
      <Tile
        label="Patients in review"
        value={t.inReview}
        sub="queued, or added to the meeting"
        onClick={() => {
          ui.clearSelection();
          ui.setAssigned('everyone');
          ui.setSlotsTab('now');
          ui.setDecisionsTab('tracking');
        }}
      />
      <Tile label="Slots open now" value={t.openNow} sub="every open slot, proposed or not" active={ui.slotsTab === 'now'} onClick={() => ui.setSlotsTab('now')} />
      <Tile
        label="Slots opening soon"
        value={t.openingSoon}
        sub={`next 4 weeks${t.openingSoonNoDate ? ` · + ${t.openingSoonNoDate} on hold, no date` : ''}`}
        tone="amber"
        active={ui.slotsTab === 'soon'}
        onClick={() => ui.setSlotsTab('soon')}
      />
      <Tile label="Patients blocked" value={t.blocked} sub="each with the reason" tone="red" active={ui.decisionsTab === 'blocked'} onClick={() => ui.setDecisionsTab('blocked')} />
    </Box>
  );
}

// ── Selection bar (SR2) ─────────────────────────────────────────────────

function SelectionBar() {
  const { board } = useStore();
  const ui = useBoardUi();
  const teal = useTone('teal');
  const { patientId, openingId } = ui.selection;
  const parts: ReactNode[] = [];
  if (patientId) {
    const v = board.patientById[patientId];
    parts.push(
      <SelectionPart key="p" label={ui.nameOf(patientId)} onClear={ui.clearPatient} clearLabel={`Unselect ${ui.nameOf(patientId)}`}>
        {v.possibleNow.length} possible slot{v.possibleNow.length === 1 ? '' : 's'} now · {v.possibleSoon.length} soon ·{' '}
        <Link component={RouterLink} to={`/patients/${patientId}?tab=options`}>
          Open chart
        </Link>
      </SelectionPart>,
    );
  }
  if (openingId) {
    const ov = board.openingById[openingId];
    const queued = ov.candidates.filter((c) => c.status !== 'not_eligible').length;
    parts.push(
      <SelectionPart key="o" label={patientId ? ov.short : ov.full} onClear={ui.clearOpening} clearLabel={`Unselect ${ov.short}`}>
        {ov.openNow} open · {queued} queued for Optimized Match · {ov.fitNotQueued.length} fit, not queued
      </SelectionPart>,
    );
  }
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        px: 1.5,
        py: 0.75,
        minHeight: 40,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: ui.hasSelection ? teal.border : 'divider',
        bgcolor: ui.hasSelection ? teal.bg : 'transparent',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {parts.length ? (
          parts
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select a patient to see their possible slots and decision, then one of their slots to open it without losing the patient. Or start from a slot to see who
            it is proposed to and who is next in line.
          </Typography>
        )}
        {patientId && !openingId ? (
          <Typography variant="body2" color="text.secondary">
            Pick one of their slots to open it here.
          </Typography>
        ) : null}
      </Box>
      <DesignNote id="SR2" />
      <DesignNote id="SR8" />
      {ui.hasSelection ? (
        <Button size="small" onClick={ui.clearSelection}>
          Clear (Esc)
        </Button>
      ) : null}
    </Box>
  );
}

/** One selected thing in the selection bar, with its own way to unselect it. */
function SelectionPart({ label, onClear, clearLabel, children }: { label: string; onClear: () => void; clearLabel: string; children: ReactNode }) {
  const teal = useTone('teal');
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        minWidth: 0,
        pl: 1,
        pr: 0.25,
        py: 0.25,
        borderRadius: 1,
        border: '1px solid',
        borderColor: teal.border,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="body2" component="span" sx={{ minWidth: 0 }}>
        <b>{label}</b> · {children}
      </Typography>
      <IconButton size="small" aria-label={clearLabel} onClick={onClear} sx={{ p: 0.25 }}>
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}
