import type {
  ActivityEntry,
  Biomarker,
  Clinical,
  DemoState,
  Diagnosis,
  Lab,
  Opening,
  Pairing,
  Patient,
  PriorTherapy,
  QueueEntry,
  TeamMember,
  Trial,
  UserId,
  Watch,
} from './types';

// Test data only. Every patient, trial, sponsor and team member here is invented; the NCT
// numbers are placeholders (NCT99…). The demo day is Thursday Nov 12, 2026 (see dates.ts).

export const TEAM: TeamMember[] = [
  { id: 'u-patel', name: 'Dr. Anika Patel', short: 'Dr. Patel', initials: 'AP', role: 'PI', roleLabel: 'Physician · PI', color: '#B54708' },
  { id: 'u-brennan', name: 'Dr. Sean Brennan', short: 'Dr. Brennan', initials: 'SB', role: 'Physician', roleLabel: 'Physician', color: '#4338CA' },
  { id: 'u-maya', name: 'Maya Reyes', short: 'Maya R.', initials: 'MR', role: 'CRC', roleLabel: 'Research coordinator (CRC)', color: '#6D28D9' },
  { id: 'u-luis', name: 'Luis Tran', short: 'Luis T.', initials: 'LT', role: 'RN', roleLabel: 'Research nurse (RN)', color: '#0E7490' },
];

export const SITE_NAME = 'Demo Cancer Center';

// ── Trials ──────────────────────────────────────────────────────────────

// Three trials, three cohorts each. Only Cohort 1 is open, with 1 slot; the rest are on hold.
// Trial C is the only one that needs a KRAS G12C mutation.

const cohort = (trialId: string, n: number, population: string, open = false): Opening => ({
  id: `${trialId.slice(2)}-${n}`,
  trialId,
  path: [`Cohort ${n}`],
  population,
  slotsTotal: open ? 1 : 3,
  externalHolds: [],
  state: open ? 'open' : 'on_hold',
  criteriaEntered: true,
});

const TRIALS: Trial[] = [
  {
    id: 't-a',
    short: 'Trial A',
    nct: 'NCT99000001',
    title: 'Trial A: an investigational antibody-drug conjugate in advanced NSCLC',
    phase: 'Phase 1/2',
    design: 'Open-label · three cohorts',
    sponsor: 'Sponsor A',
    summary:
      'Cohort 1 enrolls any NSCLC after chemo-immunotherapy, Cohort 2 NSCLC with PD-L1 ≥50% after chemo-immunotherapy, Cohort 3 first-line NSCLC.',
    pi: 'u-patel',
    openings: [
      cohort('t-a', 1, 'NSCLC after platinum chemo and a PD-(L)1 inhibitor', true),
      cohort('t-a', 2, 'NSCLC with PD-L1 ≥50% after platinum chemo and a PD-(L)1 inhibitor'),
      cohort('t-a', 3, 'NSCLC, first line'),
    ],
  },
  {
    id: 't-b',
    short: 'Trial B',
    nct: 'NCT99000002',
    title: 'Trial B: an investigational antibody with docetaxel in advanced NSCLC',
    phase: 'Phase 2',
    design: 'Open-label · three cohorts by histology and line',
    sponsor: 'Sponsor B',
    summary:
      'Cohort 1 enrolls non-squamous NSCLC without EGFR or ALK alterations after chemo-immunotherapy, Cohort 2 squamous NSCLC after chemo-immunotherapy, Cohort 3 first-line non-squamous NSCLC.',
    pi: 'u-brennan',
    openings: [
      cohort('t-b', 1, 'Non-squamous NSCLC after chemo-immunotherapy, no EGFR or ALK alteration', true),
      cohort('t-b', 2, 'Squamous NSCLC after chemo-immunotherapy'),
      cohort('t-b', 3, 'Non-squamous NSCLC, first line, no EGFR or ALK alteration'),
    ],
  },
  {
    id: 't-c',
    short: 'Trial C',
    nct: 'NCT99000003',
    title: 'Trial C: an oral KRAS G12C inhibitor in advanced KRAS G12C solid tumors',
    phase: 'Phase 1/2',
    design: 'Open-label · three cohorts',
    sponsor: 'Sponsor C',
    summary:
      'Cohort 1 enrolls KRAS G12C NSCLC after chemo-immunotherapy, Cohort 2 first-line KRAS G12C NSCLC with pembrolizumab, Cohort 3 any KRAS G12C solid tumor after standard therapy.',
    pi: 'u-patel',
    openings: [
      cohort('t-c', 1, 'KRAS G12C NSCLC after platinum chemo and a PD-(L)1 inhibitor', true),
      cohort('t-c', 2, 'KRAS G12C NSCLC, first line, with pembrolizumab (PD-L1 ≥1%)'),
      cohort('t-c', 3, 'Any KRAS G12C solid tumor after standard therapy'),
    ],
  },
];

