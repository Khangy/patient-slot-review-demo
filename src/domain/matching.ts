import type { CancerType, Clinical, Patient, Trial, Opening } from './types';

// A small, explainable matcher. Each opening has a handful of checks; each check reads the
// patient's clinical facts and says met / not met / unknown, with the evidence shown in
// Trial Options › "Why this match" (board 03). The real engine is out of scope.

export type CheckOutcome = 'met' | 'not_met' | 'unknown';

export interface CheckResult {
  label: string; // "Stage"
  trialWants: string; // "Stage IV"
  patientHas: string; // "Stage IIIC"
  outcome: CheckOutcome;
  isStage?: boolean;
}

export type MatchResult = 'eligible' | 'pending_review' | 'needs_status_change' | 'not_eligible';

export interface Match {
  openingId: string;
  trialId: string;
  result: MatchResult;
  checks: CheckResult[];
  /** needs_status_change: what the record has to reach, e.g. "Stage IV" */
  needs?: string;
  /** pending_review: what is missing, e.g. "ALK result" */
  missing?: string[];
}

interface Criterion {
  label: string;
  wants: string;
  isStage?: boolean;
  check: (c: Clinical) => { outcome: CheckOutcome; has: string };
}

// ── Building blocks ─────────────────────────────────────────────────────

const CANCER_LABEL: Record<CancerType, string> = {
  NSCLC: 'NSCLC',
  Breast: 'Breast cancer',
  Colorectal: 'Colorectal cancer',
  Pancreatic: 'Pancreatic cancer',
  Ovarian: 'Ovarian cancer',
};

export function diagnosisLabel(c: Clinical): string {
  const base = CANCER_LABEL[c.cancer];
  return c.histology ? `${base}, ${c.histology}` : base;
}

const yes = (has: string) => ({ outcome: 'met' as const, has });
const no = (has: string) => ({ outcome: 'not_met' as const, has });
const unknown = (has: string) => ({ outcome: 'unknown' as const, has });

const cancerIn = (types: CancerType[], wants?: string): Criterion => ({
  label: 'Diagnosis',
  wants: wants ?? types.map((t) => CANCER_LABEL[t]).join(' or '),
  check: (c) => (types.includes(c.cancer) ? yes(diagnosisLabel(c)) : no(diagnosisLabel(c))),
});

const anySolidTumor: Criterion = {
  label: 'Diagnosis',
  wants: 'Advanced solid tumor',
  check: (c) => yes(diagnosisLabel(c)),
};

export function stageBase(stage?: string): string | undefined {
  return stage?.match(/^(IV|III|II|I)/)?.[1];
}

const stageIn = (groups: ('II' | 'III' | 'IV')[]): Criterion => {
  const wants = groups.length === 1 ? `Stage ${groups[0]}` : `Stage ${groups[0]}–${groups[groups.length - 1]}`;
  return {
    label: 'Stage',
    wants,
    isStage: true,
    check: (c) => {
      if (!c.stage) return unknown('not staged yet');
      const base = stageBase(c.stage);
      return base && groups.includes(base as 'II' | 'III' | 'IV') ? yes(`Stage ${c.stage}`) : no(`Stage ${c.stage}`);
    },
  };
};

const histologyIs = (kind: 'squamous' | 'non-squamous'): Criterion => ({
  label: 'Histology',
  wants: kind === 'squamous' ? 'Squamous' : 'Non-squamous',
  check: (c) => {
    if (!c.histology) return unknown('not recorded');
    const isSq = c.histology === 'squamous';
    const has = c.histology === 'squamous' ? 'Squamous' : `Non-squamous (${c.histology})`;
    return (kind === 'squamous') === isSq ? yes(has) : no(has);
  },
});

/** Cancers where KRAS is part of routine molecular testing. Elsewhere "not tested" is not a fit. */
const KRAS_ROUTINE: CancerType[] = ['NSCLC', 'Colorectal', 'Pancreatic'];

const krasG12C: Criterion = {
  label: 'KRAS',
  wants: 'G12C mutation',
  check: (c) => {
    if (!c.kras) return KRAS_ROUTINE.includes(c.cancer) ? unknown('not tested') : no(`not tested (not routine for ${CANCER_LABEL[c.cancer].toLowerCase()})`);
    return c.kras === 'G12C' ? yes('G12C detected') : no(c.kras === 'wild-type' ? 'wild-type' : `${c.kras}, not G12C`);
  },
};

