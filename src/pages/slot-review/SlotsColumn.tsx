import { Box, Button, Link } from '@mui/material';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { placeCheck, type NearFutureItem, type OpeningView } from '@/domain/board';
import { fmtShort } from '@/domain/dates';
import { labelFor, openingOwnName } from '@/domain/names';
import { useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { Mono, Overline, ToneChip, useTone, type ToneName } from '@/components/ui';
import { CANDIDATE, DECISION } from '@/components/statusMeta';
import { DesignNote } from '@/notes/DesignNote';
import { useBoardUi } from './boardUi';
import { CardBox, CardButton, clampSx, Column, GroupLabel, ListFrame, Muted, ReduceBar, Row, Segmented } from './parts';
import { useBoardActions } from './BoardActions';
import { isDragging, useDrag } from './dnd';
import { openingsForPatient, useShowAll } from './reduce';

export function SlotsColumn() {
  const { state, board } = useStore();
  const ui = useBoardUi();
  const { patientId: selPid, openingId: selOid } = ui.selection;
  const [showAll, setShowAll] = useShowAll(selPid);
  const ref = useRef<HTMLElement>(null);
  const list = ui.view === 'list';

  useEffect(() => {
    if (!ui.wide || (!selPid && !selOid) || isDragging()) return;
    const target = selOid ? ref.current?.querySelector(`[data-oid="${selOid}"]`) : ref.current?.querySelector('[data-bright="true"]');
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selPid, selOid, ui.wide, ui.slotsTab]);

  const openOpenings = board.openings.filter((o) => o.opening.state === 'open');

  // A selected patient narrows Slots to what applies to them (SR6), and keeps it narrowed while
  // one of their slots is open (SR8).
  const forPatient = selPid ? openingsForPatient(board, selPid) : null;
  const narrow = forPatient && !showAll ? forPatient : null;
  const who = selPid ? ui.nameOf(selPid) : '';
  const waitsFor = (n: NearFutureItem) => !!selPid && (n.waiting.some((w) => w.patientId === selPid) || n.heldForPatientId === selPid);
  const soonFor = board.nearFuture.filter(waitsFor);
  const soon = selPid && !showAll ? soonFor : board.nearFuture;

  const decision = selPid ? board.patientById[selPid]?.decision : undefined;
  const theirsTitle = decision?.kind === 'accepted' ? 'Accepted' : decision?.kind === 'pre_screening' ? 'Pre-screening' : 'Optimizer proposed slot';

  let now: ReactNode;
  if (narrow) {
    const groups = [
      { title: theirsTitle, ids: narrow.theirs },
      { title: 'Queued for Optimized Match', ids: narrow.queued },
      { title: 'Also fits, not queued', ids: narrow.fits },
    ];
    now = (
      <>
        {narrow.all.length === 0 ? <Muted>No open slot fits {who} right now. Near future shows what may open.</Muted> : null}
        {groups.map((g) =>
          g.ids.length ? (
            <Box key={g.title} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <GroupLabel>
                {g.title} · {g.ids.length}
              </GroupLabel>
              <ListFrame list={list}>
                {g.ids.map((oid) => (board.openingById[oid] ? <OpeningCard key={oid} ov={board.openingById[oid]} showTrial narrowed /> : null))}
              </ListFrame>
            </Box>
          ) : null,
        )}
      </>
    );
  } else {
    now = state.trials.map((trial) => {
      const ovs = openOpenings.filter((o) => o.trial.id === trial.id);
      if (!ovs.length) return null;
      const open = ovs.reduce((n, o) => n + o.openNow, 0);
      return (
        <Box key={trial.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ mt: 0.75, px: 0.25 }}>
            <Box component="span" sx={{ fontWeight: 700, fontSize: 14.5 }}>
              {trial.short}
            </Box>
            <Mono sx={{ ml: 0.75, color: 'text.secondary', fontSize: 12 }}>{trial.nct}</Mono>
            <Muted size={12}>
              {' '}
              · {trial.phase} · {open} open
            </Muted>
          </Box>
          <ListFrame list={list}>
            {ovs.map((ov) => (
              <OpeningCard key={ov.opening.id} ov={ov} />
            ))}
          </ListFrame>
        </Box>
      );
    });
  }

  return (
    <Column
      ref={ref}
      label="Slots"
      title={
        <>
          Slots
          <DesignNote id="A1" />
          <DesignNote id="A2" />
          <DesignNote id="SR6" />
        </>
      }
      sub="Open trial slots, by opening"
      tabs={
        <Segmented
          label="Slots: now or near future"
          value={ui.slotsTab}
          onChange={ui.setSlotsTab}
          options={[
            { value: 'now', label: `Now · ${board.tiles.openNow} open` },
            { value: 'soon', label: `Near future · ${board.nearFuture.length}` },
          ]}
        />
      }
    >
      {ui.slotsTab === 'now' ? (
        <>
          {forPatient ? <ReduceBar shown={forPatient.all.length} total={openOpenings.length} noun="openings" who={who} all={showAll} onToggle={setShowAll} /> : null}
          {now}
        </>
      ) : (
        <>
          {selPid ? (
            <ReduceBar shown={soonFor.length} total={board.nearFuture.length} noun="near-future slots" who={who} all={showAll} onToggle={setShowAll} />
          ) : null}
          <Row sx={{ px: 0.25 }}>
            <Muted size={12.5}>Openings on hold, and slots that may come back, with who is waiting for them.</Muted>
            <DesignNote id="SR4" />
          </Row>
          {selPid && !showAll && soonFor.length === 0 ? <Muted>{who} is not waiting for any of them.</Muted> : null}
          <ListFrame list={list}>
            {soon.map((n) => (
              <NearFutureCard key={n.id} item={n} narrowed={!!selPid && !showAll} />
            ))}
          </ListFrame>
        </>
      )}
    </Column>
  );
}

