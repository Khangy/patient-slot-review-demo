// The SphinxMatch optimizer, ported from the app so the demo proposes what the app would.
//
// Source of truth: sphinxmatch @shared/utils/src/optimizer.mts (Hungarian solver, pool
// seniority tie-break, per-seat backfill) and @app/worker/src/tasks/optimize_assignments.mts
// (flat scoring, two backfill candidates per seat, backfill bans across the whole trial).
// The matching playground's "v2 · Trial interest" tab runs the same model.
//
// The model, in the app's words:
// - Interest is SET MEMBERSHIP, not a ranked list. Every pairing the patient is queued for and
//   fits scores exactly 1, everything else 0, so the solver maximizes FILL: the plan that seats
//   the most patients.
// - Pool seniority (who entered the pool first) breaks ties, and only ties. It is a tiny cost
//   epsilon that can never outweigh one more seated patient.
// - Backfill answers "if this offer falls through, who takes the seat?" by re-solving with the
//   occupant (then each backfill found) banned from that trial, so cascades are priced for real.
//
// Left out: per-patient alternates (the app's worker asks for none) and the score threshold
// (flat scores are always 1).

export interface Recommendation {
  patientIdx: number;
  slotIdx: number;
  /** 1 = proposed; 2, 3 = next in line for that seat if the offer falls through */
  rank: number;
}

export interface OptimizeInput {
  /** fits[patient][slot]: queued and a fit, so a pairing the solver may propose */
  fits: boolean[][];
  /** per patient, lower = entered the pool earlier (epoch ms); breaks ties only */
  seniority: number[];
  /** per slot, the trial it belongs to: a fall-through takes the patient out of the whole trial */
  slotGroups: string[];
  /** next-in-line candidates per proposed seat (the app uses 2) */
  backfillPerSlot: number;
}

export interface OptimizeOutput {
  primary: Recommendation[];
  backfill: Recommendation[];
}

/** Scores are stored as numeric(5,4) in the app, so a bonus under 5e-5 only ever decides ties. */
const SENIORITY_EPS = 1e-5;

/** Patients kept out of one trial for a counterfactual ("if this offer falls through"). */
export interface Ban {
  banned: Set<number>;
  group: string;
}

/**
 * The solver over one pool: solve() returns, per patient, the slot index the optimum seats
 * them in (-1: none). With a ban, the banned patients may not take any slot of that trial.
 */
export function makeSolver(input: Omit<OptimizeInput, 'backfillPerSlot'>): (ban?: Ban) => number[] {
  const { fits, seniority, slotGroups } = input;
  const nP = fits.length;
  const nS = slotGroups.length;
  if (nP === 0 || nS === 0) return () => new Array<number>(nP).fill(-1);

  // earlier pool entry = larger bonus = lower cost; equal seniority = no bonus
  const bonus = new Array<number>(nP).fill(0);
  const min = Math.min(...seniority);
  const span = Math.max(...seniority) - min;
  if (span > 0) for (let i = 0; i < nP; i++) bonus[i] = (1 - (seniority[i] - min) / span) * SENIORITY_EPS;

  // square cost matrix; dummy rows and columns cost 1 (score 0), like a pairing that is not one
  const n = Math.max(nP, nS);
  const buildCost = (ban?: Ban): number[][] =>
    Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i >= nP || j >= nS) return 1;
        if (ban && ban.banned.has(i) && slotGroups[j] === ban.group) return 1;
        return 1 - (fits[i][j] ? 1 : 0) - bonus[i];
      }),
    );

  return (ban) => {
    const a = hungarian(buildCost(ban));
    return Array.from({ length: nP }, (_, i) => {
      const j = a[i];
      return j >= 0 && j < nS && fits[i][j] && !(ban && ban.banned.has(i) && slotGroups[j] === ban.group) ? j : -1;
    });
  };
}

/** The app's optimizeAssignments: proposals plus per-seat backfill, as the worker stores them. */
export function optimizeAssignments(input: OptimizeInput): OptimizeOutput {
  const { slotGroups, backfillPerSlot } = input;
  const solve = makeSolver(input);
  const assignment = solve();
  const primary: Recommendation[] = [];
  assignment.forEach((j, i) => {
    if (j >= 0) primary.push({ patientIdx: i, slotIdx: j, rank: 1 });
  });

  // For each proposed seat: ban its occupant from the trial and re-solve; whoever the new
  // optimum puts in THIS seat is next in line. Then ban them too, for the one after.
  const backfill: Recommendation[] = [];
  for (const rec of primary) {
    const j = rec.slotIdx;
    const banned = new Set<number>([rec.patientIdx]);
    for (let k = 0; k < backfillPerSlot; k++) {
      const cf = solve({ banned, group: slotGroups[j] });
      const next = cf.findIndex((sj, i) => sj === j && !banned.has(i));
      if (next < 0) break;
      backfill.push({ patientIdx: next, slotIdx: j, rank: k + 2 });
      banned.add(next);
    }
  }
  return { primary, backfill };
}

/**
 * Kuhn-Munkres (Hungarian) with potentials, O(n³), on a square cost matrix. Returns
 * assignment[row] = column. A line-for-line copy of the app's `hungarian`.
 */
export function hungarian(cost: number[][]): number[] {
  const n = cost.length;
  if (n === 0) return [];
  const INF = Number.POSITIVE_INFINITY;
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(n + 1).fill(0);
  const p = new Array<number>(n + 1).fill(0);
  const way = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(n + 1).fill(INF);
    const used = new Array<boolean>(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = -1;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array<number>(n).fill(-1);
  for (let j = 1; j <= n; j++) if (p[j] > 0) assignment[p[j] - 1] = j - 1;
  return assignment;
}
