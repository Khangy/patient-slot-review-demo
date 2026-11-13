// Domain types for the demo. Names follow the app's vocabulary after the Nov 10 feedback
// round: "slot" (never seat), "Queued for Optimized Match", "Undeclared" for untriaged.

export type UserId = 'u-patel' | 'u-brennan' | 'u-maya' | 'u-luis';

export interface TeamMember {
  id: UserId;
  name: string; // "Dr. Anika Patel"
  short: string; // "Dr. Patel"
  initials: string;
  role: 'PI' | 'Physician' | 'CRC' | 'RN';
  roleLabel: string; // "Physician · PI"
  color: string; // avatar background
}

// ── Clinical facts the matcher reads ─────────────────────────────────────

export type CancerType = 'NSCLC' | 'Breast' | 'Colorectal' | 'Pancreatic' | 'Ovarian';

export interface Clinical {
  cancer: CancerType;
  histology?: 'adenocarcinoma' | 'squamous' | 'ductal' | 'serous';
  stage?: string; // AJCC stage group: 'IVA', 'IIIC', 'IIA'. Undefined = not staged yet
  kras?: 'G12C' | 'G12V' | 'G12D' | 'wild-type';
  egfr?: 'mutant' | 'wild-type';
  alk?: 'rearranged' | 'negative';
  pdl1?: number; // TPS %
  hr?: 'positive' | 'negative';
  her2?: '0' | 'low' | 'positive';
  msi?: 'MSS' | 'MSI-H';
  ctdna?: 'detected' | 'not detected';
  resected?: boolean;
  /** Metastatic or unresectable disease, no systemic treatment for it yet */
  firstLine?: boolean;
  /** Progressed after platinum chemotherapy and a PD-(L)1 inhibitor */
  afterPlatinumIO?: boolean;
  /** Breast: progressed after endocrine therapy plus a CDK4/6 inhibitor */
  afterEndocrineCdk?: boolean;
  /** Prior topoisomerase-I ADC (trastuzumab deruxtecan, sacituzumab govitecan) */
  priorTopoAdc?: boolean;
  /** Colorectal: progressed after fluoropyrimidine, oxaliplatin and irinotecan */
  afterStandardCrc?: boolean;
}

export interface Staging {
  id: string;
  date: string; // ISO date
  t: string;
  n: string;
  m: string;
  group: string; // 'IVA'
  note?: string;
}

export interface Diagnosis {
  id: string;
  label: string; // "Non-small cell lung cancer, adenocarcinoma"
  short: string; // "NSCLC" — used in list columns
  icd10: string;
  onset: string;
  primary?: boolean;
  stagings: Staging[]; // newest last
}

export interface Biomarker {
  name: string; // "KRAS"
  result: string; // "G12C detected"
  /** actionable / positive result: shown as a filled chip */
  actionable?: boolean;
  date: string;
}

export interface PriorTherapy {
  regimen: string;
  setting: string; // "1st line metastatic"
  start: string;
  end?: string;
  outcome?: string; // "Progression"
}

export interface Lab {
  id: string;
  name: string;
  value: number;
  unit: string;
  date: string;
  low?: number;
  high?: number;
}

// ── Patient ──────────────────────────────────────────────────────────────

export type PatientStatus = 'undeclared' | 'seeking' | 'watchlist' | 'not_seeking';

export type NotSeekingReason =
  | 'second_opinion'
  | 'break'
  | 'healthy'
  | 'standard_of_care'
  | 'comfort_care'; // board 11: new reason

export interface QueueEntry {
  openingId: string;
  queuedOn: string; // ISO date; the demo optimizer ranks by time on the queue
  queuedBy: UserId;
}

export interface Watch {
  id: string;
  trialId: string;
  openingId?: string; // undefined = any opening of the trial
  reason: 'slot' | 'status_change' | 'other';
  waitFor?: string; // "Stage IV"
  since: string;
  reviewEveryDays: 30 | 60;
  nextReview: string;
  note?: string;
  /** set when the patient's record reached what the watch waits for */
  statusChanged?: { from: string; to: string; on: string };
}