function countsLine(ov: OpeningView): string {
  const queuedEligible = ov.candidates.filter((c) => c.status !== 'not_eligible').length;
  const accepted = ov.fixed.filter((f) => f.status === 'accepted').length;
  const pre = ov.fixed.filter((f) => f.status === 'pre_screening').length;
  const held = [accepted && `${accepted} accepted`, pre && `${pre} in pre-screening`].filter(Boolean).join(' · ');
  let line: string;
  if (ov.openNow === 0) {
    line = ['0 open here', queuedEligible && `${queuedEligible} queued for Optimized Match`, ov.watching.length && `${ov.watching.length} watching`].filter(Boolean).join(' · ');
  } else if (ov.proposed.length === 0) {
    line = `${ov.openNow} open · ${queuedEligible ? 'none proposed' : 'no one queued'}`;
  } else {
    line = `${ov.openNow} open · ${ov.proposed.length} proposed${ov.unfilled ? ` · ${ov.unfilled} unfilled` : ''}`;
  }
  return held ? `${line} · ${held}` : line;
}

function OpeningCard({ ov, showTrial = false, narrowed = false }: { ov: OpeningView; showTrial?: boolean; narrowed?: boolean }) {
  const { board } = useStore();
  const ui = useBoardUi();
  const drag = useDrag();
  const act = useBoardActions();
  const green = useTone('green');
  const red = useTone('red');
  const { patientId: selPid, openingId: selOid } = ui.selection;
  const o = ov.opening;
  const selected = selOid === o.id;
  const view = ui.view;
  const name = showTrial ? ov.short : openingOwnName(o);

  // Patient selected: say what this opening is for them (SR2). Narrowed, nothing is dimmed (SR6).
  let pill: { label: string; tone: ToneName } | undefined;
  let dim = false;
  if (selPid) {
    const pv = board.patientById[selPid];
    const pname = ui.nameOf(selPid);
    const d = pv?.decision;
    const cand = ov.candidates.find((c) => c.patientId === selPid);
    if (d && d.openingId === o.id && d.kind !== 'dismissed') {
      const label = d.kind === 'proposed' ? `Optimizer proposed for patient: ${pname}` : d.kind === 'accepted' ? `Accepted for ${pname}` : `Pre-screening: ${pname}`;
      pill = { label, tone: DECISION[d.kind].tone };
    } else if (cand) {
      if (cand.status === 'dismissed') pill = { label: `Dismissed for ${pname}`, tone: 'grey' };
      else if (cand.status === 'not_eligible') pill = { label: 'Queued for Optimized Match, not eligible', tone: 'red' };
      else if (ov.openNow === 0) pill = { label: 'Queued for Optimized Match, no open slot', tone: 'amber' };
      else if (cand.status === 'next_in_line') pill = { label: `Queued for Optimized Match · next in line${cand.inLine && cand.inLine > 1 ? ` (${cand.inLine})` : ''}`, tone: 'amber' };
      else if (cand.status === 'queued') pill = { label: 'Queued for Optimized Match · every slot proposed', tone: 'amber' };
      else if (cand.status === 'placed_elsewhere') pill = { label: 'Queued for Optimized Match · placed elsewhere', tone: 'grey' };
    } else if (pv?.possibleNow.includes(o.id) && !narrowed) {
      // narrowed, the "Also fits, not queued" heading already says it
      pill = { label: `Possible slot for ${pname} · not queued`, tone: 'teal' };
    }
    if (!pill) dim = !narrowed;
  }

  // While a patient is dragged, every slot says whether it can take them (SR5).
  const check = drag.patientId ? placeCheck(board, drag.patientId, o.id) : null;
  const over = drag.overId === o.id;
  const dropSx = check
    ? check.ok
      ? { outline: `2px ${over ? 'solid' : 'dashed'} ${green.solid}`, outlineOffset: 2, borderRadius: 1.5, bgcolor: over ? green.bg : undefined }
      : over
        ? { outline: `2px solid ${red.solid}`, outlineOffset: 2, borderRadius: 1.5 }
        : { opacity: 0.45 }
    : {};

  // "Place here": the same as dropping the selected patient here, from the keyboard or a touch screen.
  const place = selPid && !drag.patientId ? placeCheck(board, selPid, o.id) : null;
  const placeButton =
    place?.ok && selPid ? (
      <Button
        size="small"
        variant={place.kind === 'accept' ? 'contained' : 'outlined'}
        onClick={() => act.tryPlace(selPid, o.id)}
        aria-label={`${place.kind === 'accept' ? 'Accept' : 'Place'} ${ui.nameOf(selPid)} in ${ov.short}`}
        sx={{ py: 0, minHeight: 26, whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        {place.kind === 'accept' ? 'Accept…' : 'Place here…'}
      </Button>
    ) : null;

  const pillChip = pill ? <ToneChip tone={pill.tone} variant={pill.tone === 'teal' ? 'outline' : 'solid'} label={pill.label} size="tiny" /> : null;
  const cardProps = {
    selected,
    dim,
    highlight: !!pill && !narrowed,
    onClick: () => ui.selectOpening(o.id),
    data: { 'data-oid': o.id, 'data-bright': pill ? 'true' : 'false' },
  };

  if (view === 'list') {
    return (
      <Box
        data-drop-oid={o.id}
        sx={[
          { display: 'flex', flexDirection: 'column', borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } },
          dropSx,
        ]}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pr: placeButton || pill ? 1 : 0, bgcolor: 'background.paper' }}>
          <CardButton {...cardProps} variant="row" sx={{ borderBottom: 0, flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', columnGap: 1 }}>
              <Box sx={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13.5 }}>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {name}
                </Box>
                <Muted size={12}> · {countsLine(ov)}</Muted>
              </Box>
              <Box sx={{ fontSize: 13, fontWeight: 700, color: ov.openNow ? 'text.primary' : 'text.secondary' }}>{ov.openNow}</Box>
            </Box>
          </CardButton>
          {pillChip}
          {placeButton}
        </Box>
        {selected ? <OpeningDetail ov={ov} /> : null}
      </Box>
    );
  }

  const compact = view === 'compact';
  return (
    <Box data-drop-oid={o.id} sx={[{ display: 'flex', flexDirection: 'column' }, dropSx]}>
      <CardButton {...cardProps} dense={compact}>
        {compact ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</Box>
              <Box sx={{ fontSize: 13, fontWeight: 700, color: ov.openNow ? 'text.primary' : 'text.secondary', whiteSpace: 'nowrap' }}>{ov.openNow} open</Box>
            </Box>
            <Box sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{countsLine(ov)}</Box>
            {pillChip || ov.blocks.length ? (
              <Row>
                {ov.blocks.length ? <ToneChip tone="red" label={`blocks ${ov.blocks.length}`} size="tiny" /> : null}
                {pillChip}
              </Row>
            ) : null}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ fontWeight: 600, fontSize: 14 }}>{name}</Box>
                <Muted size={12}>{o.population}</Muted>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Box sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, color: ov.openNow ? 'text.primary' : 'text.secondary' }}>{ov.openNow}</Box>
                <Muted size={11}>open</Muted>
              </Box>
            </Box>
            <Row>
              {ov.candidates.length ? <ToneChip tone="grey" label={`${ov.candidates.length} queued for Optimized Match`} size="tiny" /> : null}
              {ov.watching.length ? <ToneChip tone="blue" variant="outline" label={`${ov.watching.length} watching`} size="tiny" /> : null}
              {ov.blocks.length ? <ToneChip tone="red" label={`blocks ${ov.blocks.length}`} size="tiny" /> : null}
            </Row>
            {pillChip ? <Row sx={{ mt: 0.25 }}>{pillChip}</Row> : null}
          </Box>
        )}
      </CardButton>
      {placeButton ? <Row sx={{ justifyContent: 'flex-end', mt: 0.5 }}>{placeButton}</Row> : null}
      {selected ? <OpeningDetail ov={ov} /> : null}
    </Box>
  );
}

