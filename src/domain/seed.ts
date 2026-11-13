import type {
  ActivityEntry,
  Biomarker,
  Clinical,
  DemoState,
  Diagnosis,
  Lab,
  Pairing,
  Patient,
  PriorTherapy,
  QueueEntry,
  TeamMember,
  Trial,
  UserId,
  Watch,
} from './types';

// Test data only. Every patient, trial, sponsor and team member here is invented; NCT numbers
// are the ones the local seed used. The demo day is Thursday Nov 12, 2026 (see dates.ts).

export const TEAM: TeamMember[] = [
  { id: 'u-patel', name: 'Dr. Anika Patel', short: 'Dr. Patel', initials: 'AP', role: 'PI', roleLabel: 'Physician · PI', color: '#B54708' },
  { id: 'u-brennan', name: 'Dr. Sean Brennan', short: 'Dr. Brennan', initials: 'SB', role: 'Physician', roleLabel: 'Physician', color: '#4338CA' },
  { id: 'u-maya', name: 'Maya Reyes', short: 'Maya R.', initials: 'MR', role: 'CRC', roleLabel: 'Research coordinator (CRC)', color: '#6D28D9' },
  { id: 'u-luis', name: 'Luis Tran', short: 'Luis T.', initials: 'LT', role: 'RN', roleLabel: 'Research nurse (RN)', color: '#0E7490' },
];

export const SITE_NAME = 'Demo Cancer Center';

// ── Trials ──────────────────────────────────────────────────────────────

