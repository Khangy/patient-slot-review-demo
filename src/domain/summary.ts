import type { Diagnosis, Patient } from './types';

// Short clinical summaries used by list rows, board cards and the snapshot header.

/** Board 06: the starred diagnosis, else the only one. Undefined when several and none starred. */
export function primaryDiagnosis(p: Patient): Diagnosis | undefined {
  return p.diagnoses.find((d) => d.primary) ?? (p.diagnoses.length === 1 ? p.diagnoses[0] : undefined);
}

export function stageLabel(p: Patient): string {
  return p.clinical.stage ? `Stage ${p.clinical.stage}` : 'Not staged';
}

/** "NSCLC · Stage IVA" */
export function dxStage(p: Patient): string {
  const dx = primaryDiagnosis(p) ?? p.diagnoses[0];
  return `${dx?.short ?? p.clinical.cancer} · ${stageLabel(p)}`;
}

/** "Non-small cell lung cancer, adenocarcinoma · Stage IVA" for the snapshot header */
export function headerDiagnosis(p: Patient): string | undefined {
  const dx = primaryDiagnosis(p);
  return dx ? `${dx.label} · ${stageLabel(p)}` : undefined;
}

/** The one marker a clinician says out loud: "KRAS G12C", "HR+/HER2-low", "ctDNA detected" */
export function keyMarker(p: Patient): string | undefined {
  const c = p.clinical;
  if (c.cancer === 'Breast' && c.hr) {
    const her2 = c.her2 === 'positive' ? 'HER2+' : c.her2 === 'low' ? 'HER2-low' : 'HER2-0';
    return `HR${c.hr === 'positive' ? '+' : '−'}/${her2}${c.priorTopoAdc ? ' · prior ADC' : ''}`;
  }
  if (c.ctdna && c.resected) return `ctDNA ${c.ctdna} after resection`;
  if (c.kras === 'G12C') return 'KRAS G12C';
  if (c.egfr === 'mutant') return 'EGFR mutant';
  if (c.cancer === 'NSCLC' && c.histology === 'squamous') return `Squamous${c.pdl1 !== undefined ? ` · PD-L1 ${c.pdl1}%` : ''}`;
  if (c.pdl1 !== undefined) return `PD-L1 ${c.pdl1}%`;
  if (c.kras) return `KRAS ${c.kras}`;
  return undefined;
}

/** "after platinum + PD-(L)1" style line of therapy summary */
export function lineOfTherapy(p: Patient): string | undefined {
  const c = p.clinical;
  if (c.firstLine) return 'Untreated for metastatic disease';
  if (c.afterPlatinumIO) return 'After platinum chemo + PD-(L)1';
  if (c.afterStandardCrc) return 'After FOLFOX and FOLFIRI';
  if (c.afterEndocrineCdk) return c.priorTopoAdc ? 'After CDK4/6 and a topo-I ADC' : 'After endocrine + CDK4/6';
  if (c.resected) return 'Resected, adjuvant decision';
  return undefined;
}