const noEgfrAlk: Criterion = {
  label: 'EGFR / ALK',
  wants: 'No EGFR or ALK alteration',
  check: (c) => {
    if (c.egfr === 'mutant') return no('EGFR mutant');
    if (c.alk === 'rearranged') return no('ALK rearranged');
    if (!c.egfr || !c.alk) {
      const missing = [!c.egfr && 'EGFR', !c.alk && 'ALK'].filter(Boolean).join(' and ');
      return unknown(`${missing} result not in the record`);
    }
    return yes('EGFR wild-type, ALK negative');
  },
};

const pdl1AtLeast = (pct: number): Criterion => ({
  label: 'PD-L1',
  wants: `TPS ≥${pct}%`,
  check: (c) => (c.pdl1 === undefined ? unknown('not tested') : c.pdl1 >= pct ? yes(`TPS ${c.pdl1}%`) : no(`TPS ${c.pdl1}%`)),
});

const firstLine: Criterion = {
  label: 'Line of therapy',
  wants: 'First line for metastatic disease',
  check: (c) => (c.firstLine ? yes('no treatment for metastatic disease yet') : no('already treated for metastatic disease')),
};

const afterPlatinumIO: Criterion = {
  label: 'Prior therapy',
  wants: 'After platinum chemo and a PD-(L)1 inhibitor',
  check: (c) =>
    c.afterPlatinumIO
      ? yes('progressed after platinum + PD-(L)1')
      : no(c.firstLine ? 'no treatment for metastatic disease yet' : 'not after platinum + PD-(L)1'),
};

const afterStandardCrc: Criterion = {
  label: 'Prior therapy',
  wants: 'After fluoropyrimidine, oxaliplatin and irinotecan',
  check: (c) => (c.afterStandardCrc ? yes('progressed after FOLFOX and FOLFIRI') : no('standard lines not completed')),
};

const afterStandardTherapy: Criterion = {
  label: 'Prior therapy',
  wants: 'After standard therapy for the disease',
  check: (c) => {
    if (c.afterPlatinumIO) return yes('progressed after platinum + PD-(L)1');
    if (c.afterStandardCrc) return yes('progressed after FOLFOX and FOLFIRI');
    if (c.afterEndocrineCdk) return yes('progressed after endocrine therapy + CDK4/6 inhibitor');
    return no('standard therapy not completed');
  },
};

const hrPosHer2Neg: Criterion = {
  label: 'HR / HER2',
  wants: 'HR-positive, HER2-negative (0 or low)',
  check: (c) => {
    if (!c.hr || !c.her2) return unknown('receptor status not in the record');
    const has = `HR${c.hr === 'positive' ? '+' : '−'}, HER2-${c.her2 === 'positive' ? 'positive' : c.her2 === 'low' ? 'low' : '0'}`;
    return c.hr === 'positive' && c.her2 !== 'positive' ? yes(has) : no(has);
  },
};

/** Breast must be HR+/HER2-negative; other cancers pass. */
const breastSubtypeIfBreast: Criterion = {
  label: 'Subtype',
  wants: 'Breast: HR-positive, HER2-negative',
  check: (c) => (c.cancer === 'Breast' ? hrPosHer2Neg.check(c) : yes('not breast (no subtype rule)')),
};

const afterEndocrineCdk: Criterion = {
  label: 'Prior therapy',
  wants: 'After endocrine therapy + a CDK4/6 inhibitor',
  check: (c) => (c.afterEndocrineCdk ? yes('progressed on endocrine + CDK4/6 inhibitor') : no('no CDK4/6 inhibitor yet')),
};

const noPriorTopoAdc: Criterion = {
  label: 'Prior ADC',
  wants: 'No prior topoisomerase-I ADC',
  check: (c) => (c.priorTopoAdc ? no('prior topoisomerase-I ADC') : yes('none')),
};

const priorTopoAdc: Criterion = {
  label: 'Prior ADC',
  wants: 'After a topoisomerase-I ADC (T-DXd or sacituzumab)',
  check: (c) => (c.priorTopoAdc ? yes('prior topoisomerase-I ADC') : no('none')),
};

const resectedCtdna: Criterion = {
  label: 'ctDNA',
  wants: 'Detected after complete resection',
  check: (c) => {
    if (!c.resected) return no('not resected');
    if (!c.ctdna) return unknown('post-op ctDNA not in the record');
    return c.ctdna === 'detected' ? yes('detected after resection') : no('not detected');
  },
};

// ── Criteria per opening ────────────────────────────────────────────────