const TRIALS: Trial[] = [
  {
    id: 't-slv',
    short: 'SLV-417',
    nct: 'NCT06418327',
    title: 'SLV-417, an oral KRAS G12C inhibitor, alone and in combination in advanced solid tumors with a KRAS G12C mutation',
    phase: 'Phase 1/2',
    design: 'Open-label · dose escalation, then expansion cohorts',
    sponsor: 'Solvara Therapeutics',
    summary:
      'Part 1 finds the dose in any KRAS G12C solid tumor after standard therapy. Part 2 expands in NSCLC after chemo-immunotherapy (Cohort A), first-line NSCLC with pembrolizumab (Cohort B) and colorectal cancer with cetuximab (Cohort C, on hold).',
    pi: 'u-patel',
    openings: [
      {
        id: 'slv-dl3',
        trialId: 't-slv',
        path: ['Part 1', 'Dose Level 3'],
        population: 'Any KRAS G12C solid tumor after standard therapy',
        slotsTotal: 3,
        externalHolds: [{ label: 'Enrolled Oct 2', kind: 'enrolled' }],
        state: 'open',
        criteriaEntered: true,
      },
      {
        id: 'slv-a',
        trialId: 't-slv',
        path: ['Part 2', 'Cohort A'],
        population: 'KRAS G12C NSCLC after platinum chemo and a PD-(L)1 inhibitor',
        slotsTotal: 8,
        externalHolds: [],
        state: 'open',
        criteriaEntered: true,
      },
      {
        id: 'slv-b',
        trialId: 't-slv',
        path: ['Part 2', 'Cohort B'],
        population: 'KRAS G12C NSCLC, first line, with pembrolizumab (PD-L1 ≥1%)',
        slotsTotal: 9,
        externalHolds: [],
        state: 'open',
        criteriaEntered: false,
      },
      {
        id: 'slv-c',
        trialId: 't-slv',
        path: ['Part 2', 'Cohort C'],
        population: 'KRAS G12C colorectal cancer after standard therapy, with cetuximab',
        slotsTotal: 6,
        externalHolds: [],
        state: 'on_hold',
        criteriaEntered: false,
      },
    ],
  },
  {
    id: 't-solve',
    short: 'SOLVE-Lung 3',
    nct: 'NCT06533190',
    title: 'SOLVE-Lung 3: an investigational antibody with docetaxel after chemo-immunotherapy in advanced NSCLC',
    phase: 'Phase 2',
    design: 'Open-label · two arms by histology (not randomized)',
    sponsor: 'Cobalt Thoracic Oncology Group',
    summary:
      'Stage IV NSCLC that progressed after platinum chemotherapy and a PD-(L)1 inhibitor. Arm A enrolls non-squamous histology without EGFR or ALK alterations; Arm B enrolls squamous histology. Both arms receive the study antibody with docetaxel.',
    pi: 'u-brennan',
    openings: [
      {
        id: 'solve-a',
        trialId: 't-solve',
        path: ['Arm A'],
        population: 'Non-squamous NSCLC after chemo-immunotherapy, no EGFR or ALK alteration',
        slotsTotal: 4,
        externalHolds: [{ label: 'Enrolled Sep 18', kind: 'enrolled' }],
        state: 'open',
        criteriaEntered: true,
      },
      {
        id: 'solve-b',
        trialId: 't-solve',
        path: ['Arm B'],
        population: 'Squamous NSCLC after chemo-immunotherapy',
        slotsTotal: 4,
        externalHolds: [],
        state: 'open',
        criteriaEntered: true,
      },
    ],
  },
  {
    id: 't-spx',
    short: 'SPX-201',
    nct: 'NCT06590214',
    title: 'SPX-201, a HER3-directed antibody-drug conjugate, in advanced breast cancer and NSCLC',
    phase: 'Phase 1/2',
    design: 'Open-label · dose escalation, then expansion arms',
    sponsor: 'Spexa Bio',
    summary:
      'Part 1 escalates the dose in HR+/HER2-negative breast cancer or NSCLC without a prior topoisomerase-I ADC. Part 2 expands in HR+/HER2-negative breast cancer after a prior topoisomerase-I ADC (Arm A1) or without one (Arm A2), and in NSCLC after chemo-immunotherapy (Cohort B, opens Dec 1).',
    pi: 'u-patel',
    openings: [
      {
        id: 'spx-dl2',
        trialId: 't-spx',
        path: ['Part 1', 'Dose Level 2'],
        population: 'HR+/HER2− breast or NSCLC after standard therapy, no prior topo-I ADC',
        slotsTotal: 3,
        externalHolds: [{ label: 'Enrolled Oct 21', kind: 'enrolled' }],
        state: 'open',
        criteriaEntered: true,
      },
      {
        id: 'spx-a1',
        trialId: 't-spx',
        path: ['Part 2', 'Cohort A', 'Arm A1'],
        population: 'HR+/HER2− breast after endocrine + CDK4/6 and a prior topo-I ADC',
        slotsTotal: 2,
        externalHolds: [
          { label: 'Enrolled Sep 30', kind: 'enrolled' },
          {
            label: 'Ibarra, R. in screening',
            kind: 'screening',
            mayReturnOn: '2026-11-24',
            returnNote: 'Comes back if Ibarra, R. screen-fails; her screening window closes Nov 24',
          },
        ],
        state: 'open',
        criteriaEntered: true,
      },
      {
        id: 'spx-a2',
        trialId: 't-spx',
        path: ['Part 2', 'Cohort A', 'Arm A2'],
        population: 'HR+/HER2− breast after endocrine + CDK4/6, no prior topo-I ADC',
        slotsTotal: 5,
        externalHolds: [{ label: 'Enrolled Oct 9', kind: 'enrolled' }],
        state: 'open',
        criteriaEntered: true,
      },
      {
        id: 'spx-b',
        trialId: 't-spx',
        path: ['Part 2', 'Cohort B'],
        population: 'NSCLC after platinum chemo and a PD-(L)1 inhibitor',
        slotsTotal: 4,
        externalHolds: [],
        state: 'on_hold',
        opensOn: '2026-12-01',
        criteriaEntered: true,
      },
    ],
  },
  {
    id: 't-ctdna',
    short: 'ctDNA-Guided Adjuvant Colon',
    nct: 'NCT06601877',
    title: 'ctDNA-guided adjuvant chemotherapy versus standard of care after resection of stage II–III colon cancer',
    phase: 'Phase 3',
    design: 'Randomized 1:1 · open-label',
    randomized: '1:1',
    sponsor: 'Southwest Colon Cancer Consortium',
    summary:
      'Patients with ctDNA detected after complete resection are randomized to intensified adjuvant chemotherapy or standard of care. Treatment must start within 10 weeks of surgery.',
    pi: 'u-brennan',
    openings: [
      {
        id: 'ctdna-all',
        trialId: 't-ctdna',
        path: [],
        population: 'Resected stage II–III colon cancer, ctDNA detected after surgery',
        slotsTotal: 10,
        externalHolds: [
          { label: 'Enrolled Aug 12', kind: 'enrolled' },
          { label: 'Enrolled Oct 3', kind: 'enrolled' },
        ],
        state: 'open',
        criteriaEntered: false,
      },
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
const LUNG_SQ = 'Non-small cell lung cancer, squamous cell carcinoma';
const BREAST = 'Malignant neoplasm of breast, invasive ductal carcinoma';

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

const breastMarkers = (date: string, her2: '0' | 'low'): Biomarker[] => [
  { name: 'ER', result: 'Positive (90%)', date },
  { name: 'PR', result: 'Positive (40%)', date },
  { name: 'HER2', result: her2 === 'low' ? 'Low (IHC 1+)' : '0 (IHC 0)', date },
];

// ── Patients ────────────────────────────────────────────────────────────

const PATIENTS: Patient[] = [
  patient({
    id: 'p-okafor', mrn: 'LP-0013', last: 'Okafor', first: 'Samuel', sex: 'M', dob: '1958-04-11', referredOn: '2026-08-20', statusSince: '2026-08-24',
    clinical: { cancer: 'NSCLC', histology: 'adenocarcinoma', stage: 'IVB', kras: 'G12C', egfr: 'wild-type', alk: 'negative', pdl1: 60, afterPlatinumIO: true },
    dx: [{ label: LUNG_ADENO, short: 'NSCLC', icd10: 'C34.11', onset: '2025-11-04', stagings: [stg('s1', '2025-11-18', 'cT2a', 'cN2', 'cM1c', 'IVB')] }],
    biomarkers: lungMarkers('2025-12-02', 'G12C detected', 60, { krasActionable: true }),
    prior: [chemoIO('2025-12-15', '2026-08-10')],
    followers: ['u-patel'],
    queue: [q('slv-dl3', '2026-08-24'), q('solve-a', '2026-08-24')],
  }),
  patient({
    id: 'p-rossi', mrn: 'LP-0014', last: 'Rossi', first: 'Elena', sex: 'F', dob: '1961-02-27', referredOn: '2026-09-29', statusSince: '2026-10-01',
    clinical: { cancer: 'NSCLC', histology: 'adenocarcinoma', stage: 'IVA', kras: 'G12C', egfr: 'wild-type', alk: 'negative', pdl1: 5, afterPlatinumIO: true },
    dx: [{ label: LUNG_ADENO, short: 'NSCLC', icd10: 'C34.31', onset: '2025-06-10', stagings: [stg('s1', '2025-06-24', 'cT3', 'cN1', 'cM1a', 'IVA')] }],
    biomarkers: lungMarkers('2025-07-01', 'G12C detected', 5, { krasActionable: true }),
    prior: [chemoIO('2025-07-08', '2026-09-15')],
    followers: ['u-patel'],
    queue: [q('solve-a', '2026-10-01')],
  }),
  patient({
    id: 'p-petrova', mrn: 'LP-0015', last: 'Petrova', first: 'Irina', sex: 'F', dob: '1966-09-03', referredOn: '2026-10-02', statusSince: '2026-10-03',
    clinical: { cancer: 'NSCLC', histology: 'adenocarcinoma', stage: 'IVA', kras: 'G12V', egfr: 'wild-type', pdl1: 30, afterPlatinumIO: true },
    dx: [{ label: LUNG_ADENO, short: 'NSCLC', icd10: 'C34.12', onset: '2025-09-22', stagings: [stg('s1', '2025-10-06', 'cT2b', 'cN2', 'cM1b', 'IVA')] }],
    biomarkers: lungMarkers('2025-10-14', 'G12V detected', 30, { alk: 'Pending (sent Nov 4)' }),
    prior: [chemoIO('2025-10-20', '2026-09-24', 'Carboplatin + paclitaxel + pembrolizumab')],
    followers: ['u-brennan'],
    queue: [q('solve-a', '2026-10-03', 'u-brennan')],
  }),
  patient({
    id: 'p-tanaka', mrn: 'LP-0016', last: 'Tanaka', first: 'Aiko', sex: 'F', dob: '1972-05-30', referredOn: '2026-10-08', statusSince: '2026-10-09',
    clinical: { cancer: 'NSCLC', histology: 'squamous', stage: 'IVA', kras: 'wild-type', pdl1: 70, afterPlatinumIO: true },
    dx: [{ label: LUNG_SQ, short: 'NSCLC', icd10: 'C34.01', onset: '2025-08-19', stagings: [stg('s1', '2025-09-02', 'cT3', 'cN2', 'cM1a', 'IVA')] }],
    biomarkers: [
      { name: 'PD-L1 (22C3)', result: 'TPS 70%', date: '2025-09-09' },
      { name: 'KRAS', result: 'Not detected', date: '2025-09-09' },
    ],
    prior: [chemoIO('2025-09-15', '2026-09-28', 'Carboplatin + paclitaxel + pembrolizumab')],
    labs: labs('p-tanaka', 'F', '2026-11-11', { Creatinine: 1.2 }),
    followers: ['u-patel'],
    queue: [q('solve-b', '2026-10-09')],
  }),
  patient({
    id: 'p-mendoza', mrn: 'LP-0017', last: 'Mendoza', first: 'Rafael', sex: 'M', dob: '1953-12-14', referredOn: '2026-10-06', statusSince: '2026-10-07',
    clinical: { cancer: 'NSCLC', histology: 'adenocarcinoma', stage: 'IVB', kras: 'wild-type', egfr: 'wild-type', alk: 'negative', pdl1: 0, afterPlatinumIO: true },
    dx: [{ label: LUNG_ADENO, short: 'NSCLC', icd10: 'C34.32', onset: '2025-04-03', stagings: [stg('s1', '2025-04-17', 'cT4', 'cN3', 'cM1c', 'IVB')] }],
    biomarkers: lungMarkers('2025-04-25', 'Not detected', 0),
    prior: [chemoIO('2025-05-02', '2026-09-30')],
    followers: ['u-brennan'],
    queue: [q('solve-a', '2026-10-07', 'u-brennan')],
  }),
  patient({
    id: 'p-siddiqui', mrn: 'LP-0018', last: 'Siddiqui', first: 'Bilal', sex: 'M', dob: '1969-07-22', referredOn: '2026-10-20', statusSince: '2026-10-21',
    clinical: { cancer: 'NSCLC', histology: 'adenocarcinoma', stage: 'IVA', kras: 'wild-type', egfr: 'wild-type', alk: 'negative', pdl1: 10, afterPlatinumIO: true },
    dx: [{ label: LUNG_ADENO, short: 'NSCLC', icd10: 'C34.11', onset: '2025-10-01', stagings: [stg('s1', '2025-10-15', 'cT2a', 'cN1', 'cM1a', 'IVA')] }],
    biomarkers: lungMarkers('2025-10-22', 'Not detected', 10),
    prior: [chemoIO('2025-10-29', '2026-10-10')],
    followers: ['u-patel'],
    queue: [q('solve-a', '2026-10-21')],
  }),
  patient({
    id: 'p-lindqvist', mrn: 'LP-0019', last: 'Lindqvist', first: 'Victor', sex: 'M', dob: '1957-03-08', referredOn: '2026-09-15', statusSince: '2026-09-16',
    clinical: { cancer: 'NSCLC', histology: 'squamous', stage: 'IIIC', pdl1: 40, afterPlatinumIO: true },
    dx: [
      {
        label: LUNG_SQ, short: 'NSCLC', icd10: 'C34.11', onset: '2025-07-14',
        stagings: [stg('s1', '2026-11-06', 'cT4', 'cN3', 'cM0', 'IIIC', 'Restaging PET-CT: progression in mediastinal nodes, no distant disease')],
      },
    ],
    biomarkers: [{ name: 'PD-L1 (22C3)', result: 'TPS 40%', date: '2025-07-30' }],
    prior: [
      { regimen: 'Concurrent carboplatin + paclitaxel with radiation', setting: 'Definitive, stage III', start: '2025-08-04', end: '2025-09-19', outcome: 'Partial response' },
      { regimen: 'Durvalumab consolidation', setting: 'Consolidation', start: '2025-10-06', end: '2026-08-25', outcome: 'Progression' },
    ],
    matchesCheckedOn: '2026-11-06',
    followers: ['u-patel'],
    queue: [q('solve-b', '2026-09-16')],
  }),
  patient({
    id: 'p-haidari', mrn: 'LP-0020', last: 'Haidari', first: 'Fatima', sex: 'F', dob: '1964-11-19', referredOn: '2026-10-10', statusSince: '2026-10-12',
    clinical: { cancer: 'NSCLC', histology: 'squamous', stage: 'IVA', kras: 'wild-type', pdl1: 15, afterPlatinumIO: true },
    dx: [{ label: LUNG_SQ, short: 'NSCLC', icd10: 'C34.12', onset: '2025-06-30', stagings: [stg('s1', '2025-07-15', 'cT3', 'cN2', 'cM1b', 'IVA')] }],
    biomarkers: [{ name: 'PD-L1 (22C3)', result: 'TPS 15%', date: '2025-07-22' }, { name: 'NGS panel', result: 'No actionable alteration (KRAS wild-type)', date: '2025-07-29' }],
    prior: [chemoIO('2025-07-28', '2026-09-29', 'Carboplatin + paclitaxel + pembrolizumab')],
    followers: ['u-brennan'],
    queue: [q('solve-b', '2026-10-12', 'u-brennan')],
  }),
  patient({
    id: 'p-brandt', mrn: 'LP-0021', last: 'Brandt', first: 'Oskar', sex: 'M', dob: '1950-06-02', referredOn: '2026-10-14', statusSince: '2026-10-15',
    clinical: { cancer: 'NSCLC', histology: 'squamous', stage: 'IVB', kras: 'wild-type', pdl1: 1, afterPlatinumIO: true },
    dx: [{ label: LUNG_SQ, short: 'NSCLC', icd10: 'C34.31', onset: '2025-05-12', stagings: [stg('s1', '2025-05-27', 'cT4', 'cN2', 'cM1c', 'IVB')] }],
    biomarkers: [{ name: 'PD-L1 (22C3)', result: 'TPS 1%', date: '2025-06-03' }, { name: 'NGS panel', result: 'No actionable alteration (KRAS wild-type)', date: '2025-06-10' }],
    prior: [chemoIO('2025-06-09', '2026-10-01', 'Carboplatin + paclitaxel + pembrolizumab')],
    followers: ['u-brennan'],
    queue: [q('solve-b', '2026-10-15', 'u-brennan')],
  }),
  patient({
    id: 'p-schultz', mrn: 'LP-0022', last: 'Schultz', first: 'Hannah', sex: 'F', dob: '1975-02-11', referredOn: '2026-09-30', statusSince: '2026-10-02',
    clinical: { cancer: 'Breast', histology: 'ductal', stage: 'IV', hr: 'positive', her2: '0', afterEndocrineCdk: true },
    dx: [{ label: BREAST, short: 'Breast', icd10: 'C50.912', onset: '2024-04-18', stagings: [stg('s1', '2024-05-02', 'cT2', 'cN1', 'cM1', 'IV', 'De novo, bone and liver')] }],
    biomarkers: breastMarkers('2024-04-25', '0'),
    prior: [{ regimen: 'Letrozole + palbociclib', setting: '1st line, metastatic', start: '2024-05-13', end: '2026-08-19', outcome: 'Progression' }],
    followers: ['u-patel'],
    queue: [q('spx-a2', '2026-10-02')],
  }),
  patient({
    id: 'p-whitfield', mrn: 'LP-0023', last: 'Whitfield', first: 'James', sex: 'M', dob: '1960-01-17', referredOn: '2026-10-30', statusSince: '2026-11-01',
    clinical: { cancer: 'NSCLC', histology: 'adenocarcinoma', stage: 'IVA', kras: 'G12C', egfr: 'wild-type', alk: 'negative', pdl1: 80, firstLine: true },
    dx: [{ label: LUNG_ADENO, short: 'NSCLC', icd10: 'C34.12', onset: '2026-10-09', stagings: [stg('s1', '2026-10-21', 'cT2b', 'cN2', 'cM1b', 'IVA')] }],
    biomarkers: lungMarkers('2026-10-27', 'G12C detected', 80, { krasActionable: true }),
    prior: [],
    followers: ['u-patel', 'u-brennan'],
    addedToReviewBy: 'u-brennan',
  }),
  patient({
    id: 'p-kowalski', mrn: 'LP-0024', last: 'Kowalski', first: 'Adam', sex: 'M', dob: '1963-08-25', referredOn: '2026-10-16', statusSince: '2026-10-17',
    clinical: { cancer: 'Colorectal', histology: 'adenocarcinoma', stage: 'IVB', kras: 'G12C', msi: 'MSS', afterStandardCrc: true },
    dx: [{ label: 'Malignant neoplasm of sigmoid colon, adenocarcinoma', short: 'Colorectal', icd10: 'C18.7', onset: '2025-02-20', stagings: [stg('s1', '2025-03-04', 'cT4a', 'cN1', 'cM1b', 'IVB', 'Liver and lung metastases')] }],
    biomarkers: [
      { name: 'KRAS', result: 'G12C detected', actionable: true, date: '2025-03-11' },
      { name: 'MMR / MSI', result: 'Proficient / MSS', date: '2025-03-11' },
      { name: 'BRAF', result: 'Not detected', date: '2025-03-11' },
    ],
    prior: [
      { regimen: 'FOLFOX + bevacizumab', setting: '1st line, metastatic', start: '2025-03-17', end: '2025-11-24', outcome: 'Progression' },
      { regimen: 'FOLFIRI + bevacizumab', setting: '2nd line, metastatic', start: '2025-12-08', end: '2026-09-29', outcome: 'Progression' },
    ],
    followers: ['u-patel'],
    queue: [q('slv-dl3', '2026-10-17')],
  }),
  patient({
    id: 'p-ortiz', mrn: 'LP-0025', last: 'Ortiz', first: 'Daniel', sex: 'M', dob: '1971-10-05', referredOn: '2026-10-22', statusSince: '2026-10-23',
    clinical: { cancer: 'Colorectal', histology: 'adenocarcinoma', stage: 'IIIB', resected: true, ctdna: 'detected', msi: 'MSS' },
    dx: [{ label: 'Malignant neoplasm of ascending colon, adenocarcinoma', short: 'Colon', icd10: 'C18.2', onset: '2026-09-08', stagings: [stg('s1', '2026-10-01', 'pT3', 'pN1b', 'cM0', 'IIIB', 'Right hemicolectomy Oct 1, R0')] }],
    biomarkers: [
      { name: 'ctDNA (post-op)', result: 'Detected', actionable: true, date: '2026-10-20' },
      { name: 'MMR / MSI', result: 'Proficient / MSS', date: '2026-10-06' },
    ],
    prior: [{ regimen: 'Right hemicolectomy', setting: 'Surgery', start: '2026-10-01', end: '2026-10-01', outcome: 'R0 resection' }],
    followers: ['u-brennan'],
    queue: [q('ctdna-all', '2026-10-23', 'u-brennan')],
  }),
  patient({
    id: 'p-bauer', mrn: 'LP-0026', last: 'Bauer', first: 'Greta', sex: 'F', dob: '1968-04-14', referredOn: '2026-10-27', statusSince: '2026-10-28',
    clinical: { cancer: 'Colorectal', histology: 'adenocarcinoma', stage: 'IIA', resected: true, ctdna: 'detected', msi: 'MSS' },
    dx: [{ label: 'Malignant neoplasm of sigmoid colon, adenocarcinoma', short: 'Colon', icd10: 'C18.7', onset: '2026-09-15', stagings: [stg('s1', '2026-10-09', 'pT3', 'pN0', 'cM0', 'IIA', 'Sigmoid colectomy Oct 9, R0')] }],
    biomarkers: [
      { name: 'ctDNA (post-op)', result: 'Detected', actionable: true, date: '2026-10-24' },
      { name: 'MMR / MSI', result: 'Proficient / MSS', date: '2026-10-14' },
    ],
    prior: [{ regimen: 'Sigmoid colectomy', setting: 'Surgery', start: '2026-10-09', end: '2026-10-09', outcome: 'R0 resection' }],
    followers: ['u-brennan'],
    queue: [q('ctdna-all', '2026-10-28', 'u-brennan')],
  }),
  patient({
    id: 'p-alcott', mrn: 'LP-0027', last: 'Alcott', first: 'Teresa', sex: 'F', dob: '1959-06-21', referredOn: '2026-09-08', statusSince: '2026-09-10',
    clinical: { cancer: 'Breast', histology: 'ductal', stage: 'IV', hr: 'positive', her2: 'low', afterEndocrineCdk: true },
    dx: [{ label: BREAST, short: 'Breast', icd10: 'C50.411', onset: '2021-03-02', stagings: [stg('s1', '2021-03-16', 'pT2', 'pN1a', 'cM0', 'IIB'), stg('s2', '2024-01-22', 'rTX', 'rNX', 'cM1', 'IV', 'Recurrence: bone metastases')] }],
    biomarkers: breastMarkers('2024-01-30', 'low'),
    prior: [
      { regimen: 'Anastrozole + ribociclib', setting: '1st line, metastatic', start: '2024-02-12', end: '2025-12-01', outcome: 'Progression' },
      { regimen: 'Capecitabine', setting: '2nd line, metastatic', start: '2025-12-15', end: '2026-08-28', outcome: 'Progression' },
    ],
    followers: ['u-patel'],
    queue: [q('spx-a2', '2026-09-10')],
  }),
  patient({
    id: 'p-marquez', mrn: 'LP-0028', last: 'Marquez', first: 'Sofia', sex: 'F', dob: '1970-03-15', referredOn: '2026-10-03', statusSince: '2026-10-05',
    clinical: { cancer: 'Breast', histology: 'ductal', stage: 'IV', hr: 'positive', her2: '0', afterEndocrineCdk: true },
    dx: [{ label: BREAST, short: 'Breast', icd10: 'C50.912', onset: '2025-01-08', stagings: [stg('s1', '2025-01-21', 'cT3', 'cN2', 'cM1', 'IV', 'De novo, bone')] }],
    biomarkers: breastMarkers('2025-01-15', '0'),
    prior: [{ regimen: 'Letrozole + abemaciclib', setting: '1st line, metastatic', start: '2025-02-03', end: '2026-09-12', outcome: 'Progression' }],
    followers: ['u-brennan'],
    queue: [q('spx-a2', '2026-10-05', 'u-brennan')],
  }),
  patient({
    id: 'p-feldman', mrn: 'LP-0029', last: 'Feldman', first: 'Ruth', sex: 'F', dob: '1955-08-30', referredOn: '2026-10-06', statusSince: '2026-10-08',
    clinical: { cancer: 'Breast', histology: 'ductal', stage: 'IV', hr: 'positive', her2: 'low', afterEndocrineCdk: true },
    dx: [{ label: BREAST, short: 'Breast', icd10: 'C50.211', onset: '2019-05-14', stagings: [stg('s1', '2019-05-28', 'pT1c', 'pN0', 'cM0', 'IA'), stg('s2', '2025-06-10', 'rTX', 'rNX', 'cM1', 'IV', 'Recurrence: liver metastases')] }],
    biomarkers: breastMarkers('2025-06-17', 'low'),
    prior: [{ regimen: 'Fulvestrant + palbociclib', setting: '1st line, metastatic', start: '2025-06-30', end: '2026-09-22', outcome: 'Progression' }],
    followers: ['u-patel'],
    queue: [q('spx-a2', '2026-10-08')],
  }),
  patient({
    id: 'p-morgan', mrn: 'LP-0030', last: 'Morgan', first: 'Keisha', sex: 'F', dob: '1978-12-02', referredOn: '2026-10-12', statusSince: '2026-10-14',
    clinical: { cancer: 'Breast', histology: 'ductal', stage: 'IV', hr: 'positive', her2: 'low', afterEndocrineCdk: true },
    dx: [{ label: BREAST, short: 'Breast', icd10: 'C50.412', onset: '2024-08-26', stagings: [stg('s1', '2024-09-09', 'cT2', 'cN1', 'cM1', 'IV', 'De novo, bone and lung')] }],
    biomarkers: breastMarkers('2024-09-03', 'low'),
    prior: [{ regimen: 'Letrozole + ribociclib (+ ovarian suppression)', setting: '1st line, metastatic', start: '2024-09-23', end: '2026-09-30', outcome: 'Progression' }],
    followers: ['u-brennan'],
    queue: [q('spx-a2', '2026-10-14', 'u-brennan')],
  }),
  patient({
    id: 'p-zhou', mrn: 'LP-0031', last: 'Zhou', first: 'Mei', sex: 'F', dob: '1967-01-09', referredOn: '2026-10-18', statusSince: '2026-10-20',
    clinical: { cancer: 'Breast', histology: 'ductal', stage: 'IV', hr: 'positive', her2: '0', afterEndocrineCdk: true },
    dx: [{ label: BREAST, short: 'Breast', icd10: 'C50.911', onset: '2023-11-20', stagings: [stg('s1', '2023-12-04', 'cT2', 'cN1', 'cM1', 'IV', 'De novo, bone')] }],
    biomarkers: breastMarkers('2023-11-28', '0'),
    prior: [
      { regimen: 'Anastrozole + palbociclib', setting: '1st line, metastatic', start: '2023-12-18', end: '2025-10-06', outcome: 'Progression' },
      { regimen: 'Fulvestrant + capivasertib', setting: '2nd line, metastatic', start: '2025-10-20', end: '2026-10-05', outcome: 'Progression' },
    ],
    followers: ['u-patel'],
    queue: [q('spx-a2', '2026-10-20'), q('spx-dl2', '2026-10-20')],
  }),
  patient({
    id: 'p-alvarez', mrn: 'LP-0001', last: 'Alvarez', first: 'Maria', sex: 'F', dob: '1971-06-02', referredOn: '2026-08-12', statusSince: '2026-08-14',
    clinical: { cancer: 'Breast', histology: 'ductal', stage: 'IV', hr: 'positive', her2: 'low', afterEndocrineCdk: true, priorTopoAdc: true },
    dx: [{ label: BREAST, short: 'Breast', icd10: 'C50.412', onset: '2022-12-05', stagings: [stg('s1', '2023-01-10', 'cT3', 'cN2', 'cM1', 'IV', 'De novo, bone and liver')] }],
    biomarkers: breastMarkers('2022-12-13', 'low'),
    prior: [
      { regimen: 'Anastrozole + palbociclib', setting: '1st line, metastatic', start: '2023-02-01', end: '2024-09-16', outcome: 'Progression' },
      { regimen: 'Fulvestrant + everolimus', setting: '2nd line, metastatic', start: '2024-10-01', end: '2025-08-18', outcome: 'Progression' },
      { regimen: 'Trastuzumab deruxtecan', setting: '3rd line, metastatic', start: '2025-09-02', end: '2026-10-14', outcome: 'Progression' },
    ],
    labs: labs('p-alvarez', 'F', '2026-11-04', { Hemoglobin: 10.9, ANC: 1.4 }),
    followers: ['u-patel'],
    queue: [q('spx-a1', '2026-10-24')],
  }),
  // ── Not in Thursday's review: patient-page stories ──
  patient({
    id: 'p-brooks', mrn: 'LP-0034', last: 'Brooks', first: 'Lena', sex: 'F', dob: '1966-07-19', referredOn: '2026-09-25', statusSince: '2026-09-27',
    clinical: { cancer: 'Breast', histology: 'ductal', stage: 'IV', hr: 'positive', her2: 'low', afterEndocrineCdk: true },
    matchBasis: { stage: 'IIA' },
    matchesCheckedOn: '2026-11-02',
    recordChangedOn: '2026-11-06',
    recordChange: 'Staging changed',
    dx: [
      {
        label: BREAST, short: 'Breast', icd10: 'C50.411', onset: '2023-03-01',
        stagings: [stg('s1', '2023-03-14', 'pT2', 'pN0', 'cM0', 'IIA'), stg('s2', '2026-11-06', 'rTX', 'rN0', 'cM1', 'IV', 'Recurrence: liver metastases on CT Nov 4, biopsy confirmed')],
      },
    ],
    biomarkers: breastMarkers('2026-11-05', 'low'),
    prior: [
      { regimen: 'Lumpectomy + radiation', setting: 'Early stage', start: '2023-03-28', end: '2023-06-02', outcome: 'Completed' },
      { regimen: 'Letrozole + abemaciclib (adjuvant)', setting: 'Adjuvant', start: '2023-06-19', end: '2026-11-04', outcome: 'Recurrence on treatment' },
    ],
    labs: labs('p-brooks', 'F', '2026-11-05', { 'Total bilirubin': 1.4, AST: 62, ALT: 58 }),
    followers: ['u-patel'],
    watches: [
      {
        id: 'w-brooks', trialId: 't-spx', reason: 'status_change', waitFor: 'Stage IV', since: '2026-09-27', reviewEveryDays: 60, nextReview: '2026-11-06',
        note: 'Restaging CT due early November', statusChanged: { from: 'Stage IIA', to: 'Stage IV', on: '2026-11-06' },
      },
    ],
  }),
  patient({
    id: 'p-castillo', mrn: 'LP-0035', last: 'Castillo', first: 'Ana', sex: 'F', dob: '1963-05-28', referredOn: '2026-11-10', status: 'undeclared', statusSince: '2026-11-10',
    clinical: { cancer: 'NSCLC', histology: 'adenocarcinoma', stage: 'IVA', kras: 'G12C', egfr: 'wild-type', alk: 'negative', pdl1: 20, afterPlatinumIO: true },
    matchesCheckedOn: '2026-11-10',
    dx: [{ label: LUNG_ADENO, short: 'NSCLC', icd10: 'C34.12', onset: '2025-08-05', stagings: [stg('s1', '2025-08-19', 'cT2b', 'cN2', 'cM1a', 'IVA')] }],
    biomarkers: lungMarkers('2025-08-26', 'G12C detected', 20, { krasActionable: true }),
    prior: [chemoIO('2025-09-02', '2026-10-27')],
    followers: ['u-patel'],
  }),
  patient({
    id: 'p-nguyen', mrn: 'LP-0033', last: 'Nguyen', first: 'Thu', sex: 'F', dob: '1974-04-04', referredOn: '2026-09-12', statusSince: '2026-09-16',
    clinical: { cancer: 'Breast', histology: 'ductal', stage: 'IV', hr: 'positive', her2: 'low', afterEndocrineCdk: true, priorTopoAdc: true },
    dx: [{ label: BREAST, short: 'Breast', icd10: 'C50.911', onset: '2022-06-14', stagings: [stg('s1', '2022-06-28', 'cT2', 'cN1', 'cM1', 'IV', 'De novo, bone')] }],
    biomarkers: breastMarkers('2022-06-21', 'low'),
    prior: [
      { regimen: 'Letrozole + ribociclib', setting: '1st line, metastatic', start: '2022-07-11', end: '2024-11-04', outcome: 'Progression' },
      { regimen: 'Trastuzumab deruxtecan', setting: '2nd line, metastatic', start: '2024-11-18', end: '2026-08-31', outcome: 'Progression' },
    ],
    followers: ['u-patel'],
    watches: [{ id: 'w-nguyen', trialId: 't-spx', openingId: 'spx-a1', reason: 'slot', since: '2026-09-16', reviewEveryDays: 30, nextReview: '2026-11-16' }],
  }),
  patient({
    id: 'p-nair', mrn: 'LP-0032', last: 'Nair', first: 'Priya', sex: 'F', dob: '1969-10-12', referredOn: '2026-09-29', statusSince: '2026-10-03',
    clinical: { cancer: 'Breast', histology: 'ductal', stage: 'IV', hr: 'positive', her2: '0', afterEndocrineCdk: true, priorTopoAdc: true },
    dx: [{ label: BREAST, short: 'Breast', icd10: 'C50.412', onset: '2020-02-11', stagings: [stg('s1', '2020-02-25', 'pT2', 'pN2a', 'cM0', 'IIIA'), stg('s2', '2023-05-08', 'rTX', 'rNX', 'cM1', 'IV', 'Recurrence: bone and liver')] }],
    biomarkers: breastMarkers('2023-05-15', '0'),
    prior: [
      { regimen: 'Fulvestrant + palbociclib', setting: '1st line, metastatic', start: '2023-05-29', end: '2025-04-07', outcome: 'Progression' },
      { regimen: 'Sacituzumab govitecan', setting: '2nd line, metastatic', start: '2025-04-21', end: '2026-09-15', outcome: 'Progression' },
    ],
    followers: ['u-brennan'],
    watches: [{ id: 'w-nair', trialId: 't-spx', openingId: 'spx-a1', reason: 'slot', since: '2026-10-03', reviewEveryDays: 60, nextReview: '2026-12-02' }],
  }),
  patient({
    id: 'p-hale', mrn: 'LP-0036', last: 'Hale', first: 'Dorothy', sex: 'F', dob: '1948-09-09', referredOn: '2026-08-05', status: 'not_seeking', notSeekingReason: 'comfort_care', statusSince: '2026-10-22',
    clinical: { cancer: 'Pancreatic', histology: 'adenocarcinoma', stage: 'IV', kras: 'G12D' },
    dx: [{ label: 'Malignant neoplasm of pancreas, adenocarcinoma', short: 'Pancreatic', icd10: 'C25.0', onset: '2025-12-01', stagings: [stg('s1', '2025-12-15', 'cT3', 'cN1', 'cM1', 'IV', 'Liver metastases')] }],
    biomarkers: [{ name: 'KRAS', result: 'G12D detected', date: '2025-12-22' }],
    prior: [
      { regimen: 'Gemcitabine + nab-paclitaxel', setting: '1st line, metastatic', start: '2026-01-05', end: '2026-09-21', outcome: 'Progression' },
    ],
    followers: ['u-patel'],
  }),
  patient({
    id: 'p-yusuf', mrn: 'LP-0037', last: 'Yusuf', first: 'Amina', sex: 'F', dob: '1962-02-14', referredOn: '2026-05-19', statusSince: '2026-05-21',
    clinical: { cancer: 'Ovarian', histology: 'serous', stage: 'IIIC' },
    dx: [{ label: 'Malignant neoplasm of ovary, high-grade serous carcinoma', short: 'Ovarian', icd10: 'C56.9', onset: '2026-04-02', stagings: [stg('s1', '2026-04-20', 'pT3c', 'pN1', 'cM0', 'IIIC')] }],
    biomarkers: [{ name: 'BRCA1/2 (germline)', result: 'Not detected', date: '2026-05-04' }, { name: 'HRD', result: 'Positive', actionable: true, date: '2026-05-04' }],
    prior: [{ regimen: 'Carboplatin + paclitaxel, interval debulking', setting: 'Front line', start: '2026-05-04', end: '2026-06-29', outcome: 'Complete response' }],
    followers: ['u-brennan'],
    elsewhere: { trial: 'RFX-100 maintenance', step: 'On study', upn: '0142', since: '2026-07-08' },
  }),
];

// ── Pairings already in flight before this meeting ─────────────────────

const PAIRINGS: Pairing[] = [
  {
    id: 'pair-okafor',
    patientId: 'p-okafor',
    openingId: 'slv-dl3',
    status: 'accepted',
    choice: 1,
    decidedAt: '2026-11-05T08:22',
    decidedBy: 'u-patel',
    holdUntil: '2026-11-19',
    steps: [
      { id: 'st-ok-1', kind: 'accepted', label: 'Accepted at the meeting', assignee: 'u-patel', due: '2026-11-05', doneAt: '2026-11-05T08:22', doneBy: 'u-patel' },
      { id: 'st-ok-2', kind: 'consent_call', label: 'Consent call', assignee: 'u-maya', due: '2026-11-13' },
      { id: 'st-ok-3', kind: 'prescreen_labs', label: 'Book pre-screen labs', assignee: 'u-luis', dueText: 'after consent' },
      { id: 'st-ok-4', kind: 'prescreening_opens', label: "Pre-screening opens on the patient's Enrollment tab", dueText: 'automatic', auto: true },
    ],
    trail: [
      { at: '2026-11-05T08:22', by: 'u-patel', text: 'Accepted at the meeting. Consent call assigned to Maya R., due Nov 6.' },
      { at: '2026-11-06T10:05', by: 'u-maya', text: 'Called, left a voicemail.' },
      { at: '2026-11-09T14:05', by: 'u-maya', text: 'Spoke with Mr. Okafor. He wants to talk it over with his daughter; calling back Fri Nov 13, 10 AM. Moved the due date to Nov 13.' },
      { at: '2026-11-09T14:20', by: 'u-patel', text: 'Extended the slot hold to Nov 19 for the family conversation.' },
    ],
  },
  {
    id: 'pair-tanaka',
    patientId: 'p-tanaka',
    openingId: 'solve-b',
    status: 'pre_screening',
    choice: 1,
    decidedAt: '2026-10-29T08:19',
    decidedBy: 'u-patel',
    steps: [
      { id: 'st-ta-1', kind: 'accepted', label: 'Accepted at the meeting', assignee: 'u-patel', due: '2026-10-29', doneAt: '2026-10-29T08:19', doneBy: 'u-patel' },
      { id: 'st-ta-2', kind: 'consent_call', label: 'Consent call', assignee: 'u-maya', due: '2026-10-30', doneAt: '2026-11-03T11:20', doneBy: 'u-maya' },
      { id: 'st-ta-3', kind: 'prescreen_labs', label: 'Book pre-screen labs', assignee: 'u-luis', due: '2026-11-11', doneAt: '2026-11-11T09:40', doneBy: 'u-luis' },
      { id: 'st-ta-4', kind: 'prescreening_opens', label: "Pre-screening opens on the patient's Enrollment tab", dueText: 'automatic', auto: true, doneAt: '2026-11-11T09:40' },
      { id: 'st-ta-5', kind: 'review_results', label: 'Review pre-screen results', assignee: 'u-patel', due: '2026-11-16' },
    ],
    trail: [
      { at: '2026-10-29T08:19', by: 'u-patel', text: 'Accepted at the meeting. Consent call assigned to Maya R., due Oct 30.' },
      { at: '2026-11-03T11:20', by: 'u-maya', text: 'Consented to pre-screening. Prefers Tuesday or Wednesday visits.' },
      { at: '2026-11-11T09:40', by: 'u-luis', text: 'Pre-screen labs drawn. Creatinine 1.2, flagged for Dr. Patel. Remaining results expected Nov 13.' },
    ],
  },
];

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
    p.queue.forEach((e, i) =>
      out.push(act(p.id, `${e.queuedOn}T10:30`, 'QUEUED', `${openingName(e.openingId)} (choice ${i + 1}) for Optimized Match`, e.queuedBy)),
    );
    p.watches.forEach((w) => {
      const what = w.reason === 'slot' ? 'waiting for a slot' : `waiting for status change to ${w.waitFor}`;
      const where = w.openingId ? openingName(w.openingId) : `${trials.find((t) => t.id === w.trialId)?.short} (any opening)`;
      out.push(act(p.id, `${w.since}T11:00`, 'WATCH STARTED', `${where} · ${what}`, p.followers[0]));
    });
  }
  out.push(act('p-whitfield', '2026-11-11T16:40', 'ADDED TO REVIEW', "Thursday's Patient Slot Review, nothing queued yet", 'u-brennan'));
  out.push(act('p-lindqvist', '2026-11-06T13:12', 'STAGED', 'Stage IIIC (cT4 cN3 cM0), restaging PET-CT', 'u-patel'));
  out.push(act('p-lindqvist', '2026-11-06T13:13', 'RE-MATCHED', 'SOLVE-Lung 3 › Arm B: not eligible, needs Stage IV (now IIIC). Still queued.'));
  out.push(act('p-brooks', '2026-11-06T15:30', 'STAGED', 'Stage IV (rTX rN0 cM1), recurrence in the liver', 'u-patel'));
  out.push(act('p-brooks', '2026-11-06T15:30', 'STATUS CHANGED', 'Stage IIA → IV · the SPX-201 watch was waiting for Stage IV'));
  out.push(act('p-okafor', '2026-11-05T08:22', 'ACCEPTED', 'SLV-417 › Part 1 › Dose Level 3 at the Thursday meeting', 'u-patel'));
  out.push(act('p-okafor', '2026-11-09T14:05', 'STEP NOTE', 'Consent call: calling back Fri Nov 13, 10 AM (Maya R.)', 'u-maya'));
  out.push(act('p-tanaka', '2026-10-29T08:19', 'ACCEPTED', 'SOLVE-Lung 3 › Arm B at the Thursday meeting', 'u-patel'));
  out.push(act('p-tanaka', '2026-11-03T11:20', 'STEP DONE', 'Consent call (Maya R.)', 'u-maya'));
  out.push(act('p-tanaka', '2026-11-11T09:40', 'PRE-SCREENING', 'Pre-screen labs drawn; pre-screening opened for SOLVE-Lung 3 › Arm B', 'u-luis'));
  out.push(act('p-yusuf', '2026-07-08T09:00', 'ON STUDY', 'RFX-100 maintenance · UPN 0142', 'u-brennan'));
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export const STATE_VERSION = 4;

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
