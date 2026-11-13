import {
  Box,
  Button,
  ButtonBase,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useState, type ReactNode } from 'react';
import type { PatientView } from '@/domain/board';
import type { Diagnosis, Lab, Patient } from '@/domain/types';
import { fmtNumeric, fmtShort, TODAY } from '@/domain/dates';
import { useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { Mono, ToneChip, useTones } from '@/components/ui';
import { DesignNote } from '@/notes/DesignNote';
import { EditDemographicsDialog } from './dialogs';

function Section({ title, note, count, action, children }: { title: string; note?: string; count?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.25, gap: 1, flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }}>
        <Typography component="h2" sx={{ fontWeight: 700, fontSize: 15 }}>
          {title}
        </Typography>
        {count}
        {note ? <DesignNote id={note} /> : null}
        <Box sx={{ flex: 1 }} />
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

// ── Staging (board 12) ──────────────────────────────────────────────────

const STAGE_GROUPS = ['I', 'IA', 'IB', 'II', 'IIA', 'IIB', 'IIC', 'III', 'IIIA', 'IIIB', 'IIIC', 'IV', 'IVA', 'IVB', 'IVC'];

const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function StagingDialog({ patient, dx, onClose }: { patient: Patient; dx: Diagnosis; onClose: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const last = dx.stagings[dx.stagings.length - 1];
  const [mode, setMode] = useState<'new' | 'restaging' | 'fix'>(last ? 'restaging' : 'new');
  const [t, setT] = useState('');
  const [n, setN] = useState('');
  const [m, setM] = useState('');
  const [group, setGroup] = useState('');
  const [date, setDate] = useState(TODAY);
  const [note, setNote] = useState('');

  const switchMode = (next: 'restaging' | 'fix') => {
    setMode(next);
    if (next === 'fix' && last) {
      setT(last.t);
      setN(last.n);
      setM(last.m);
      setGroup(last.group);
      setDate(last.date);
      setNote(last.note ?? '');
    } else {
      setT('');
      setN('');
      setM('');
      setGroup('');
      setDate(TODAY);
      setNote('');
    }
  };

  const missing = [!t.trim() && 'T', !n.trim() && 'N', !m.trim() && 'M'].filter((x): x is string => !!x);
  const blocker = missing.length
    ? `Add ${joinAnd(missing)} to save`
    : !group
      ? 'Choose a stage group to save'
      : !date
        ? 'Add the date of staging to save'
        : undefined;
  const saveLabel = blocker ?? (mode === 'fix' ? 'Save correction' : mode === 'restaging' ? 'Save restaging' : 'Save staging');
  const isPrimary = dx.primary || patient.diagnoses.length === 1;

  const save = () => {
    actions.saveStaging(patient.id, dx.id, { date, t: t.trim(), n: n.trim(), m: m.trim(), group, note: note.trim() || undefined }, mode);
    const changes = isPrimary && group !== patient.clinical.stage;
    toast(changes ? `Saved Stage ${group}. Matches were checked before this change: re-check them on Trial Options.` : 'Staging saved.');
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {last ? 'Update staging' : 'Add staging'}
        <DesignNote id="12" />
        <Typography variant="body2" color="text.secondary">
          AJCC 8th edition · {dx.short}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          {last ? (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                What happened?
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={mode}
                onChange={(_, v: 'restaging' | 'fix' | null) => v && switchMode(v)}
                aria-label="What happened"
                sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
              >
                <ToggleButton value="restaging" sx={{ textTransform: 'none' }}>
                  New restaging (scan, biopsy)
                </ToggleButton>
                <ToggleButton value="fix" sx={{ textTransform: 'none' }}>
                  Fix a mistake in this one
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                Current: Stage {last.group} ({last.t} {last.n} {last.m}) dated {fmtNumeric(last.date)}
              </Typography>
            </Box>
          ) : null}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr', sm: '1fr 1fr 1fr 1.4fr' }, gap: 1.5 }}>
            <TextField label="T" value={t} onChange={(e) => setT(e.target.value)} placeholder="cT2a" />
            <TextField label="N" value={n} onChange={(e) => setN(e.target.value)} placeholder="cN1" />
            <TextField label="M" value={m} onChange={(e) => setM(e.target.value)} placeholder="cM1a" />
            <TextField select label="Stage group" value={group} onChange={(e) => setGroup(e.target.value)} sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
              {STAGE_GROUPS.map((g) => (
                <MenuItem key={g} value={g}>
                  Stage {g}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <TextField
            label="Date of staging"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText={
              mode === 'restaging' && last
                ? `Previous staging ${fmtNumeric(last.date)}. A restaging gets today's date unless you change it.`
                : mode === 'fix'
                  ? 'A correction keeps the date of the staging it fixes.'
                  : ' '
            }
          />
          <TextField label="Notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Restaging PET-CT" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!!blocker} onClick={save}>
          {saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Labs (board 09) ─────────────────────────────────────────────────────

interface LabDefault {
  name: string;
  unit: string;
  range: (sex: 'F' | 'M') => [number, number];
}

const LAB_DEFAULTS: LabDefault[] = [
  { name: 'ANC', unit: '10⁹/L', range: () => [1.5, 8.0] },
  { name: 'Hemoglobin', unit: 'g/dL', range: (s) => (s === 'F' ? [12.0, 15.5] : [13.5, 17.5]) },
  { name: 'Platelets', unit: '10⁹/L', range: () => [150, 400] },
  { name: 'Creatinine', unit: 'mg/dL', range: (s) => (s === 'F' ? [0.6, 1.1] : [0.7, 1.3]) },
  { name: 'Total bilirubin', unit: 'mg/dL', range: () => [0.1, 1.2] },
  { name: 'AST', unit: 'U/L', range: () => [10, 40] },
  { name: 'ALT', unit: 'U/L', range: () => [7, 56] },
];

function labFlag(lab: Pick<Lab, 'value' | 'low' | 'high'>): 'HIGH' | 'LOW' | undefined {
  if (lab.low !== undefined && lab.value < lab.low) return 'LOW';
  if (lab.high !== undefined && lab.value > lab.high) return 'HIGH';
  return undefined;
}

function FlagChip({ flag }: { flag?: 'HIGH' | 'LOW' }) {
  if (!flag) return null;
  return <ToneChip tone={flag === 'HIGH' ? 'red' : 'blue'} label={flag} size="tiny" />;
}

function AddLabDialog({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const first = LAB_DEFAULTS[0];
  const [name, setName] = useState(first.name);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(first.unit);
  const [date, setDate] = useState(TODAY);
  const [low, setLow] = useState(String(first.range(patient.sex)[0]));
  const [high, setHigh] = useState(String(first.range(patient.sex)[1]));

  const pick = (n: string) => {
    const d = LAB_DEFAULTS.find((x) => x.name === n)!;
    const [lo, hi] = d.range(patient.sex);
    setName(n);
    setUnit(d.unit);
    setLow(String(lo));
    setHigh(String(hi));
  };

  const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Number(s));
  const v = num(value);
  const flag = v === undefined ? undefined : labFlag({ value: v, low: num(low), high: num(high) });
  const blocker = v === undefined ? 'Add a numeric value to save' : !date ? 'Add the date to save' : undefined;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Add observation
        <DesignNote id="09" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select label="Observation" value={name} onChange={(e) => pick(e.target.value)}>
            {LAB_DEFAULTS.map((d) => (
              <MenuItem key={d.name} value={d.name}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1.5}>
            <TextField label="Numeric value" value={value} onChange={(e) => setValue(e.target.value)} inputProps={{ inputMode: 'decimal' }} sx={{ flex: 1 }} />
            <TextField label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} sx={{ width: 120 }} />
          </Stack>
          <TextField label="Effective date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Reference range (default for {name}, edit to match your lab)
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField label="Low" value={low} onChange={(e) => setLow(e.target.value)} inputProps={{ inputMode: 'decimal' }} sx={{ flex: 1 }} />
              <TextField label="High" value={high} onChange={(e) => setHigh(e.target.value)} inputProps={{ inputMode: 'decimal' }} sx={{ flex: 1 }} />
            </Stack>
          </Box>
          {flag ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <FlagChip flag={flag} />
              <Typography variant="body2" color="text.secondary">
                This value will be flagged {flag === 'HIGH' ? 'above' : 'below'} the range.
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!!blocker}
          onClick={() => {
            actions.addLab(patient.id, { name, value: v!, unit, date, low: num(low), high: num(high) });
            toast(flag ? `${name} added, flagged ${flag}.` : `${name} added.`);
            onClose();
          }}
        >
          {blocker ?? 'Save observation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── The tab ─────────────────────────────────────────────────────────────

export function ProfileTab({ view }: { view: PatientView }) {
  const { actions } = useStore();
  const toast = useToast();
  const tones = useTones();
  const p = view.patient;
  const [demoOpen, setDemoOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [staging, setStaging] = useState<Diagnosis | null>(null);
  const [addingLab, setAddingLab] = useState(false);

  const labs = [...p.labs].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  const flagged = labs.filter((l) => labFlag(l)).length;
  const lone = p.diagnoses.length === 1;

  return (
    <Stack spacing={2}>
      <Paper variant="outlined">
        <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5 }}>
          <ButtonBase
            onClick={() => setDemoOpen((o) => !o)}
            aria-expanded={demoOpen}
            aria-controls="demographics-panel"
            sx={{ flex: 1, justifyContent: 'flex-start', gap: 1, px: 1, py: 1, borderRadius: 1, textAlign: 'left' }}
          >
            <ExpandMoreIcon fontSize="small" sx={{ transform: demoOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
            <Typography component="h2" sx={{ fontWeight: 700, fontSize: 15 }}>
              Demographics
            </Typography>
          </ButtonBase>
          <Tooltip title="Edit demographics">
            <IconButton aria-label="Edit demographics" onClick={() => setEditing(true)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <Collapse in={demoOpen} id="demographics-panel">
          <Box sx={{ px: 2, pb: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
            {[
              ['Sex', p.sex === 'F' ? 'Female' : 'Male'],
              ['Phone', p.phone ?? 'Not recorded'],
              ['Email', p.email ?? 'Not recorded'],
              ['Referred on', fmtNumeric(p.referredOn)],
            ].map(([k, v]) => (
              <Box key={k}>
                <Typography variant="caption" color="text.secondary">
                  {k}
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  {v}
                </Typography>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Paper>

      <Section title={`Diagnoses (${p.diagnoses.length})`} note="06">
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 90 }}>Primary</TableCell>
                <TableCell>Diagnosis</TableCell>
                <TableCell>Onset</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell align="right">
                  <DesignNote id="12" />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {p.diagnoses.map((d) => {
                const isPrimary = d.primary || lone;
                const last = d.stagings[d.stagings.length - 1];
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Tooltip title={lone ? 'The only diagnosis counts as primary' : isPrimary ? 'Primary diagnosis' : 'Make primary'}>
                          <span>
                            <IconButton
                              size="small"
                              aria-label={isPrimary ? 'Primary diagnosis' : `Make ${d.label} primary`}
                              aria-pressed={isPrimary}
                              disabled={lone}
                              onClick={() => {
                                actions.setPrimaryDiagnosis(p.id, d.id);
                                toast('Primary diagnosis set.');
                              }}
                              sx={{ color: isPrimary ? tones.amber.solid : 'text.secondary', '&.Mui-disabled': { color: tones.amber.solid } }}
                            >
                              {isPrimary ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                        {lone ? (
                          <Typography variant="caption" color="text.secondary">
                            only one
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {d.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <Mono>{d.icd10}</Mono>
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtNumeric(d.onset)}</TableCell>
                    <TableCell>
                      {last ? (
                        <>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Stage {last.group}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="div">
                            {last.t} {last.n} {last.m} · {fmtNumeric(last.date)}
                          </Typography>
                          {last.note ? (
                            <Typography variant="caption" color="text.secondary" component="div">
                              {last.note}
                            </Typography>
                          ) : null}
                          {d.stagings.length > 1 ? (
                            <Typography variant="caption" color="text.secondary" component="div">
                              Previously Stage {d.stagings[d.stagings.length - 2].group} ({fmtShort(d.stagings[d.stagings.length - 2].date)})
                            </Typography>
                          ) : null}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not staged
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => setStaging(d)} sx={{ whiteSpace: 'nowrap' }}>
                        {last ? 'Update staging' : 'Add staging'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section title={`Biomarkers (${p.biomarkers.length})`}>
        <Stack direction="row" sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
          {p.biomarkers.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No biomarker results recorded.
            </Typography>
          ) : (
            p.biomarkers.map((b) => (
              <ToneChip
                key={`${b.name}-${b.date}`}
                tone={b.actionable ? 'teal' : 'grey'}
                variant={b.actionable ? 'solid' : 'soft'}
                label={`${b.name}: ${b.result}`}
                title={`Resulted ${fmtNumeric(b.date)}${b.actionable ? ' · actionable' : ''}`}
              />
            ))
          )}
        </Stack>
      </Section>

      <Section title={`Prior therapy (${p.priorTherapies.length})`}>
        {p.priorTherapies.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            No prior treatment recorded.
          </Typography>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Regimen</TableCell>
                  <TableCell>Setting</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Outcome</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {p.priorTherapies.map((t) => (
                  <TableRow key={`${t.regimen}-${t.start}`}>
                    <TableCell sx={{ fontWeight: 500 }}>{t.regimen}</TableCell>
                    <TableCell>{t.setting}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {fmtNumeric(t.start)}
                      {t.end && t.end !== t.start ? ` to ${fmtNumeric(t.end)}` : ''}
                    </TableCell>
                    <TableCell>{t.outcome ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>

      <Section
        title={`Labs (${labs.length})`}
        note="09"
        count={flagged ? <ToneChip tone="amber" label={`${flagged} flagged`} size="tiny" /> : null}
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={() => setAddingLab(true)}>
            Add observation
          </Button>
        }
      >
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>Observation</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Reference range</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {labs.map((l) => {
                const flag = labFlag(l);
                return (
                  <TableRow key={l.id} sx={flag ? { bgcolor: flag === 'HIGH' ? tones.red.bg : tones.blue.bg } : undefined}>
                    <TableCell sx={{ fontWeight: 500 }}>{l.name}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>
                          {l.value} {l.unit}
                        </span>
                        <FlagChip flag={flag} />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {l.low !== undefined && l.high !== undefined ? `ref ${l.low}–${l.high}` : 'no range'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtNumeric(l.date)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      {editing ? <EditDemographicsDialog patient={p} onClose={() => setEditing(false)} /> : null}
      {staging ? <StagingDialog patient={p} dx={staging} onClose={() => setStaging(null)} /> : null}
      {addingLab ? <AddLabDialog patient={p} onClose={() => setAddingLab(false)} /> : null}
    </Stack>
  );
}
