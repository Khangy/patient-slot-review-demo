import { Box, Button, Link } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { NearFutureItem, OpeningView } from '@/domain/board';
import { fmtShort } from '@/domain/dates';
import { labelFor, openingOwnName, ordinal } from '@/domain/names';
import { useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { Mono, Overline, ToneChip, useTone, type ToneName } from '@/components/ui';
import { CANDIDATE, DECISION } from '@/components/statusMeta';
import { DesignNote } from '@/notes/DesignNote';
import { useBoardUi } from './boardUi';
import { CardBox, CardButton, Column, Muted, Row, Segmented } from './parts';

export function SlotsColumn() {
  const { state, board } = useStore();
  const ui = useBoardUi();
  const ref = useRef<HTMLElement>(null);
  const sel = ui.selection;

  useEffect(() => {
    if (!ui.wide || !sel) return;
    const target =
      sel.kind === 'opening'
        ? ref.current?.querySelector(`[data-oid="${sel.id}"]`)
        : ref.current?.querySelector('[data-bright="true"]');
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [sel, ui.wide, ui.slotsTab]);

  const openOpenings = board.openings.filter((o) => o.opening.state === 'open');

  return (
    <Column
      ref={ref}
      label="Slots"
      title={
        <>
          Slots
          <DesignNote id="A1" />
          <DesignNote id="A2" />
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
        state.trials.map((trial) => {
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
              {ovs.map((ov) => (
                <OpeningCard key={ov.opening.id} ov={ov} />
              ))}
            </Box>
          );
        })
      ) : (
        <>
          <Row sx={{ px: 0.25 }}>
            <Muted size={12.5}>Openings on hold, and slots that may come back, with who is waiting for them.</Muted>
            <DesignNote id="SR4" />
          </Row>
          {board.nearFuture.map((n) => (
            <NearFutureCard key={n.id} item={n} />
          ))}
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
    line = ['0 open here', queuedEligible && `${queuedEligible} queued`, ov.watching.length && `${ov.watching.length} watching`].filter(Boolean).join(' · ');
  } else if (ov.proposed.length === 0) {
    line = `${ov.openNow} open · ${queuedEligible ? 'none proposed' : 'no one queued'}`;
  } else {
    line = `${ov.openNow} open · ${ov.proposed.length} proposed${ov.unfilled ? ` · ${ov.unfilled} unfilled` : ''}`;
  }
  return held ? `${line} · ${held}` : line;
}

function OpeningCard({ ov }: { ov: OpeningView }) {
  const { board } = useStore();
  const ui = useBoardUi();
  const sel = ui.selection;
  const o = ov.opening;
  const selected = sel?.kind === 'opening' && sel.id === o.id;

  // Patient selected: say what this opening is for them, dim the rest (SR2).
  let pill: { label: string; tone: ToneName } | undefined;
  let dim = false;
  if (sel?.kind === 'patient') {
    const pv = board.patientById[sel.id];
    const name = ui.nameOf(sel.id);
    const d = pv?.decision;
    const cand = ov.candidates.find((c) => c.patientId === sel.id);
    if (d && d.openingId === o.id && d.kind !== 'dismissed') {
      const label = d.kind === 'proposed' ? `Proposed for ${name}` : d.kind === 'accepted' ? `Accepted for ${name}` : `Pre-screening: ${name}`;
      pill = { label, tone: DECISION[d.kind].tone };
    } else if (cand) {
      if (cand.status === 'dismissed') pill = { label: `Dismissed for ${name}`, tone: 'grey' };
      else if (cand.status === 'not_eligible') pill = { label: 'Queued, not eligible', tone: 'red' };
      else if (ov.openNow === 0) pill = { label: 'Queued, no open slot', tone: 'amber' };
      else if (cand.status === 'reserve') pill = { label: `Queued · reserve #${cand.rank}`, tone: 'amber' };
      else if (cand.status === 'placed_elsewhere') pill = { label: 'Queued · placed elsewhere', tone: 'grey' };
    } else if (pv?.possibleNow.includes(o.id)) {
      pill = { label: `Possible slot for ${name} · not queued`, tone: 'teal' };
    }
    if (!pill) dim = true;
  }

  const reserve = ov.candidates.filter((c) => c.status === 'reserve').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardButton selected={selected} dim={dim} highlight={!!pill} onClick={() => ui.selectOpening(o.id)} data={{ 'data-oid': o.id, 'data-bright': pill ? 'true' : 'false' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ fontWeight: 600, fontSize: 14 }}>{openingOwnName(o)}</Box>
              <Muted size={12}>{o.population}</Muted>
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Box sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, color: ov.openNow ? 'text.primary' : 'text.secondary' }}>{ov.openNow}</Box>
              <Muted size={11}>open</Muted>
            </Box>
          </Box>
          <Box sx={{ fontSize: 12.5 }}>{countsLine(ov)}</Box>
          <Row>
            {ov.candidates.length ? <ToneChip tone="grey" label={`${ov.candidates.length} queued`} size="tiny" /> : null}
            {reserve ? <ToneChip tone="amber" label={`${reserve} in reserve`} size="tiny" /> : null}
            {ov.fitNotQueued.length ? <ToneChip tone="teal" variant="outline" label={`${ov.fitNotQueued.length} fit, not queued`} size="tiny" /> : null}
            {ov.watching.length ? <ToneChip tone="blue" variant="outline" label={`${ov.watching.length} watching`} size="tiny" /> : null}
            {ov.blocks.length ? <ToneChip tone="red" label={`blocks ${ov.blocks.length}`} size="tiny" /> : null}
          </Row>
          {pill ? (
            <Row sx={{ mt: 0.25 }}>
              <ToneChip tone={pill.tone} variant={pill.tone === 'teal' ? 'outline' : 'solid'} label={pill.label} size="tiny" />
            </Row>
          ) : null}
        </Box>
      </CardButton>
      {selected ? <OpeningDetail ov={ov} /> : null}
    </Box>
  );
}