/** SR2 / A3: the selected opening's proposals, who is next in line, who else is queued, who it blocks, who fits but is not queued. */
function OpeningDetail({ ov }: { ov: OpeningView }) {
  const { state, board, actions } = useStore();
  const ui = useBoardUi();
  const toast = useToast();
  const teal = useTone('teal');
  const [showAllFits, setShowAllFits] = useState(false);
  const eligible = ov.candidates.filter((c) => c.status !== 'not_eligible');
  const notEligible = ov.candidates.filter((c) => c.status === 'not_eligible');
  const { patientId: selPid } = ui.selection;
  const fits = showAllFits ? ov.fitNotQueued : ov.fitNotQueued.slice(0, 6);
  const holds = [
    ...ov.opening.externalHolds.map((h) => h.label),
    ...ov.fixed.map((f) => `${ui.nameOf(f.patientId)} (${f.status === 'accepted' ? 'accepted' : 'pre-screening'})`),
  ];

  return (
    <Box
      sx={{
        ml: 1,
        mt: -0.25,
        p: 1.5,
        borderLeft: `3px solid ${teal.solid}`,
        bgcolor: 'background.paper',
        borderBottomRightRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
      }}
    >
      <Box>
        <Overline>Queued for Optimized Match</Overline>
        {eligible.length === 0 ? <Muted>No one is queued for this opening.</Muted> : null}
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {eligible.map((c) => {
            const meta = CANDIDATE[c.status];
            const since = board.patientById[c.patientId]?.inPoolSince;
            return (
              <Box component="li" key={c.patientId} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <RankDot n={c.inLine} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Row>
                    <Link
                      component="button"
                      type="button"
                      underline="hover"
                      onClick={() => ui.selectPatient(c.patientId)}
                      aria-pressed={selPid === c.patientId}
                      sx={{ fontWeight: selPid === c.patientId ? 700 : 600, fontSize: 13.5, color: 'text.primary' }}
                    >
                      {ui.nameOf(c.patientId)}
                    </Link>
                    <ToneChip tone={meta.tone} label={c.status === 'next_in_line' && c.inLine ? `${meta.label} · ${c.inLine}` : meta.label} size="tiny" />
                  </Row>
                  <Muted size={12}>
                    {since ? `in the pool since ${fmtShort(since)}` : 'not in the pool'}
                    {c.elsewhereOpeningId ? ` · → ${labelFor(state.trials, c.elsewhereOpeningId)}` : ''}
                    {c.match.result === 'pending_review' ? ` · fit pending review (${c.match.missing?.join(', ')})` : ''}
                    {(c.status === 'next_in_line' || c.status === 'queued') && c.blocked ? ' · no other slot open now' : ''}
                  </Muted>
                </Box>
              </Box>
            );
          })}
          {notEligible.map((c) => {
            const chk = c.match.checks.find((x) => x.outcome === 'not_met');
            return (
              <Box component="li" key={c.patientId} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, opacity: 0.7 }}>
                <RankDot />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Row>
                    <Link component="button" type="button" underline="hover" onClick={() => ui.selectPatient(c.patientId)} sx={{ fontWeight: 600, fontSize: 13.5, color: 'text.primary' }}>
                      {ui.nameOf(c.patientId)}
                    </Link>
                    <ToneChip tone="red" label="Not eligible" size="tiny" />
                  </Row>
                  <Muted size={12}>{chk ? `${chk.label}: ${chk.patientHas}, needs ${chk.trialWants}` : 'Not eligible on the last match'}</Muted>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {ov.openNow > 0 ? (
        <Box sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
          <Row sx={{ mb: 0.5 }}>
            <Box sx={{ fontWeight: 600, fontSize: 13 }}>
              If {ov.openNow === 1 ? 'this slot goes' : `these ${ov.openNow} slots go`} as proposed
            </Box>
            {ov.blocks.length ? <ToneChip tone="red" label={`blocks ${ov.blocks.length}`} size="tiny" /> : null}
          </Row>
          {ov.blocks.length ? (
            ov.blocks.map((pid) => {
              const hints = board.patientById[pid]?.blocked?.hintOpeningIds ?? [];
              return (
                <Box key={pid} sx={{ fontSize: 12.5 }}>
                  <b>{ui.nameOf(pid)}</b>: no other open slot on the Interest List
                  {hints.length ? `; fits ${hints.map((h) => labelFor(state.trials, h)).join(', ')}, not queued` : ''}
                </Box>
              );
            })
          ) : (
            <Muted>Blocks no one: every other queued patient still has a slot or is placed.</Muted>
          )}
          <Muted size={12} sx={{ display: 'block', mt: 0.5 }}>
            The optimizer seats as many patients as it can across every slot; ties go to whoever entered the pool first. Next in line is who would get this slot if an
            offer here falls through.
          </Muted>
        </Box>
      ) : eligible.length ? (
        <Box sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
          <Box sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>No open slot here, so every queued patient waits</Box>
          <Muted>Check Near future for a slot coming back.</Muted>
        </Box>
      ) : null}

      {ov.fitNotQueued.length ? (
        <Box>
          <Overline>Fits, not queued ({ov.fitNotQueued.length})</Overline>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {fits.map((pid) => (
              <Row key={pid}>
                <Box component="span" sx={{ fontSize: 13, flex: 1, minWidth: 0 }}>
                  {ui.nameOf(pid)}
                  {board.patientById[pid]?.patient.status === 'undeclared' ? <Muted size={12}> · undeclared</Muted> : null}
                </Box>
                <Button
                  size="small"
                  sx={{ minWidth: 0, py: 0, fontSize: 12.5 }}
                  onClick={() => {
                    const r = actions.queue(pid, ov.opening.id);
                    toast(r.message);
                  }}
                  aria-label={`Queue ${ui.nameOf(pid)} for ${ov.short}`}
                >
                  Queue
                </Button>
              </Row>
            ))}
          </Box>
          {ov.fitNotQueued.length > 6 ? (
            <Link component="button" type="button" variant="body2" onClick={() => setShowAllFits((x) => !x)} sx={{ mt: 0.5 }}>
              {showAllFits ? 'Show fewer' : `and ${ov.fitNotQueued.length - 6} more`}
            </Link>
          ) : null}
        </Box>
      ) : null}

      {ov.watching.length ? (
        <Box>
          <Overline>Watching for a slot</Overline>
          <Muted>{ov.watching.map(ui.nameOf).join('; ')}</Muted>
        </Box>
      ) : null}

      {holds.length ? (
        <Box>
          <Overline>Slots held</Overline>
          <Muted size={12}>{holds.join(' · ')}</Muted>
        </Box>
      ) : null}
    </Box>
  );
}

function RankDot({ n }: { n?: number }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 22,
        height: 22,
        mt: 0.125,
        flexShrink: 0,
        borderRadius: '50%',
        border: 1,
        borderColor: 'divider',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: 'text.secondary',
      }}
    >
      {n ?? '·'}
    </Box>
  );
}