// ── Patient builders ────────────────────────────────────────────────────

type Sex = 'F' | 'M';

function labs(id: string, sex: Sex, date: string, over: Partial<Record<string, number>> = {}): Lab[] {
  const female = sex === 'F';
  const rows: Omit<Lab, 'id' | 'date'>[] = [
    { name: 'ANC', value: 3.6, unit: '10⁹/L', low: 1.5, high: 8.0 },
    { name: 'Hemoglobin', value: female ? 12.6 : 13.9, unit: 'g/dL', low: female ? 12.0 : 13.5, high: female ? 15.5 : 17.5 },
    { name: 'Platelets', value: 228, unit: '10⁹/L', low: 150, high: 400 },
    { name: 'Creatinine', value: female ? 0.8 : 1.0, unit: 'mg/dL', low: female ? 0.6 : 0.7, high: female ? 1.1 : 1.3 },
    { name: 'Total bilirubin', value: 0.6, unit: 'mg/dL', low: 0.1, high: 1.2 },
    { name: 'AST', value: 24, unit: 'U/L', low: 10, high: 40 },
    { name: 'ALT', value: 21, unit: 'U/L', low: 7, high: 56 },
  ];
  return rows.map((r, i) => ({ ...r, value: over[r.name] ?? r.value, id: `${id}-lab-${i}`, date }));
}

interface PatientInput {
  id: string;
  mrn: string;
  last: string;
  first: string;
  sex: Sex;
  dob: string;
  referredOn: string;
  status?: Patient['status'];
  statusSince?: string;
  notSeekingReason?: Patient['notSeekingReason'];
  clinical: Clinical;
  dx: Omit<Diagnosis, 'id'>[];
  biomarkers?: Biomarker[];
  prior?: PriorTherapy[];
  labs?: Lab[];
  followers: UserId[];
  queue?: QueueEntry[];
  watches?: Watch[];
  addedToReviewBy?: UserId;
  matchBasis?: Partial<Clinical>;
  matchesCheckedOn?: string;
  recordChangedOn?: string;
  recordChange?: string;
  elsewhere?: Patient['elsewhere'];
  phone?: string;
}

function patient(i: PatientInput): Patient {
  return {
    id: i.id,
    mrn: i.mrn,
    first: i.first,
    last: i.last,
    dob: i.dob,
    sex: i.sex,
    phone: i.phone ?? '(555) 01' + i.mrn.slice(-2) + '-' + i.mrn.slice(-4),
    email: `${i.first.toLowerCase()}.${i.last.toLowerCase()}@example.com`,
    referredOn: i.referredOn,
    status: i.status ?? 'seeking',
    notSeekingReason: i.notSeekingReason,
    statusSince: i.statusSince ?? i.referredOn,
    clinical: i.clinical,
    matchBasis: i.matchBasis,
    matchesCheckedOn: i.matchesCheckedOn ?? '2026-11-11',
    recordChangedOn: i.recordChangedOn,
    recordChange: i.recordChange,
    diagnoses: i.dx.map((d, n) => ({ ...d, id: `${i.id}-dx-${n}` })),
    biomarkers: i.biomarkers ?? [],
    priorTherapies: i.prior ?? [],
    labs: i.labs ?? labs(i.id, i.sex, '2026-11-03'),
    followers: i.followers,
    queue: i.queue ?? [],
    watches: i.watches ?? [],
    addedToReviewBy: i.addedToReviewBy,
    elsewhere: i.elsewhere,
  };
}

