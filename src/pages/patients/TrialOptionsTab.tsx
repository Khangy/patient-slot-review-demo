import { Box, Button, ButtonBase, Collapse, Divider, IconButton, Link, Paper, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useMemo, useState, type ReactNode } from 'react';
import type { PatientView } from '@/domain/board';
import type { Watch } from '@/domain/types';
import { isFit, type CheckOutcome } from '@/domain/matching';
import { daysBetween, fmtShort, fmtWeekday, relDays, TODAY } from '@/domain/dates';
import { labelFor, openingOwnName, openingShort, ordinal } from '@/domain/names';
import { MAX_QUEUE, useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { LogLine, Mono, Overline, PersonTag, ToneChip, useTone, useTones } from '@/components/ui';
import { MATCH } from '@/components/statusMeta';
import { DesignNote } from '@/notes/DesignNote';
import { KeepDialog, WatchDialog, type WatchDraft } from './dialogs';
import { buildOptionRows, placementCost, reviewStatusFor, trialOpenNow, type OptionRow } from './trialOptions';

// ── Small layout pieces ─────────────────────────────────────────────────

function ListSection({ title, note, children, empty }: { title: ReactNode; note?: string; children: ReactNode; empty?: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
        <Typography component="h3" sx={{ fontWeight: 700, fontSize: 13.5 }}>
          {title}
        </Typography>
        {note ? <DesignNote id={note} /> : null}
      </Stack>
      {hasChildren ? (
        <Stack divider={<Divider flexItem />}>{children}</Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
          {empty}
        </Typography>
      )}
    </Paper>
  );
}

/** A selectable row: the main area is one button, actions sit beside it (never nested). */
function OptionLine({ selected, onSelect, lead, main, actions }: { selected: boolean; onSelect: () => void; lead?: ReactNode; main: ReactNode; actions?: ReactNode }) {
  const teal = useTone('teal');
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        pl: 0,
        pr: 1,
        gap: 0.5,
        bgcolor: selected ? teal.bg : 'transparent',
        boxShadow: selected ? `inset 3px 0 0 ${teal.solid}` : 'none',
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
      }}
    >
      <ButtonBase
        onClick={onSelect}
        aria-pressed={selected}
        sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', px: 2, py: 1.25, gap: 1.25, alignItems: 'flex-start' }}
      >
        {lead}
        <Box sx={{ minWidth: 0, flex: 1 }}>{main}</Box>
      </ButtonBase>
      {actions ? <Stack direction="row" alignItems="center" spacing={0.5} sx={{ pl: { xs: 2, sm: 0 }, pb: { xs: 1, sm: 0 } }}>{actions}</Stack> : null}
    </Stack>
  );
}

const OUTCOME_ICON: Record<CheckOutcome, { icon: ReactNode; label: string }> = {
  met: { icon: <CheckCircleOutlineIcon fontSize="small" />, label: 'Met' },
  not_met: { icon: <CancelOutlinedIcon fontSize="small" />, label: 'Not met' },
  unknown: { icon: <HelpOutlineIcon fontSize="small" />, label: 'Not in the record' },
};

// ── The tab ─────────────────────────────────────────────────────────────

