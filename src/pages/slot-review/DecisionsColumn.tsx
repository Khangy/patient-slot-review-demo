import { Box, Button, Collapse, Link, TextField } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { DismissReason, Pairing, Step, UserId } from '@/domain/types';
import { computeBoard, dismissReasonLabel, type Blocked, type Decision } from '@/domain/board';
import { fmtWeekday, fmtWhen } from '@/domain/dates';
import { findOpening, labelFor, member, ordinal } from '@/domain/names';
import { useStore, type AcceptPlan } from '@/state/store';
import { useToast } from '@/components/Toast';
import { PersonTag, ToneChip, useTones, type ToneName } from '@/components/ui';
import { BLOCKED, DECISION } from '@/components/statusMeta';
import { DesignNote } from '@/notes/DesignNote';
import { currentStep, dueInfo, dueThisWeek, openStepsFor, useBoardUi } from './boardUi';
import { CardBox, Column, GroupLabel, Muted, Row, Segmented } from './parts';
import { AcceptDialog, DismissDialog, HandOffDialog, StepDot } from './dialogs';

type Target = { patientId: string; openingId: string; choice: number };

export function DecisionsColumn() {
  const { state, board, actions, me, now } = useStore();
  const ui = useBoardUi();
  const toast = useToast();
  const ref = useRef<HTMLElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [accepting, setAccepting] = useState<Target | null>(null);
  const [dismissing, setDismissing] = useState<Target | null>(null);
  const [handing, setHanding] = useState<{ pairing: Pairing; step: Step } | null>(null);

  const sel = ui.selection;
  useEffect(() => {
    if (!ui.wide || !sel) return;
    const target =
      sel.kind === 'patient'
        ? ref.current?.querySelector(`[data-dpid="${sel.id}"]`)
        : ref.current?.querySelector(`[data-doid="${sel.id}"]`);
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [sel, ui.wide, ui.decisionsTab]);

  const undoLatest = (patientId: string, openingId: string, status: Pairing['status']) => () => {
    const pr = stateRef.current.pairings.find((x) => x.patientId === patientId && x.openingId === openingId && x.status === status);
    if (pr) actions.undoPairing(pr.id);
  };

  const confirmAccept = (plan: AcceptPlan) => {
    if (!accepting) return;
    const t = accepting;
    actions.accept(t.patientId, t.openingId, t.choice, plan);
    setAccepting(null);
    toast(`Accepted. Consent call: ${member(plan.consentBy).short}, due ${fmtWeekday(plan.consentDue)}.`, {
      actionLabel: 'Undo',
      onAction: undoLatest(t.patientId, t.openingId, 'accepted'),
    });
  };

  const confirmDismiss = (reason: DismissReason, note: string) => {
    if (!dismissing) return;
    const t = dismissing;
    // Who moves up: re-plan with this pairing dismissed and see who is newly proposed here.
    const sim = computeBoard({
      patients: state.patients,
      trials: state.trials,
      pairings: [
        ...state.pairings.filter((x) => !(x.patientId === t.patientId && x.openingId === t.openingId)),
        { id: 'sim', patientId: t.patientId, openingId: t.openingId, status: 'dismissed', choice: t.choice, decidedAt: now(), decidedBy: me.id, steps: [], trail: [] },
      ],
    });
    const before = new Set(board.openingById[t.openingId]?.proposed ?? []);
    const moved = sim.openingById[t.openingId]?.proposed.find((pid) => !before.has(pid) && pid !== t.patientId);
    actions.dismiss(t.patientId, t.openingId, t.choice, reason, note);
    setDismissing(null);
    const where = labelFor(state.trials, t.openingId);
    toast(moved ? `Dismissed. ${ui.nameOf(moved)} moves up for ${where}.` : `Dismissed. No one else in line for ${where}.`, {
      actionLabel: 'Undo',
      onAction: undoLatest(t.patientId, t.openingId, 'dismissed'),
    });
  };

  const confirmHandOff = (to: UserId, due: string, note: string) => {
    if (!handing) return;
    actions.handOff(handing.pairing.id, handing.step.id, to, note, due);
    toast(`${handing.step.label} handed to ${member(to).short}, due ${fmtWeekday(due)}.`);
    setHanding(null);
  };

  // Tracking, filtered by "Assigned to" (SR3)
  const filtered = useMemo(() => {
    if (ui.assigned === 'everyone') return board.decisions;
    const who = ui.assigned;
    return board.decisions.filter((d) => d.pairing && d.kind !== 'dismissed' && openStepsFor(d.pairing, who).length > 0);
  }, [board.decisions, ui.assigned]);

  const byKind = (k: Decision['kind']) =>
    filtered
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
                {g.items.map((d) => (
                  <DecisionCard
                    key={d.key}
                    d={d}
                    onAccept={() => setAccepting({ patientId: d.patientId, openingId: d.openingId, choice: d.choice })}
                    onDismiss={() => setDismissing({ patientId: d.patientId, openingId: d.openingId, choice: d.choice })}
                    onHandOff={(pairing, step) => setHanding({ pairing, step })}
                  />
                ))}
              </Box>
            ) : null,
          )}
          {filtered.length === 0 ? <Muted>Nothing to track for this filter.</Muted> : null}
        </>
      ) : (
        <>
          <Row sx={{ px: 0.25 }}>
            <Muted>Every queued patient the plan could not place, with the reason and a next step.</Muted>
            <DesignNote id="A7" />
            <DesignNote id="SR4" />
          </Row>
          {board.blocked.length === 0 ? <Muted>Nobody is blocked.</Muted> : null}
          {board.blocked.map((b) => (
            <BlockedCard key={b.patientId} b={b} />
          ))}
        </>
      )}

      {accepting ? <AcceptDialog key={`a-${accepting.patientId}-${accepting.openingId}`} target={accepting} onClose={() => setAccepting(null)} onConfirm={confirmAccept} /> : null}
      {dismissing ? (
        <DismissDialog key={`d-${dismissing.patientId}-${dismissing.openingId}`} target={dismissing} onClose={() => setDismissing(null)} onConfirm={confirmDismiss} />
      ) : null}
      {handing ? <HandOffDialog key={`h-${handing.step.id}`} target={handing} onClose={() => setHanding(null)} onConfirm={confirmHandOff} /> : null}
    </Column>
  );
}