const q = (openingId: string, queuedOn: string, queuedBy: UserId = 'u-patel'): QueueEntry => ({ openingId, queuedOn, queuedBy });

const LUNG_ADENO = 'Non-small cell lung cancer, adenocarcinoma';

const stg = (id: string, date: string, t: string, n: string, m: string, group: string, note?: string) => ({ id, date, t, n, m, group, note });

const chemoIO = (start: string, end: string, regimen = 'Carboplatin + pemetrexed + pembrolizumab'): PriorTherapy => ({
  regimen,
  setting: '1st line, metastatic',
  start,
  end,
  outcome: 'Progression',
});

const lungMarkers = (date: string, kras: string, pdl1: number, opts: { alk?: string; krasActionable?: boolean } = {}): Biomarker[] => [
  { name: 'KRAS', result: kras, actionable: opts.krasActionable, date },
  { name: 'EGFR', result: 'Not detected', date },
  { name: 'ALK', result: opts.alk ?? 'Not detected', date },
  { name: 'PD-L1 (22C3)', result: `TPS ${pdl1}%`, date },
];

// ── Patients ────────────────────────────────────────────────────────────

// Three NSCLC patients after chemo-immunotherapy. Only Bell has a mutation (KRAS G12C), so
// only he fits Trial C. He is also queued for Trials A and B, which Nair and Hughes each need:
// - The plan seats all three: Bell in C, Nair in A, Hughes in B.
// - Placing Bell in A instead leaves Nair without a slot; placing him in B leaves Hughes.

const PATIENTS: Patient[] = [
  patient({
    id: 'p-nair', mrn: 'LP-0041', last: 'Nair', first: 'Priya', sex: 'F', dob: '1969-10-12', referredOn: '2026-09-29', statusSince: '2026-10-01',
    clinical: { cancer: 'NSCLC', histology: 'adenocarcinoma', stage: 'IVA', kras: 'wild-type', egfr: 'wild-type', alk: 'negative', pdl1: 30, afterPlatinumIO: true },
    dx: [{ label: LUNG_ADENO, short: 'NSCLC', icd10: 'C34.31', onset: '2025-06-10', stagings: [stg('s1', '2025-06-24', 'cT3', 'cN1', 'cM1a', 'IVA')] }],
    biomarkers: lungMarkers('2025-07-01', 'Not detected', 30),
    prior: [chemoIO('2025-07-08', '2026-09-15')],
    followers: ['u-patel'],
    queue: [q('a-1', '2026-10-01')],
  }),
  patient({
    id: 'p-bell', mrn: 'LP-0042', last: 'Bell', first: 'Marcus', sex: 'M', dob: '1956-03-19', referredOn: '2026-10-12', statusSince: '2026-10-14',
    clinical: { cancer: 'NSCLC', histology: 'adenocarcinoma', stage: 'IVB', kras: 'G12C', egfr: 'wild-type', alk: 'negative', pdl1: 60, afterPlatinumIO: true },
    dx: [{ label: LUNG_ADENO, short: 'NSCLC', icd10: 'C34.12', onset: '2025-09-22', stagings: [stg('s1', '2025-10-06', 'cT2b', 'cN2', 'cM1c', 'IVB')] }],
    biomarkers: lungMarkers('2025-10-14', 'G12C detected', 60, { krasActionable: true }),
    prior: [chemoIO('2025-10-20', '2026-09-24', 'Carboplatin + paclitaxel + pembrolizumab')],
    followers: ['u-patel'],
    queue: [q('a-1', '2026-10-14'), q('b-1', '2026-10-14'), q('c-1', '2026-10-14')],
  }),
  patient({
    id: 'p-hughes', mrn: 'LP-0043', last: 'Hughes', first: 'Eleanor', sex: 'F', dob: '1964-11-19', referredOn: '2026-10-20', statusSince: '2026-10-21',
    clinical: { cancer: 'NSCLC', histology: 'adenocarcinoma', stage: 'IVA', kras: 'wild-type', egfr: 'wild-type', alk: 'negative', pdl1: 5, afterPlatinumIO: true },
    dx: [{ label: LUNG_ADENO, short: 'NSCLC', icd10: 'C34.11', onset: '2025-10-01', stagings: [stg('s1', '2025-10-15', 'cT2a', 'cN1', 'cM1a', 'IVA')] }],
    biomarkers: lungMarkers('2025-10-22', 'Not detected', 5),
    prior: [chemoIO('2025-10-29', '2026-10-10')],
    followers: ['u-brennan'],
    queue: [q('b-1', '2026-10-21', 'u-brennan')],
  }),
];

