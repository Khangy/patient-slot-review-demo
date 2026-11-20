import { Box, Button, Collapse, Link, TextField } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Step } from '@/domain/types';
import { alternativesFor, dismissReasonLabel, placeReasonLabel, type Blocked, type Decision } from '@/domain/board';
import { fmtWeekday, fmtWhen } from '@/domain/dates';
import { findOpening, labelFor, member } from '@/domain/names';
import { useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { PersonTag, ToneChip, useTones, type ToneName } from '@/components/ui';
import { BLOCKED, DECISION } from '@/components/statusMeta';
import { DesignNote } from '@/notes/DesignNote';
import { currentStep, dueInfo, dueThisWeek, openStepsFor, useBoardUi } from './boardUi';
import { CardBox, clampSx, Column, GroupLabel, ListFrame, Muted, ReduceBar, Row, Segmented } from './parts';
import { StepDot } from './dialogs';
import { useBoardActions } from './BoardActions';
import { useShowAll } from './reduce';
import { isDragging } from './dnd';

export function DecisionsColumn() {
  const { state, board, me } = useStore();
  const ui = useBoardUi();
  const ref = useRef<HTMLElement>(null);
  const list = ui.view === 'list';
  const dense = ui.view !== 'cards';

  // The patient narrows this column when one is selected, else the slot (SR6, SR8).
  const { patientId: selPid, openingId: selOid } = ui.selection;
  const [showAll, setShowAll] = useShowAll(selPid ?? selOid);
  const sel = ui.hasSelection;
  const narrow = sel && !showAll;
  useEffect(() => {
    if (!ui.wide || !sel || isDragging()) return;
    const target = selPid ? ref.current?.querySelector(`[data-dpid="${selPid}"]`) : ref.current?.querySelector(`[data-doid="${selOid}"]`);
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [sel, selPid, selOid, ui.wide, ui.decisionsTab]);

  const applies = (patientId: string, openingIds: string[]) => (selPid ? selPid === patientId : selOid ? openingIds.includes(selOid) : true);
  const selName = selPid ? ui.nameOf(selPid) : selOid ? (board.openingById[selOid]?.short ?? '') : '';

  // Tracking, filtered by "Assigned to" (SR3)
  const filtered = useMemo(() => {
    if (ui.assigned === 'everyone') return board.decisions;
    const who = ui.assigned;
    return board.decisions.filter((d) => d.pairing && d.kind !== 'dismissed' && openStepsFor(d.pairing, who).length > 0);
  }, [board.decisions, ui.assigned]);

  const visible = narrow ? filtered.filter((d) => applies(d.patientId, [d.openingId])) : filtered;
  const blockedVisible = narrow ? board.blocked.filter((b) => applies(b.patientId, b.openingIds)) : board.blocked;

  const byKind = (k: Decision['kind']) =>
    visible
      .filter((d) => d.kind === k)
      .sort((a, b) => labelFor(state.trials, a.openingId).localeCompare(labelFor(state.trials, b.openingId)) || ui.nameOf(a.patientId).localeCompare(ui.nameOf(b.patientId)));

  const groups: { title: string; items: Decision[] }[] = [
    { title: 'To decide', items: byKind('proposed') },
    { title: 'Accepted', items: byKind('accepted') },
    { title: 'Pre-screening', items: byKind('pre_screening') },
    { title: 'Dismissed', items: byKind('dismissed') },
  ];

  const assignedSummary = (() => {
    if (ui.assigned === 'everyone') return null;
    const who = ui.assigned;
    const steps = state.pairings.filter((p) => p.status !== 'dismissed').flatMap((p) => openStepsFor(p, who));
    const week = steps.filter(dueThisWeek).length;
    const short = who === me.id ? `you (${member(who).short})` : member(who).short;
    return steps.length ? `${steps.length} step${steps.length === 1 ? '' : 's'} for ${short} · ${week} due this week` : `No open steps for ${short}.`;
  })();

  return (
    <Column
      ref={ref}
      label="Optimizer decisions"
      title={
        <>
          Optimizer decisions
          <DesignNote id="SR3" />
          <DesignNote id="A4" />
        </>
      }
      sub="Proposed pairings and who is waiting"
      tabs={
        <Segmented
          label="Decisions: tracking or blocked"
          value={ui.decisionsTab}
          onChange={ui.setDecisionsTab}
          options={[
            { value: 'tracking', label: `Tracking · ${filtered.filter((d) => d.kind !== 'dismissed').length}` },
            { value: 'blocked', label: `Blocked · ${board.blocked.length}` },
          ]}
        />
      }
    >
      {ui.decisionsTab === 'tracking' ? (
        <>
          {sel ? (
            <ReduceBar
              shown={filtered.filter((d) => applies(d.patientId, [d.openingId])).length}
              total={filtered.length}
              noun="decisions"
              who={selName}
              all={showAll}
              onToggle={setShowAll}
            />
          ) : null}
          {assignedSummary ? (
            <Box sx={{ px: 0.25, fontSize: 13, fontWeight: 600 }}>
              {assignedSummary}{' '}
              <Link component="button" type="button" variant="body2" onClick={() => ui.setAssigned('everyone')}>
                Show everyone
              </Link>
            </Box>
          ) : null}
          {groups.map((g) =>
            g.items.length ? (
              <Box key={g.title} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <GroupLabel>
                  {g.title} · {g.items.length}
                </GroupLabel>
                <ListFrame list={list}>
                  {g.items.map((d) => (
                    <DecisionCard key={d.key} d={d} narrowed={narrow} dense={dense} list={list} />
                  ))}
                </ListFrame>
              </Box>
            ) : null,
          )}
          {filtered.length === 0 ? <Muted>Nothing to track for this filter.</Muted> : null}
          {filtered.length > 0 && visible.length === 0 ? (
            <Muted>
              No decisions for {selName} yet.
              {selPid && board.patientById[selPid]?.blocked ? (
                <>
                  {' '}
                  {board.patientById[selPid]?.blocked?.label}:{' '}
                  <Link component="button" type="button" variant="body2" onClick={() => ui.setDecisionsTab('blocked')} sx={{ verticalAlign: 'baseline' }}>
                    see Blocked
                  </Link>
                </>
              ) : null}
            </Muted>
          ) : null}
        </>
      ) : (
        <>
          <Row sx={{ px: 0.25 }}>
            <Muted>Every queued patient the plan could not place, with the reason and a next step.</Muted>
            <DesignNote id="A7" />
            <DesignNote id="SR4" />
          </Row>
          {sel ? (
            <ReduceBar
              shown={board.blocked.filter((b) => applies(b.patientId, b.openingIds)).length}
              total={board.blocked.length}
              noun="blocked"
              who={selName}
              all={showAll}
              onToggle={setShowAll}
            />
          ) : null}
          {board.blocked.length === 0 ? <Muted>Nobody is blocked.</Muted> : null}
          {board.blocked.length > 0 && blockedVisible.length === 0 ? <Muted>No one blocked for {selName}.</Muted> : null}
          <ListFrame list={list}>
            {blockedVisible.map((b) => (
              <BlockedCard key={b.patientId} b={b} narrowed={narrow} dense={dense} list={list} />
            ))}
          </ListFrame>
        </>
      )}
    </Column>
  );
}

/** Highlight / dim a card from the board's selection (SR2). Narrowed, the selected pairing stands out. */
function useSelectionState(patientId: string, openingIds: string[], narrowed: boolean) {
  const { patientId: selPid, openingId: selOid } = useBoardUi().selection;
  if (!selPid && !selOid) return { selected: false, dim: false };
  if (narrowed) return { selected: !!selPid && !!selOid && selPid === patientId && openingIds.includes(selOid), dim: false };
  const hit = selPid ? selPid === patientId : openingIds.includes(selOid!);
  return { selected: hit, dim: !hit };
}

/**
 * A5, "why this slot": the patient's other queued open slots, and who would be left without a
 * slot if the team placed them there instead. The app's plan is the one that seats the most.
 */
function WhyThisSlot({ d }: { d: Decision }) {
  const { state, board, me, now } = useStore();
  const ui = useBoardUi();
  const alts = useMemo(() => alternativesFor(state, board, d.patientId, me.id, now()), [state, board, d.patientId, me.id, now]);
  if (!alts.length) return null;
  const who = ui.nameOf(d.patientId);
  return (
    <Box sx={{ fontSize: 12, lineHeight: 1.45, color: 'text.secondary' }}>
      {alts.map((a) => (
        <Box key={a.openingId}>
          Also queued for <b>{labelFor(state.trials, a.openingId)}</b>:{' '}
          {a.strands.length
            ? `placing ${who} there instead leaves ${a.strands.map(ui.nameOf).join(' and ')} without a slot.`
            : 'an equal plan, so placing them there costs no one a slot.'}
        </Box>
      ))}
    </Box>
  );
}

function NameButton({ patientId }: { patientId: string }) {
  const ui = useBoardUi();
  return (
    <Link
      component="button"
      type="button"
      underline="hover"
      onClick={() => ui.selectPatient(patientId)}
      sx={{ fontWeight: 600, fontSize: 14.5, color: 'text.primary', textAlign: 'left' }}
    >
      {ui.nameOf(patientId)}
    </Link>
  );
}

function DueText({ step }: { step?: Step }) {
  const tones = useTones();
  const due = dueInfo(step);
  if (!due) return null;
  return (
    <Box component="span" sx={{ fontSize: 12, fontWeight: due.tone === 'grey' ? 400 : 600, color: due.tone === 'grey' ? 'text.secondary' : tones[due.tone].fg }}>
      {due.text}
    </Box>
  );
}

function DecisionCard({ d, narrowed, dense, list }: { d: Decision; narrowed: boolean; dense: boolean; list: boolean }) {
  const { state, board, actions, me } = useStore();
  const toast = useToast();
  const ui = useBoardUi();
  const act = useBoardActions();
  const target = { patientId: d.patientId, openingId: d.openingId };
  const { selected, dim } = useSelectionState(d.patientId, [d.openingId], narrowed);
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const meta = DECISION[d.kind];
  const pv = board.patientById[d.patientId];
  const match = pv?.matchById[d.openingId];
  const pr = d.pairing;
  const step = pr ? currentStep(pr) : undefined;
  const consentPending = pr?.status === 'accepted' && pr.holdUntil && !pr.steps.find((s) => s.kind === 'consent_call')?.doneAt;

  return (
    <CardBox selected={selected} dim={dim} dense={dense} variant={list ? 'row' : 'card'} data={{ 'data-dpid': d.patientId, 'data-doid': d.openingId }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: dense ? 0.5 : 0.75 }}>
        <Row>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <NameButton patientId={d.patientId} />
          </Box>
          {d.newSinceSnapshot ? <ToneChip tone="teal" variant="outline" label={dense ? 'New' : 'New since snapshot'} size="tiny" /> : null}
          {pr?.placedByHand ? <ToneChip tone="indigo" variant="outline" label="Placed by hand" size="tiny" /> : null}
          <ToneChip tone={meta.tone} label={meta.label} size="tiny" />
        </Row>
        <Box sx={[{ fontSize: 12.5 }, dense ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : {}]}>
          → <b>{labelFor(state.trials, d.openingId, !dense)}</b>
          {pv && !pv.patient.queue.some((e) => e.openingId === d.openingId) ? <Muted size={12.5}> · not on their queue</Muted> : null}
          {d.kind === 'proposed' && !dense ? <DesignNote id="A5" /> : null}
        </Box>
        {d.kind === 'proposed' && !dense ? <WhyThisSlot d={d} /> : null}
        {pr?.placedByHand && !dense ? (
          <Muted size={12}>
            {placeReasonLabel(pr.placedByHand.reason)}
            {pr.placedByHand.note ? `: ${pr.placedByHand.note}` : ''}
          </Muted>
        ) : null}

        {d.kind === 'proposed' ? (
          <>
            {match?.result === 'pending_review' && !dense ? (
              <Muted size={12}>Fit pending review: {match.missing?.join(', ')}</Muted>
            ) : null}
            <Row>
              <Button size="small" variant="contained" onClick={() => act.accept(target)} sx={dense ? { py: 0, minHeight: 26 } : undefined}>
                Accept
              </Button>
              <Button size="small" variant="outlined" color="inherit" onClick={() => act.dismiss(target)} sx={dense ? { py: 0, minHeight: 26 } : undefined}>
                Dismiss…
              </Button>
              {!dense ? <Muted size={12}>assign on accept: Maya R. (consent call)</Muted> : null}
            </Row>
          </>
        ) : null}

        {pr && (d.kind === 'accepted' || d.kind === 'pre_screening') ? (
          <>
            {step?.assignee ? (
              <Row>
                <PersonTag userId={step.assignee} suffix={`· ${step.label.toLowerCase()}`} />
                <DueText step={step} />
              </Row>
            ) : (
              <Muted>All steps done</Muted>
            )}
            {consentPending ? <Muted size={12}>Slot held until {fmtWeekday(pr.holdUntil!)} for consent</Muted> : null}
            <Box>
              <Button
                size="small"
                onClick={() => setOpen((x) => !x)}
                aria-expanded={open}
                endIcon={<ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />}
                sx={{ px: 0.5, minWidth: 0 }}
              >
                {open ? 'Hide steps and trail' : 'Steps and trail'}
              </Button>
            </Box>
            <Collapse in={open} unmountOnExit>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, pt: 0.5 }}>
                <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {pr.steps.map((s, i) => {
                    const done = !!s.doneAt;
                    const current = s.id === step?.id;
                    return (
                      <Box component="li" key={s.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <StepDot n={done ? '✓' : String(i + 1)} done={done} current={current} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ fontSize: 13, fontWeight: current ? 700 : 500 }}>{s.label}</Box>
                          <Row>
                            {s.assignee ? <PersonTag userId={s.assignee} size={18} /> : s.auto ? null : <Muted size={12}>unassigned</Muted>}
                            {done ? <Muted size={12}>done {fmtWhen(s.doneAt!)}{s.doneBy && s.doneBy !== s.assignee ? ` by ${member(s.doneBy).short}` : ''}</Muted> : <DueText step={s} />}
                          </Row>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
                {step ? (
                  <Row>
                    <Button
                      size="small"
                      variant={step.assignee === me.id ? 'contained' : 'outlined'}
                      onClick={() => {
                        actions.completeStep(pr.id, step.id);
                        toast(`${step.label}: marked done.`);
                      }}
                    >
                      Mark {step.label.toLowerCase()} done
                    </Button>
                    <Button size="small" variant="outlined" color="inherit" onClick={() => act.handOff(pr, step)}>
                      Hand off…
                    </Button>
                    <Button size="small" color="inherit" onClick={() => setNoteOpen((x) => !x)} aria-expanded={noteOpen}>
                      Add note
                    </Button>
                  </Row>
                ) : null}
                {noteOpen ? (
                  <Row sx={{ alignItems: 'flex-start' }}>
                    <TextField
                      size="small"
                      multiline
                      minRows={1}
                      placeholder="e.g. left a voicemail, calling back tomorrow 10 AM"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      sx={{ flex: 1, minWidth: 180 }}
                      slotProps={{ htmlInput: { 'aria-label': 'Note on this pairing' } }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!note.trim()}
                      onClick={() => {
                        actions.addPairingNote(pr.id, note);
                        setNote('');
                        setNoteOpen(false);
                        toast('Note added to the trail.');
                      }}
                    >
                      Save note
                    </Button>
                  </Row>
                ) : null}
                <Box>
                  <Box sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>Trail</Box>
                  <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {[...pr.trail].reverse().map((t, i) => (
                      <Box component="li" key={i} sx={{ fontSize: 12.5, lineHeight: 1.45 }}>
                        <Muted size={12}>
                          {fmtWhen(t.at)}
                          {t.by ? ` · ${member(t.by).short}` : ''}
                        </Muted>
                        <Box>{t.text}</Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Collapse>
          </>
        ) : null}

        {pr && d.kind === 'dismissed' ? (
          <>
            <Box sx={{ fontSize: 12.5 }}>
              <b>{dismissReasonLabel(pr.dismissReason)}</b>
              {pr.dismissNote ? `: ${pr.dismissNote}` : ''}
            </Box>
            <Row>
              <Muted size={12}>
                {member(pr.decidedBy).short} · {fmtWhen(pr.decidedAt)}
              </Muted>
              <Button
                size="small"
                onClick={() => {
                  actions.undoPairing(pr.id);
                  toast(`Dismissal undone. ${ui.nameOf(d.patientId)} is back in line.`);
                }}
              >
                Undo
              </Button>
            </Row>
          </>
        ) : null}
      </Box>
    </CardBox>
  );
}

function BlockedCard({ b, narrowed, dense, list }: { b: Blocked; narrowed: boolean; dense: boolean; list: boolean }) {
  const { state, actions } = useStore();
  const ui = useBoardUi();
  const toast = useToast();
  const navigate = useNavigate();
  const { selected, dim } = useSelectionState(b.patientId, b.openingIds, narrowed);
  const tone: ToneName = BLOCKED[b.reason].tone;
  const p = state.patients.find((x) => x.id === b.patientId);
  const first = b.openingIds[0];

  const seeSlot = (oid: string) => {
    ui.setSlotsTab('now');
    ui.selectOpening(oid);
  };

  const watching = !!first && !!p?.watches.some((w) => w.reason === 'slot' && w.openingId === first);

  return (
    <CardBox selected={selected} dim={dim} dense={dense} variant={list ? 'row' : 'card'} data={{ 'data-dpid': b.patientId, ...(first ? { 'data-doid': first } : {}) }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: dense ? 0.5 : 0.75 }}>
        <Row>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <NameButton patientId={b.patientId} />
          </Box>
          <ToneChip tone={tone} label={b.label} size="tiny" />
        </Row>
        <Box sx={[{ fontSize: 12.5, lineHeight: 1.5 }, dense ? clampSx(2) : {}]} title={dense ? b.detail : undefined}>
          {b.detail}
        </Box>
        {b.aheadIds?.length && !dense ? <Muted size={12}>Proposed there: {b.aheadIds.map(ui.nameOf).join('; ')}</Muted> : null}
        {b.hintOpeningIds.map((oid) => (
          <Row key={oid} sx={{ fontSize: 12.5 }}>
            <Box component="span">
              Open now and fits, not queued: <b>{labelFor(state.trials, oid)}</b>
            </Box>
            <Button
              size="small"
              sx={{ minWidth: 0, py: 0 }}
              onClick={() => {
                const r = actions.queue(b.patientId, oid);
                toast(r.message);
              }}
            >
              Queue
            </Button>
          </Row>
        ))}
        <Row>
          {b.reason === 'no_slot_in_opening' && first ? (
            <>
              <Button
                size="small"
                variant="outlined"
                disabled={watching}
                onClick={() => {
                  const f = findOpening(state.trials, first);
                  if (!f) return;
                  actions.addWatch(b.patientId, { trialId: f.trial.id, openingId: first, reason: 'slot', reviewEveryDays: 30 });
                  toast(`${ui.nameOf(b.patientId)} is watching ${labelFor(state.trials, first)} for a slot.`);
                }}
              >
                {watching ? 'Watching for a slot' : 'Watch for a slot'}
              </Button>
              <Button size="small" color="inherit" onClick={() => seeSlot(first)}>
                See the slot
              </Button>
            </>
          ) : null}
          {b.reason === 'seats_taken' && first ? (
            <Button size="small" variant="outlined" onClick={() => seeSlot(first)}>
              See the slot
            </Button>
          ) : null}
          {b.reason === 'no_longer_eligible' ? (
            <Button size="small" variant="outlined" onClick={() => navigate(`/patients/${b.patientId}?tab=options`)}>
              Review the queue
            </Button>
          ) : null}
          {b.reason === 'dismissed' && b.pairing ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                actions.undoPairing(b.pairing!.id);
                toast(`Dismissal undone. ${ui.nameOf(b.patientId)} is back in line.`);
              }}
            >
              Undo dismiss
            </Button>
          ) : null}
          <Link component="button" type="button" variant="body2" onClick={() => navigate(`/patients/${b.patientId}`)}>
            Open chart
          </Link>
        </Row>
      </Box>
    </CardBox>
  );
}