/** Highlight / dim a card from the board's one selection (SR2). */
function useSelectionState(patientId: string, openingIds: string[]) {
  const ui = useBoardUi();
  const sel = ui.selection;
  if (!sel) return { selected: false, dim: false };
  const hit = sel.kind === 'patient' ? sel.id === patientId : openingIds.includes(sel.id);
  return { selected: hit, dim: !hit };
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

function DecisionCard({
  d,
  onAccept,
  onDismiss,
  onHandOff,
}: {
  d: Decision;
  onAccept: () => void;
  onDismiss: () => void;
  onHandOff: (pairing: Pairing, step: Step) => void;
}) {
  const { state, board, actions, me } = useStore();
  const toast = useToast();
  const ui = useBoardUi();
  const { selected, dim } = useSelectionState(d.patientId, [d.openingId]);
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
    <CardBox selected={selected} dim={dim} data={{ 'data-dpid': d.patientId, 'data-doid': d.openingId }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Row>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <NameButton patientId={d.patientId} />
          </Box>
          {d.newSinceSnapshot ? <ToneChip tone="teal" variant="outline" label="New since snapshot" size="tiny" /> : null}
          <ToneChip tone={meta.tone} label={meta.label} size="tiny" />
        </Row>
        <Box sx={{ fontSize: 12.5 }}>
          → <b>{labelFor(state.trials, d.openingId, true)}</b>
          <Muted size={12.5}> · {ordinal(d.choice)} choice</Muted>
          {d.kind === 'proposed' ? <DesignNote id="A5" /> : null}
        </Box>

        {d.kind === 'proposed' ? (
          <>
            {match?.result === 'pending_review' ? (
              <Muted size={12}>Fit pending review: {match.missing?.join(', ')}</Muted>
            ) : null}
            <Row>
              <Button size="small" variant="contained" onClick={onAccept}>
                Accept
              </Button>
              <Button size="small" variant="outlined" color="inherit" onClick={onDismiss}>
                Dismiss…
              </Button>
              <Muted size={12}>assign on accept: Maya R. (consent call)</Muted>
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
                    <Button size="small" variant="outlined" color="inherit" onClick={() => onHandOff(pr, step)}>
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

function BlockedCard({ b }: { b: Blocked }) {
  const { state, actions } = useStore();
  const ui = useBoardUi();
  const toast = useToast();
  const navigate = useNavigate();
  const { selected, dim } = useSelectionState(b.patientId, b.openingIds);
  const tone: ToneName = BLOCKED[b.reason].tone;
  const p = state.patients.find((x) => x.id === b.patientId);
  const first = b.openingIds[0];

  const seeSlot = (oid: string) => {
    ui.setSlotsTab('now');
    ui.selectOpening(oid);
  };

  const watching = !!first && !!p?.watches.some((w) => w.reason === 'slot' && w.openingId === first);

  return (
    <CardBox selected={selected} dim={dim} data={{ 'data-dpid': b.patientId, ...(first ? { 'data-doid': first } : {}) }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Row>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <NameButton patientId={b.patientId} />
          </Box>
          <ToneChip tone={tone} label={b.label} size="tiny" />
        </Row>
        <Box sx={{ fontSize: 12.5, lineHeight: 1.5 }}>{b.detail}</Box>
        {b.aheadIds?.length ? <Muted size={12}>Ahead: {b.aheadIds.map(ui.nameOf).join('; ')}</Muted> : null}
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
          {b.reason === 'outranked' && first ? (
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