export const CRITERIA: Record<string, Criterion[]> = {
  'a-1': [cancerIn(['NSCLC']), stageIn(['IV']), afterPlatinumIO],
  'a-2': [cancerIn(['NSCLC']), stageIn(['IV']), pdl1AtLeast(50), afterPlatinumIO],
  'a-3': [cancerIn(['NSCLC']), stageIn(['IV']), firstLine],
  'b-1': [cancerIn(['NSCLC']), stageIn(['IV']), histologyIs('non-squamous'), noEgfrAlk, afterPlatinumIO],
  'b-2': [cancerIn(['NSCLC']), stageIn(['IV']), histologyIs('squamous'), afterPlatinumIO],
  'b-3': [cancerIn(['NSCLC']), stageIn(['IV']), histologyIs('non-squamous'), noEgfrAlk, firstLine],
  'c-1': [cancerIn(['NSCLC']), stageIn(['IV']), krasG12C, afterPlatinumIO],
  'c-2': [cancerIn(['NSCLC']), stageIn(['IV']), krasG12C, firstLine, pdl1AtLeast(1)],
  'c-3': [anySolidTumor, stageIn(['IV']), krasG12C, afterStandardTherapy],
  // earlier seeds' openings (SLV-417, SOLVE-Lung 3, SPX-201, ctDNA-Guided Adjuvant Colon)
  'slv-dl3': [anySolidTumor, stageIn(['IV']), krasG12C, afterStandardTherapy],
  'slv-a': [cancerIn(['NSCLC']), stageIn(['IV']), krasG12C, afterPlatinumIO],
  'slv-b': [cancerIn(['NSCLC']), stageIn(['IV']), krasG12C, firstLine, pdl1AtLeast(1)],
  'slv-c': [cancerIn(['Colorectal']), stageIn(['IV']), krasG12C, afterStandardCrc],
  'solve-a': [cancerIn(['NSCLC']), stageIn(['IV']), histologyIs('non-squamous'), noEgfrAlk, afterPlatinumIO],
  'solve-b': [cancerIn(['NSCLC']), stageIn(['IV']), histologyIs('squamous'), afterPlatinumIO],
  'spx-dl2': [cancerIn(['Breast', 'NSCLC']), stageIn(['IV']), breastSubtypeIfBreast, afterStandardTherapy, noPriorTopoAdc],
  'spx-a1': [cancerIn(['Breast']), stageIn(['IV']), hrPosHer2Neg, afterEndocrineCdk, priorTopoAdc],
  'spx-a2': [cancerIn(['Breast']), stageIn(['IV']), hrPosHer2Neg, afterEndocrineCdk, noPriorTopoAdc],
  'spx-b': [cancerIn(['NSCLC']), stageIn(['IV']), afterPlatinumIO],
  'ctdna-all': [cancerIn(['Colorectal'], 'Colon cancer'), stageIn(['II', 'III']), resectedCtdna],
};

/** The facts the last match run used (board 13: stale until re-checked). */
export function matchedClinical(p: Patient): Clinical {
  return { ...p.clinical, ...(p.matchBasis ?? {}) };
}

export function matchOpening(clinical: Clinical, opening: Opening): Match {
  const criteria = CRITERIA[opening.id] ?? [];
  const checks: CheckResult[] = criteria.map((cr) => {
    const r = cr.check(clinical);
    return { label: cr.label, trialWants: cr.wants, patientHas: r.has, outcome: r.outcome, isStage: cr.isStage };
  });
  const notMet = checks.filter((c) => c.outcome === 'not_met');
  const unknowns = checks.filter((c) => c.outcome === 'unknown');
  let result: MatchResult;
  let needs: string | undefined;
  if (notMet.length === 0 && unknowns.length === 0) result = 'eligible';
  else if (notMet.length === 0) result = 'pending_review';
  else if (notMet.every((c) => c.isStage)) {
    result = 'needs_status_change';
    needs = notMet[0].trialWants;
  } else result = 'not_eligible';
  return {
    openingId: opening.id,
    trialId: opening.trialId,
    result,
    checks,
    needs,
    missing: unknowns.length ? unknowns.map((u) => u.patientHas) : undefined,
  };
}

export function matchPatient(p: Patient, trials: Trial[]): Match[] {
  const clinical = matchedClinical(p);
  return trials.flatMap((t) => t.openings.map((o) => matchOpening(clinical, o)));
}

export const isFit = (m?: Match) => m?.result === 'eligible' || m?.result === 'pending_review';
