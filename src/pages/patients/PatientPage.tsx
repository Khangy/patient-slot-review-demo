import { Box, Button, Link, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router';
import type { PatientView } from '@/domain/board';
import { fmtWeekday, relDays } from '@/domain/dates';
import { labelFor, member } from '@/domain/names';
import { useStore } from '@/state/store';
import { PersonTag, ToneChip, useTone } from '@/components/ui';
import { BOARD_STATUS } from '@/components/statusMeta';
import { DesignNote } from '@/notes/DesignNote';
import { PatientHeader } from './PatientHeader';
import { ProfileTab } from './ProfileTab';
import { TrialOptionsTab } from './TrialOptionsTab';
import { ActivityTab } from './ActivityTab';
import { matchCount } from './trialOptions';

type TabId = 'options' | 'profile' | 'activity';
const TABS: TabId[] = ['options', 'profile', 'activity'];

/** Where this patient stands in Thursday's Patient Slot Review, linked both ways (SR2). */
function ReviewStrip({ view }: { view: PatientView }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const teal = useTone('teal');
  const meta = BOARD_STATUS[view.boardStatus];
  const label = (oid: string) => labelFor(state.trials, oid, true);
  const fx = view.fixedPairing;
  const step = view.openStep?.step;

  let body: ReactNode;
  if (fx) {
    body = (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {fx.status === 'accepted' ? 'Accepted' : 'Pre-screening'}: {label(fx.openingId)}
        </Typography>
        {step ? (
          <>
            <Typography variant="body2" color="text.secondary">
              · next:
            </Typography>
            {step.assignee ? <PersonTag userId={step.assignee} suffix={`· ${step.label}`} /> : <Typography variant="body2">{step.label}</Typography>}
            {step.due ? (
              <Typography variant="body2" color="text.secondary">
                due {fmtWeekday(step.due)} ({relDays(step.due)})
              </Typography>
            ) : step.dueText ? (
              <Typography variant="body2" color="text.secondary">
                {step.dueText}
              </Typography>
            ) : null}
          </>
        ) : null}
      </Stack>
    );
  } else if (view.decision?.kind === 'proposed') {
    body = (
      <Typography variant="body2">
        <b>Optimizer proposed slot:</b> {label(view.decision.openingId)}. The team accepts or dismisses it at the meeting.
      </Typography>
    );
  } else if (view.blocked) {
    body = (
      <Typography variant="body2">
        <b>Blocked: {view.blocked.label.toLowerCase()}.</b> {view.blocked.detail}
      </Typography>
    );
  } else if (view.patient.queue.length === 0) {
    const by = view.patient.addedToReviewBy;
    body = (
      <Typography variant="body2">
        <b>Nothing queued for Optimized Match yet.</b>
        {by ? ` Added to the review by ${member(by).short} to discuss.` : ''}
      </Typography>
    );
  } else {
    body = (
      <Typography variant="body2" color="text.secondary">
        Queued for Optimized Match: {view.patient.queue.map((e) => label(e.openingId)).join(', ')}.
      </Typography>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderColor: teal.border, bgcolor: teal.bg }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: teal.fg, whiteSpace: 'nowrap' }}>THURSDAY'S REVIEW</Typography>
          <ToneChip tone={meta.tone} label={meta.label} size="tiny" />
          <DesignNote id="SR2" />
        </Stack>
        <Box sx={{ flex: 1, minWidth: 0 }}>{body}</Box>
        <Button variant="outlined" size="small" startIcon={<ViewColumnOutlinedIcon />} onClick={() => navigate(`/slot-review?patient=${view.patient.id}`)} sx={{ whiteSpace: 'nowrap', bgcolor: 'background.paper' }}>
          Open in Patient Slot Review
        </Button>
      </Stack>
    </Paper>
  );
}

export function PatientPage() {
  const { patientId = '' } = useParams();
  const { board } = useStore();
  const [params, setParams] = useSearchParams();
  const [revealed, setRevealed] = useState(false);
  const view = board.patientById[patientId];

  useEffect(() => {
    setRevealed(false);
    window.scrollTo(0, 0);
  }, [patientId]);

  if (!view) {
    return (
      <Box sx={{ px: { xs: 2, md: 4 }, py: 4, maxWidth: 1280, mx: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Patient not found
        </Typography>
        <Link component={RouterLink} to="/patients">
          Back to Patients
        </Link>
      </Box>
    );
  }

  const raw = params.get('tab');
  const tab: TabId = TABS.includes(raw as TabId) ? (raw as TabId) : 'options';
  const setTab = (t: TabId) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', t);
        return next;
      },
      { replace: true },
    );
  const matches = matchCount(view, board);

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
      <Button component={RouterLink} to="/patients" startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 1.5, color: 'text.secondary' }}>
        Patients
      </Button>
      <Stack spacing={2}>
        <PatientHeader view={view} revealed={revealed} onToggleReveal={() => setRevealed((r) => !r)} onChoosePrimary={() => setTab('profile')} />
        {view.inReview ? <ReviewStrip view={view} /> : null}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v: TabId) => setTab(v)} variant="scrollable" allowScrollButtonsMobile aria-label="Patient chart">
            <Tab value="options" label={`Trial Options (${matches})`} />
            <Tab value="profile" label="Patient Profile" />
            <Tab value="activity" label="Activity History" />
          </Tabs>
        </Box>
        {tab === 'options' ? <TrialOptionsTab key={view.patient.id} view={view} /> : null}
        {tab === 'profile' ? <ProfileTab key={view.patient.id} view={view} /> : null}
        {tab === 'activity' ? <ActivityTab patientId={view.patient.id} /> : null}
      </Stack>
    </Box>
  );
}
