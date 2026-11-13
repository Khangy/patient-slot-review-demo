import {
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { PatientView } from '@/domain/board';
import type { PatientStatus } from '@/domain/types';
import { fmtNumeric } from '@/domain/dates';
import { maskedDob } from '@/domain/names';
import { dxStage } from '@/domain/summary';
import { useStore } from '@/state/store';
import { LogLine, ToneChip, useTones } from '@/components/ui';
import { DesignNote } from '@/notes/DesignNote';
import { FollowStar, PatientNameCell, statusSummary } from './common';
import { GROUP_LABEL, nextStepFor, type NextGroup, type NextStep } from './nextStep';

type ListView = 'my' | 'all';
type StatusFilter = 'any' | PatientStatus;

const VIEW_KEY = 'psr-demo.patients.view';

function storedView(): ListView {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'all' ? 'all' : 'my';
  } catch {
    return 'my';
  }
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'undeclared', label: 'Undeclared' },
  { value: 'seeking', label: 'Seeking' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'not_seeking', label: 'Not seeking' },
];

const GROUPS: NextGroup[] = ['needs_you', 'coming_up', 'nothing_due'];

export function PatientsPage() {
  const { state, board, me } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tones = useTones();
  const param = params.get('view');
  const view: ListView = param === 'all' || param === 'my' ? param : storedView();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('any');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const showPii = state.settings.showPii;

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view);
    } catch {
      // storage unavailable
    }
  }, [view]);

  const setView = (v: ListView) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('view', v);
        return next;
      },
      { replace: true },
    );

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const followed = board.patients.filter((v) => v.patient.followers.includes(me.id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return board.patients
      .filter((v) => {
        const p = v.patient;
        if (status !== 'any' && p.status !== status) return false;
        if (!q) return true;
        return `${p.first} ${p.last}`.toLowerCase().includes(q) || `${p.last}, ${p.first}`.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q);
      })
      .sort((a, b) => a.patient.last.localeCompare(b.patient.last) || a.patient.first.localeCompare(b.patient.first));
  }, [board.patients, query, status]);

  const mine = filtered.filter((v) => v.patient.followers.includes(me.id));

  const grouped = useMemo(() => {
    const out: Record<NextGroup, { view: PatientView; step: NextStep }[]> = { needs_you: [], coming_up: [], nothing_due: [] };
    for (const v of mine) {
      const step = nextStepFor(v, board, state.trials, me.id);
      out[step.group].push({ view: v, step });
    }
    for (const g of GROUPS) {
      out[g].sort((a, b) => a.step.sortDate.localeCompare(b.step.sortDate) || a.view.patient.last.localeCompare(b.view.patient.last));
    }
    return out;
  }, [mine, board, state.trials, me.id]);

  const open = (id: string) => navigate(`/patients/${id}`);

  const dobCell = (v: PatientView) => (showPii || revealed.has(v.patient.id) ? fmtNumeric(v.patient.dob) : maskedDob(v.patient));

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Patients
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, mb: 2 }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Tabs value={view} onChange={(_, v: ListView) => setView(v)} aria-label="Patient lists" sx={{ minHeight: 40 }}>
            <Tab
              value="my"
              sx={{ minHeight: 40 }}
              icon={<StarIcon fontSize="small" sx={{ color: tones.amber.solid }} />}
              iconPosition="start"
              label={`My Patients (${followed.length})`}
            />
            <Tab value="all" sx={{ minHeight: 40 }} label={`All Patients (${board.patients.length})`} />
          </Tabs>
          <DesignNote id="01" />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="Search by name or MRN"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ flex: 1 }}
            inputProps={{ 'aria-label': 'Search by name or MRN' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} sx={{ minWidth: 170 }}>
            {STATUS_FILTERS.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {view === 'all' ? (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 48 }}>
                  <Box component="span" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
                    Follow
                  </Box>
                </TableCell>
                <TableCell>
                  Patient
                  <DesignNote id="02" />
                </TableCell>
                <TableCell>DOB</TableCell>
                <TableCell>Diagnosis · stage</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((v) => {
                const s = statusSummary(v, board, state.trials);
                return (
                  <TableRow key={v.patient.id} hover onClick={() => open(v.patient.id)} sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <FollowStar patient={v.patient} />
                    </TableCell>
                    <TableCell>
                      <PatientNameCell patient={v.patient} revealed={revealed.has(v.patient.id)} onToggleReveal={() => toggleReveal(v.patient.id)} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{dobCell(v)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{dxStage(v.patient)}</TableCell>
                    <TableCell>
                      <ToneChip tone={s.tone} label={s.label} size="tiny" />
                      {s.sub ? (
                        <Typography variant="caption" component="div" color="text.secondary" sx={{ mt: 0.25 }}>
                          {s.sub}
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      No patients match this search.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      ) : mine.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{followed.length ? 'No followed patients match this search.' : 'You are not following anyone yet.'}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Find a patient in All Patients and click the star to follow them. Followed patients show here, grouped by what needs you.
          </Typography>
          <Button variant="contained" onClick={() => setView('all')}>
            Open All Patients
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 48 }}>
                  <Box component="span" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
                    Follow
                  </Box>
                </TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Diagnosis · stage</TableCell>
                <TableCell>
                  Next step
                  <DesignNote id="05" />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {GROUPS.map((g) => {
                const rows = grouped[g];
                if (!rows.length) return null;
                const tone = g === 'needs_you' ? tones.amber : g === 'coming_up' ? tones.blue : tones.grey;
                return [
                  <TableRow key={`h-${g}`}>
                    <TableCell colSpan={4} sx={{ bgcolor: tone.bg, borderBottomColor: tone.border, py: 0.75 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: tone.fg }}>
                        {GROUP_LABEL[g]} · {rows.length}
                      </Typography>
                    </TableCell>
                  </TableRow>,
                  ...rows.map(({ view: v, step }) => (
                    <TableRow key={v.patient.id} hover onClick={() => open(v.patient.id)} sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <FollowStar patient={v.patient} />
                      </TableCell>
                      <TableCell>
                        <PatientNameCell patient={v.patient} revealed={revealed.has(v.patient.id)} onToggleReveal={() => toggleReveal(v.patient.id)} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dxStage(v.patient)}</TableCell>
                      <TableCell>
                        <LogLine verb={step.verb} status={step.status} date={step.date} tone={step.tone} />
                        {step.sub ? (
                          <Typography variant="caption" component="div" color="text.secondary">
                            {step.sub}
                          </Typography>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )),
                ];
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