// ── Pairings already in flight before this meeting ─────────────────────

// None: every slot is still waiting on Thursday's meeting.
const PAIRINGS: Pairing[] = [];

// ── Activity history (Patient › Activity History) ───────────────────────

let activityCounter = 0;
const act = (patientId: string, at: string, verb: string, text: string, by?: UserId): ActivityEntry => ({
  id: `a-seed-${++activityCounter}`,
  patientId,
  at,
  by,
  verb,
  text,
});

function seedActivity(patients: Patient[], trials: Trial[]): ActivityEntry[] {
  const openingName = (id: string) => {
    for (const t of trials) {
      const o = t.openings.find((x) => x.id === id);
      if (o) return [t.short, ...o.path].join(' › ');
    }
    return id;
  };
  const out: ActivityEntry[] = [];
  for (const p of patients) {
    out.push(act(p.id, `${p.referredOn}T09:00`, 'REFERRED', 'New referral added to the site', p.followers[0]));
    if (p.status !== 'undeclared') {
      const label = p.status === 'seeking' ? 'Seeking' : p.status === 'watchlist' ? 'Watchlist' : 'Not seeking';
      const reason = p.notSeekingReason === 'comfort_care' ? ' · Hospice or comfort care' : '';
      out.push(act(p.id, `${p.statusSince}T10:00`, 'STATUS SET', `${label}${reason}`, p.followers[0]));
    }
    p.queue.forEach((e) => out.push(act(p.id, `${e.queuedOn}T10:30`, 'QUEUED', `${openingName(e.openingId)} for Optimized Match`, e.queuedBy)));
    p.watches.forEach((w) => {
      const what = w.reason === 'slot' ? 'waiting for a slot' : `waiting for status change to ${w.waitFor}`;
      const where = w.openingId ? openingName(w.openingId) : `${trials.find((t) => t.id === w.trialId)?.short} (any opening)`;
      out.push(act(p.id, `${w.since}T11:00`, 'WATCH STARTED', `${where} · ${what}`, p.followers[0]));
    });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export const STATE_VERSION = 8;

/** A fresh demo state. The meeting snapshot is filled in by the store (it needs the allocator). */
export function freshState(): Omit<DemoState, 'snapshot'> {
  const patients: Patient[] = JSON.parse(JSON.stringify(PATIENTS));
  const trials: Trial[] = JSON.parse(JSON.stringify(TRIALS));
  return {
    version: STATE_VERSION,
    clockStartedAt: Date.now(),
    patients,
    trials,
    pairings: JSON.parse(JSON.stringify(PAIRINGS)),
    activity: seedActivity(patients, trials),
    settings: { viewingAs: 'u-patel', showPii: true, boardNames: 'full', showDesignNotes: false, themeMode: 'light' },
    feedback: {},
  };
}