const NF_CHIP: Record<NearFutureItem['kind'], ToneName> = { opens_on: 'amber', may_return: 'blue', no_date: 'grey' };

function NearFutureCard({ item: n, narrowed }: { item: NearFutureItem; narrowed: boolean }) {
  const { state } = useStore();
  const ui = useBoardUi();
  const { patientId: selPid, openingId: selOid } = ui.selection;
  const dense = ui.view !== 'cards';
  const waitsHere = !narrowed && !!selPid && (n.waiting.some((w) => w.patientId === selPid) || n.heldForPatientId === selPid);
  const dim = (!narrowed && !!selPid && !waitsHere) || (!selPid && !!selOid && selOid !== n.openingId);
  const chip = n.kind === 'opens_on' ? `opens ${fmtShort(n.date!)}` : n.kind === 'may_return' ? `may come back ${fmtShort(n.date!)}` : 'no date set';
  const f = state.trials.find((t) => t.openings.some((o) => o.id === n.openingId));

  return (
    <CardBox dim={dim} selected={!!waitsHere} dense={dense} variant={ui.view === 'list' ? 'row' : 'card'} data={{ 'data-bright': waitsHere ? 'true' : 'false' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box component="span" sx={{ fontWeight: 600, fontSize: 14 }}>
              {labelFor(state.trials, n.openingId)}
            </Box>
            {f ? <Mono sx={{ ml: 0.75, color: 'text.secondary', fontSize: 12 }}>{f.nct}</Mono> : null}
          </Box>
          <ToneChip tone={NF_CHIP[n.kind]} label={chip} size="tiny" />
        </Box>
        <Muted sx={dense ? clampSx(1) : undefined}>{n.note}</Muted>
        {n.heldForPatientId ? <Box sx={{ fontSize: 12.5 }}>Held for {ui.nameOf(n.heldForPatientId)} until consent</Box> : null}
        <Box sx={{ fontSize: 12.5 }}>
          {n.waiting.length ? (
            <>
              <b>{n.waiting.length} waiting:</b>{' '}
              {n.waiting.map((w, i) => (
                <Box component="span" key={w.patientId}>
                  {i ? ' · ' : ''}
                  <Link component="button" type="button" underline="hover" onClick={() => ui.selectPatient(w.patientId)} sx={{ fontSize: 12.5, verticalAlign: 'baseline', color: 'text.primary', fontWeight: 500 }}>
                    {ui.nameOf(w.patientId)}
                  </Link>{' '}
                  <Muted size={12}>({w.why})</Muted>
                </Box>
              ))}
            </>
          ) : (
            <Muted>
              {n.placedElsewhere > 0
                ? `No one waiting · ${n.placedElsewhere} who fit ${n.placedElsewhere === 1 ? 'is' : 'are'} proposed or placed elsewhere now`
                : 'No one waiting yet'}
            </Muted>
          )}
        </Box>
      </Box>
    </CardBox>
  );
}