/** SR2 / A3: the selected opening's candidates in rank order, who it blocks, who fits but is not queued. */
function OpeningDetail({ ov }: { ov: OpeningView }) {
  const { state, board, actions } = useStore();
  const ui = useBoardUi();
  const toast = useToast();
  const teal = useTone('teal');
  const [showAllFits, setShowAllFits] = useState(false);
  const eligible = ov.candidates.filter((c) => c.status !== 'not_eligible');
  const notEligible = ov.candidates.filter((c) => c.status === 'not_eligible');
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
        <Overline>Candidates in rank order</Overline>
        {eligible.length === 0 ? <Muted>No one is queued for this opening.</Muted> : null}
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {eligible.map((c) => {
            const meta = CANDIDATE[c.status];
            return (
              <Box component="li" key={c.patientId} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <RankDot n={c.rank} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Row>
                    <Link component="button" type="button" underline="hover" onClick={() => ui.selectPatient(c.patientId)} sx={{ fontWeight: 600, fontSize: 13.5, color: 'text.primary' }}>
                      {ui.nameOf(c.patientId)}
                    </Link>
                    <ToneChip tone={meta.tone} label={meta.label} size="tiny" />
                  </Row>
                  <Muted size={12}>
                    {ordinal(c.choice)} choice
                    {c.elsewhereOpeningId ? ` · → ${labelFor(state.trials, c.elsewhereOpeningId)}` : ''}
                    {c.match.result === 'pending_review' ? ` · fit pending review (${c.match.missing?.join(', ')})` : ''}
                    {c.status === 'reserve' && c.blocked ? ' · no other slot open now' : ''}
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

function NearFutureCard({ item: n }: { item: NearFutureItem }) {
  const { state } = useStore();
  const ui = useBoardUi();
  const sel = ui.selection;
  const waitsHere = sel?.kind === 'patient' && (n.waiting.some((w) => w.patientId === sel.id) || n.heldForPatientId === sel.id);
  const dim = (sel?.kind === 'patient' && !waitsHere) || (sel?.kind === 'opening' && sel.id !== n.openingId);
  const chip = n.kind === 'opens_on' ? `opens ${fmtShort(n.date!)}` : n.kind === 'may_return' ? `may come back ${fmtShort(n.date!)}` : 'no date set';
  const f = state.trials.find((t) => t.openings.some((o) => o.id === n.openingId));

  return (
    <CardBox dim={dim} selected={!!waitsHere} data={{ 'data-bright': waitsHere ? 'true' : 'false' }}>
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
        <Muted>{n.note}</Muted>
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