export interface Patient {
  id: string;
  mrn: string;
  first: string;
  last: string;
  dob: string;
  sex: 'F' | 'M';
  phone?: string;
  email?: string;
  referredOn: string;
  status: PatientStatus;
  notSeekingReason?: NotSeekingReason;
  statusSince: string;
  clinical: Clinical;
  /** When set, matches were last computed on these older facts (board 13: stale matches). */
  matchBasis?: Partial<Clinical>;
  matchesCheckedOn: string;
  /** the date the record last changed in a way the matcher reads */
  recordChangedOn?: string;
  recordChange?: string; // "Staging changed"
  diagnoses: Diagnosis[];
  biomarkers: Biomarker[];
  priorTherapies: PriorTherapy[];
  labs: Lab[];
  followers: UserId[];
  /** Interest List, in the patient's order of choice (max 3) */
  queue: QueueEntry[];
  watches: Watch[];
  /** added to Thursday's review without anything queued */
  addedToReviewBy?: UserId;
  /** enrolled or screening on a trial outside this demo's four */
  elsewhere?: { trial: string; step: 'On study' | 'Screening'; upn?: string; since: string };
}

// ── Trials and openings ─────────────────────────────────────────────────

export interface ExternalHold {
  label: string; // "Enrolled Sep 2" | "Ibarra, R. in screening"
  kind: 'enrolled' | 'screening';
  /** a slot that may come back on this date (screen fail window) */
  mayReturnOn?: string;
  returnNote?: string;
}

export interface Opening {
  id: string;
  trialId: string;
  path: string[]; // ['Part 2', 'Cohort A', 'Arm A2'] (empty for a whole-trial opening)
  population: string; // one line, clinician wording
  slotsTotal: number; // site allocation for this opening
  externalHolds: ExternalHold[]; // patients outside the demo who hold slots
  state: 'open' | 'on_hold';
  opensOn?: string; // on hold with a date
  criteriaEntered: boolean; // full eligibility criteria entered (board 14)
}

export interface Trial {
  id: string;
  short: string; // "SOLVE-Lung 3"
  nct: string;
  title: string;
  phase: string; // "Phase 2"
  design: string; // "Single arm · open-label"
  randomized?: string; // "1:1" → one row in Trial Options (board 03)
  sponsor: string;
  summary: string;
  pi: UserId;
  openings: Opening[];
}

// ── Meeting board: pairings, steps, snapshot ────────────────────────────

export type StepKind =
  | 'accepted'
  | 'consent_call'
  | 'prescreen_labs'
  | 'prescreening_opens'
  | 'review_results';

export interface Step {
  id: string;
  kind: StepKind;
  label: string; // "Consent call"
  assignee?: UserId;
  due?: string; // ISO date
  dueText?: string; // "after consent" | "automatic"
  doneAt?: string; // ISO datetime
  doneBy?: UserId;
  auto?: boolean;
}

export interface TrailEntry {
  at: string; // ISO datetime
  by?: UserId;
  text: string;
}

export type DismissReason = 'patient_declined' | 'not_a_fit' | 'wrong_timing' | 'other';

export interface Pairing {
  id: string;
  patientId: string;
  openingId: string;
  status: 'accepted' | 'pre_screening' | 'dismissed';
  choice: number; // 1 = the patient's first choice
  decidedAt: string;
  decidedBy: UserId;
  dismissReason?: DismissReason;
  dismissNote?: string;
  /** accepted: the slot returns if consent is not reached by this date */
  holdUntil?: string;
  steps: Step[];
  trail: TrailEntry[];
}

export interface Snapshot {
  at: string; // ISO datetime
  by: UserId;
  proposals: { patientId: string; openingId: string }[];
}

export interface ActivityEntry {
  id: string;
  patientId: string;
  at: string; // ISO datetime
  by?: UserId;
  verb: string; // "STATUS CHANGED" — rendered in caps, logs format
  text: string;
}

// ── Demo settings and feedback ──────────────────────────────────────────

export type BoardNames = 'full' | 'meeting' | 'masked';

export interface Settings {
  viewingAs: UserId;
  /** Profile › Privacy "Always show patient PII" (board 02: keep as is) */
  showPii: boolean;
  /** A9: names on the meeting board */
  boardNames: BoardNames;
  showDesignNotes: boolean;
  themeMode: 'light' | 'dark';
}

export interface FeedbackAnswer {
  choice?: string;
  note?: string;
}

export interface DemoState {
  version: number;
  /** real time (ms) the demo clock started; demo time = DEMO_START + elapsed */
  clockStartedAt: number;
  patients: Patient[];
  trials: Trial[];
  pairings: Pairing[];
  snapshot: Snapshot;
  previousSnapshotAt?: string;
  activity: ActivityEntry[];
  settings: Settings;
  feedback: Record<string, FeedbackAnswer>;
}