export function TrialOptionsTab({ view }: { view: PatientView }) {
  const { state, board, actions } = useStore();
  const toast = useToast();
  const tones = useTones();
  const p = view.patient;
  const trials = state.trials;
  const groups = useMemo(() => buildOptionRows(view, board), [view, board]);

  /** A row for any opening id, including queued openings of a randomized trial. */
  const rowFor = (openingId: string): OptionRow | undefined => {
    const found = groups.all.find((r) => r.openingId === openingId);
    if (found) return found;
    const ov = board.openingById[openingId];
    if (!ov) return undefined;
    return { openingId, trial: ov.trial, opening: ov.opening, match: view.matchById[openingId], ov, label: openingShort(ov.trial, ov.opening), ownName: openingOwnName(ov.opening) };
  };

  const firstRow = p.queue[0]?.openingId ?? groups.matches[0]?.openingId ?? groups.statusChange[0]?.openingId ?? groups.soon[0]?.openingId ?? groups.all[0]?.openingId;
  const [selected, setSelected] = useState<string | undefined>(firstRow);
  const [showNotFit, setShowNotFit] = useState(false);
  const [keeping, setKeeping] = useState<Watch | null>(null);
  const [watchDraft, setWatchDraft] = useState<WatchDraft | null>(null);
  const selRow = selected ? rowFor(selected) : undefined;
  const stale = !!p.matchBasis;
  const queuedIds = p.queue.map((e) => e.openingId);

  const move = (index: number, dir: -1 | 1) => {
    const ids = [...queuedIds];
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    actions.reorderQueue(p.id, ids);
  };

  const doQueue = (openingId: string) => {
    const r = actions.queue(p.id, openingId);
    toast(r.message);
  };

  /** Where a watch could be queued now: its opening, or any opening of the trial that fits with an open slot. */
  const queueTargetForWatch = (w: Watch): string | undefined => {
    const candidates = w.openingId ? [w.openingId] : board.openings.filter((o) => o.trial.id === w.trialId).map((o) => o.opening.id);
    return candidates.find((oid) => {
      const ov = board.openingById[oid];
      return ov && ov.opening.state === 'open' && ov.openNow > 0 && isFit(view.matchById[oid]) && !queuedIds.includes(oid);
    });
  };

  const pre = view.fixedPairing?.status === 'pre_screening' ? view.fixedPairing : undefined;
  const preStep = view.openStep?.step;

  return (
    <Stack spacing={2}>
      {stale ? (
        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: tones.amber.bg, border: `1px solid ${tones.amber.border}`, display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <WarningAmberIcon sx={{ color: tones.amber.fg, mt: 0.25 }} />
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography sx={{ fontWeight: 600, color: tones.amber.fg }}>
              {p.recordChange ?? 'Record changed'} {fmtShort(p.recordChangedOn ?? TODAY)}, after these matches were checked {fmtShort(p.matchesCheckedOn)}.
              <DesignNote id="13" />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Re-check to see trials the new stage opens or closes. Rows below still reflect the {fmtShort(p.matchesCheckedOn)} check.
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => {
              actions.recheckMatches(p.id);
              toast('Matches re-checked against the current record.');
            }}
          >
            Re-check now
          </Button>
        </Box>
      ) : null}

      {pre ? (
        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: tones.purple.bg, border: `1px solid ${tones.purple.border}`, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography sx={{ fontWeight: 600, color: tones.purple.fg }}>Pre-screening for {labelFor(trials, pre.openingId, true)}</Typography>
            {preStep ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">
                  Next:
                </Typography>
                {preStep.assignee ? <PersonTag userId={preStep.assignee} suffix={`· ${preStep.label}`} /> : <Typography variant="body2">{preStep.label}</Typography>}
                {preStep.due ? (
                  <Typography variant="body2" color="text.secondary">
                    due {fmtWeekday(preStep.due)}
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
          </Box>
          <Button variant="outlined" onClick={() => toast('The Enrollment tab is not part of this demo.')}>
            Open Enrollment
          </Button>
        </Box>
      ) : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 42fr) minmax(0, 58fr)' }, gap: 2, alignItems: 'start' }}>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          {/* Queued for Optimized Match */}
          <ListSection
            title={
              <>
                Queued for Optimized Match ({p.queue.length}/{MAX_QUEUE})
              </>
            }
            note="04"
            empty="Nothing queued yet."
          >
            {p.queue.map((e, i) => {
              const row = rowFor(e.openingId);
              const rs = reviewStatusFor(view, e.openingId, board, state.pairings);
              return (
                <OptionLine
                  key={e.openingId}
                  selected={selected === e.openingId}
                  onSelect={() => setSelected(e.openingId)}
                  lead={
                    <Typography sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 30, fontSize: 13 }} aria-label={`${ordinal(i + 1)} choice`}>
                      {ordinal(i + 1)}
                    </Typography>
                  }
                  main={
                    <>
                      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{row?.label ?? labelFor(trials, e.openingId)}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
                        {rs ? <ToneChip tone={rs.tone} label={rs.text} size="tiny" /> : null}
                        <Typography variant="caption" color="text.secondary">
                          since {fmtShort(e.queuedOn)}
                        </Typography>
                      </Stack>
                    </>
                  }
                  actions={
                    <>
                      <IconButton size="small" aria-label={`Move ${row?.label ?? 'this'} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                        <KeyboardArrowUpIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label={`Move ${row?.label ?? 'this'} down`} disabled={i === p.queue.length - 1} onClick={() => move(i, 1)}>
                        <KeyboardArrowDownIcon fontSize="small" />
                      </IconButton>
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => {
                          actions.unqueue(p.id, e.openingId);
                          toast(`Removed ${row?.label ?? 'it'} from the queue.`);
                        }}
                        sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}
                      >
                        Remove from queue
                      </Button>
                    </>
                  }
                />
              );
            })}
          </ListSection>

          {/* Watching */}
          {p.watches.length ? (
            <ListSection title={`Watching (${p.watches.length})`} note="10">
              {p.watches.map((w) => {
                const trial = trials.find((t) => t.id === w.trialId);
                const where = w.openingId ? labelFor(trials, w.openingId) : `${trial?.short ?? 'Trial'} · any opening`;
                const target = queueTargetForWatch(w);
                const selectId = w.openingId ?? board.openings.find((o) => o.trial.id === w.trialId)?.opening.id;
                const what = w.reason === 'slot' ? 'waiting for a slot' : w.reason === 'status_change' ? `waiting for ${w.waitFor ?? 'a status change'}` : 'other';
                const queueBlocked = stale ? 'Re-check the matches first' : !target ? 'No open slot that fits yet' : p.queue.length >= MAX_QUEUE ? 'The queue is full' : undefined;
                return (
                  <Box key={w.id}>
                    <OptionLine
                      selected={!!selectId && selected === selectId}
                      onSelect={() => selectId && setSelected(selectId)}
                      lead={<VisibilityOutlinedIcon fontSize="small" sx={{ color: tones.amber.fg, mt: 0.25 }} />}
                      main={
                        <>
                          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{where}</Typography>
                          <Box sx={{ mt: 0.25 }}>
                            {w.statusChanged ? (
                              <LogLine verb="Status changed" status={`${w.statusChanged.from} → ${w.statusChanged.to}`} date={fmtShort(w.statusChanged.on)} tone="amber" />
                            ) : w.nextReview <= TODAY ? (
                              <LogLine verb="Review due" status={w.nextReview === TODAY ? 'today' : 'overdue'} date={fmtShort(w.nextReview)} tone="amber" />
                            ) : (
                              <LogLine verb="Next review" status={relDays(w.nextReview)} date={fmtShort(w.nextReview)} tone="blue" />
                            )}
                          </Box>
                          <Typography variant="caption" component="div" color="text.secondary">
                            {what} · watched since {fmtShort(w.since)} ({daysBetween(w.since, TODAY)} days) · every {w.reviewEveryDays} days
                          </Typography>
                          {w.note ? (
                            <Typography variant="caption" component="div" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                              "{w.note}"
                            </Typography>
                          ) : null}
                        </>
                      }
                    />
                    <Stack direction="row" spacing={1} sx={{ px: 2, pb: 1.25, flexWrap: 'wrap', rowGap: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => setKeeping(w)}>
                        Keep…
                      </Button>
                      <Tooltip title={queueBlocked ?? `Queue for ${target ? labelFor(trials, target) : ''}`}>
                        <span>
                          <Button size="small" variant="outlined" disabled={!!queueBlocked} onClick={() => target && doQueue(target)}>
                            {stale && w.statusChanged ? 'Queue after re-check' : 'Queue'}
                          </Button>
                        </span>
                      </Tooltip>
                      <Button
                        size="small"
                        color="inherit"
                        sx={{ color: 'text.secondary' }}
                        onClick={() => {
                          actions.stopWatch(p.id, w.id);
                          toast(`Stopped watching ${where}.`);
                        }}
                      >
                        Stop watching
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </ListSection>
          ) : null}

          {/* Matches */}
          <ListSection title={`Matches (${groups.matches.length})`} note="08" empty={stale ? 'No matches on the last check. Re-check to update.' : 'No trial with an open opening fits this record yet.'}>
            {groups.matches.map((r) => {
              const queued = queuedIds.includes(r.openingId) || (r.randomized && r.trial.openings.some((o) => queuedIds.includes(o.id)));
              const cost = queued ? undefined : placementCost(r.ov, p.id);
              return (
                <OptionLine
                  key={r.openingId}
                  selected={selected === r.openingId}
                  onSelect={() => setSelected(r.openingId)}
                  main={
                    <>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{r.label}</Typography>
                        {queued ? <ToneChip tone="teal" label="Queued" size="tiny" /> : null}
                        {r.match.result === 'pending_review' ? <ToneChip tone="amber" label="Fit pending review" size="tiny" /> : null}
                      </Stack>
                      <Typography variant="caption" component="div" color="text.secondary">
                        {r.trial.phase}
                        {r.randomized ? ` · randomized ${r.randomized}` : ''} · {r.ov.openNow} open in {r.ownName}
                      </Typography>
                      {cost ? (
                        <Typography variant="caption" component="div" sx={{ color: tones.amber.fg, fontWeight: 600 }}>
                          {cost}
                        </Typography>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </ListSection>

          {groups.soon.length ? (
            <ListSection title={`Opening soon (${groups.soon.length})`} note="SR4">
              {groups.soon.map((r) => (
                <OptionLine
                  key={r.openingId}
                  selected={selected === r.openingId}
                  onSelect={() => setSelected(r.openingId)}
                  main={
                    <>
                      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{r.label}</Typography>
                      <Typography variant="caption" component="div" color="text.secondary">
                        {r.opening.opensOn ? `Opens ${fmtShort(r.opening.opensOn)}` : 'On hold, no date set'} · {r.opening.slotsTotal} slots when it opens
                      </Typography>
                    </>
                  }
                />
              ))}
            </ListSection>
          ) : null}

          {groups.statusChange.length ? (
            <ListSection title={`Needs a status change (${groups.statusChange.length})`}>
              {groups.statusChange.map((r) => {
                const stageCheck = r.match.checks.find((c) => c.isStage);
                const watching = p.watches.some((w) => w.trialId === r.trial.id && (!w.openingId || w.openingId === r.openingId));
                return (
                  <OptionLine
                    key={r.openingId}
                    selected={selected === r.openingId}
                    onSelect={() => setSelected(r.openingId)}
                    main={
                      <>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{r.label}</Typography>
                        <Typography variant="caption" component="div" color="text.secondary">
                          needs {r.match.needs} · now {stageCheck?.patientHas ?? 'not staged'}
                          {stale ? ` · checked ${fmtShort(p.matchesCheckedOn)}, before the ${fmtShort(p.recordChangedOn ?? TODAY)} change` : ''}
                        </Typography>
                      </>
                    }
                    actions={
                      watching ? (
                        <ToneChip tone="amber" label="Watching" size="tiny" />
                      ) : (
                        <Button size="small" variant="outlined" onClick={() => setWatchDraft({ trialId: r.trial.id, reason: 'status_change', waitFor: r.match.needs })}>
                          Watch
                        </Button>
                      )
                    }
                  />
                );
              })}
            </ListSection>
          ) : null}

          {groups.notFit.length ? (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <ButtonBase
                onClick={() => setShowNotFit((v) => !v)}
                aria-expanded={showNotFit}
                sx={{ width: '100%', justifyContent: 'flex-start', px: 2, py: 1, gap: 1, bgcolor: 'action.hover' }}
              >
                <ExpandMoreIcon fontSize="small" sx={{ transform: showNotFit ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>Not a fit ({groups.notFit.length})</Typography>
              </ButtonBase>
              <Collapse in={showNotFit}>
                <Stack divider={<Divider flexItem />}>
                  {groups.notFit.map((r) => {
                    const why = r.match.checks.find((c) => c.outcome === 'not_met');
                    return (
                      <OptionLine
                        key={r.openingId}
                        selected={selected === r.openingId}
                        onSelect={() => setSelected(r.openingId)}
                        main={
                          <>
                            <Typography sx={{ fontWeight: 500, fontSize: 13.5 }}>{r.label}</Typography>
                            {why ? (
                              <Typography variant="caption" component="div" color="text.secondary">
                                {why.label}: {why.patientHas} (trial: {why.trialWants})
                              </Typography>
                            ) : null}
                          </>
                        }
                      />
                    );
                  })}
                </Stack>
              </Collapse>
            </Paper>
          ) : null}
        </Stack>

        <Box sx={{ position: { md: 'sticky' }, top: { md: 76 }, minWidth: 0 }}>
          {selRow ? (
            <DetailPane row={selRow} view={view} onWatch={setWatchDraft} onQueue={doQueue} />
          ) : (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography color="text.secondary">Select a trial to see why it fits.</Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {keeping ? <KeepDialog patient={p} watch={keeping} onClose={() => setKeeping(null)} /> : null}
      {watchDraft ? <WatchDialog patient={p} draft={watchDraft} onClose={() => setWatchDraft(null)} /> : null}
    </Stack>
  );
}

// ── Detail pane ─────────────────────────────────────────────────────────

function DetailPane({ row, view, onWatch, onQueue }: { row: OptionRow; view: PatientView; onWatch: (d: WatchDraft) => void; onQueue: (openingId: string) => void }) {
  const { state, board } = useStore();
  const toast = useToast();
  const tones = useTones();
  const p = view.patient;
  const { trial, opening, match, ov } = row;
  const queuedIdx = p.queue.findIndex((e) => e.openingId === opening.id);
  const queued = queuedIdx >= 0;
  const rs = queued ? reviewStatusFor(view, opening.id, board, state.pairings) : undefined;
  const cost = !queued ? placementCost(ov, p.id) : undefined;
  const inTrial = trialOpenNow(board, trial.id);
  const queuedCount = ov.candidates.filter((c) => c.status !== 'not_eligible').length;
  const stale = !!p.matchBasis;
  const resultMeta = MATCH[match.result];

  let blocker: string | undefined;
  if (queued) blocker = `Queued (${ordinal(queuedIdx + 1)} choice)`;
  else if (p.status === 'not_seeking') blocker = 'Not seeking: change the status to queue';
  else if (match.result === 'needs_status_change') blocker = `Needs ${match.needs} first: watch it instead`;
  else if (!isFit(match)) blocker = 'Not a fit on the last check';
  else if (opening.state === 'on_hold') blocker = 'Opening on hold: watch it instead';
  else if (p.queue.length >= MAX_QUEUE) blocker = `The queue is full (${MAX_QUEUE} of ${MAX_QUEUE}). Remove one first.`;
  const helper =
    blocker ??
    (p.status !== 'seeking'
      ? 'Queueing also marks the patient Seeking.'
      : ov.openNow === 0
        ? 'No open slot now; queueing keeps the patient in line for one.'
        : "Thursday's review picks it up.");

  const outcomeColor = (o: CheckOutcome) => (o === 'met' ? tones.green.fg : o === 'not_met' ? tones.red.fg : tones.amber.fg);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack spacing={2}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography component="h3" sx={{ fontWeight: 700, fontSize: 20 }}>
              {trial.short}
            </Typography>
            <ToneChip tone="grey" label={trial.phase} size="tiny" />
            <DesignNote id="A2" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {trial.design}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            {trial.sponsor} · <Mono>{trial.nct}</Mono>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {trial.summary}
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr' }, gap: 2 }}>
          <Box>
            <Overline>Opening</Overline>
            <Typography sx={{ fontWeight: 600 }}>{row.randomized ? `Whole trial · randomized ${row.randomized}` : openingOwnName(opening)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {opening.population}
              {row.randomized ? '. The arm is assigned at randomization.' : ''}
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
            <Stack direction="row" alignItems="center">
              <Overline>Slots</Overline>
              <DesignNote id="08" />
            </Stack>
            {opening.state === 'on_hold' ? (
              <>
                <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{opening.opensOn ? `Opens ${fmtShort(opening.opensOn)}` : 'On hold, no date set'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {opening.slotsTotal} slots when it opens · {inTrial} open in the trial now
                </Typography>
              </>
            ) : (
              <>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography sx={{ fontWeight: 700, fontSize: 32, lineHeight: 1.1 }}>{ov.openNow}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    open in {row.ownName}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {inTrial} open in the trial
                </Typography>
              </>
            )}
            <Typography variant="caption" color="text.secondary">
              {queuedCount} queued · {ov.watching.length} watching
            </Typography>
          </Box>
        </Box>

        {rs ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Thursday's review:
            </Typography>
            <ToneChip tone={rs.tone} label={rs.text} size="tiny" />
          </Stack>
        ) : null}

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography component="h4" sx={{ fontWeight: 700, fontSize: 15 }}>
              Why this match
            </Typography>
            <ToneChip tone={resultMeta.tone} label={resultMeta.label} size="tiny" />
            <DesignNote id="03" />
          </Stack>
          {stale ? (
            <Typography variant="caption" component="div" sx={{ color: tones.amber.fg, mb: 1 }}>
              Checked {fmtShort(p.matchesCheckedOn)} against the record before the {fmtShort(p.recordChangedOn ?? TODAY)} change.
            </Typography>
          ) : null}
          <Stack divider={<Divider flexItem />} sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
            {match.checks.map((c) => (
              <Stack key={`${c.label}-${c.trialWants}`} direction="row" spacing={1.25} sx={{ px: 1.5, py: 1 }} alignItems="flex-start">
                <Box sx={{ color: outcomeColor(c.outcome), display: 'flex', pt: 0.25 }} aria-label={OUTCOME_ICON[c.outcome].label} role="img">
                  {OUTCOME_ICON[c.outcome].icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '120px 1fr 1fr' }, gap: { xs: 0.25, sm: 1.5 } }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {c.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Trial: {c.trialWants}
                  </Typography>
                  <Typography variant="body2">Record: {c.patientHas}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
          {!opening.criteriaEntered ? (
            <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 1.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Full eligibility criteria are not entered for this trial yet.
              </Typography>
              <Link component="button" variant="body2" onClick={() => toast('Trial pages are not part of this demo.')}>
                View trial
              </Link>
              <DesignNote id="14" />
            </Box>
          ) : null}
        </Box>

        {isFit(match) && opening.state === 'open' && !queued ? (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            {cost ? (
              <WarningAmberIcon fontSize="small" sx={{ color: tones.amber.fg, mt: 0.25 }} />
            ) : (
              <CheckCircleOutlineIcon fontSize="small" sx={{ color: tones.green.fg, mt: 0.25 }} />
            )}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {cost ?? 'No one else needs this slot'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {cost
                  ? cost.startsWith('1 ')
                    ? 'Placing this patient here could leave that patient without a slot that fits them.'
                    : `They are in line for the same ${ov.openNow} open slot${ov.openNow === 1 ? '' : 's'}; the optimizer places by rank.`
                  : 'Every other waiting patient can still be placed.'}
              </Typography>
            </Box>
          </Stack>
        ) : null}

        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Button variant="contained" startIcon={<AddIcon />} disabled={!!blocker} onClick={() => onQueue(opening.id)}>
              Queue for Optimized Match
            </Button>
            <Button
              variant="outlined"
              onClick={() =>
                onWatch({
                  trialId: trial.id,
                  openingId: row.randomized ? undefined : opening.id,
                  reason: match.result === 'needs_status_change' ? 'status_change' : 'slot',
                  waitFor: match.needs,
                })
              }
            >
              Watch this trial…
            </Button>
            <DesignNote id="04" />
          </Stack>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
            {helper}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
