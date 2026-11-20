# Patient Slot Review demo

A clickable prototype of the proposed SphinxMatch **Patient pages** and the **Patient Slot Review** board for the Thursday New Patient Meeting. It stands alone: no backend, no SphinxMatch code paths, invented test data. It exists to get clinician feedback before any of it is built into the app.

It implements the "after" side of the canvas *Patient Pages Before and After*:

| Canvas page | Boards | Where in the demo |
|---|---|---|
| Patient pages | 01, 05, 02 | Patients › My Patients / All Patients |
| Patient pages | 06, 07, 12, 09, 11 | Patient chart › header and Patient Profile |
| Patient pages | 03, 08, 13, 14, 10, 04 | Patient chart › Trial Options |
| Slot Allocation | A1 to A10 | Patient Slot Review (folded into the board) |
| Slot Allocation | SR1 to SR4 | Patient Slot Review |
| Added Nov 18 | SR5 to SR7 | Patient Slot Review: drag to a slot, lists that narrow to the selection, View (Cards, Compact, List, Matrix) |
| Added Nov 20 | SR8, SR9 | Patient Slot Review: a patient and a slot selected at once; the app's optimizer |
| Added Nov 20 | SR10 | Patient Slot Review: revert an accepted or placed slot after its steps are assigned |

Turn on **Design notes** (top bar) to see each board's number next to the part of the screen it changed, with what it looked like before.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Builds:

```bash
npm run build           # static site in dist/ (GitHub Pages, Vercel, any static host)
npm run build:single    # one self-contained file: dist-single/index.html (opens from disk, can be emailed)
npm run build:artifact  # same, shaped for a claude.ai artifact: artifact/patient-slot-review.html
npm run build:pages     # the one-file build behind a password: dist-pages/index.html (see below)
```

Everything you click is saved in your browser. **Settings (sliders icon) › Reset demo** goes back to the 8:14 AM meeting snapshot. Answers to *Questions for you* survive a reset.

## The demo world

- **Thursday, Nov 12, 2026**, the Thursday New Patient Meeting at *Demo Cancer Center*. Every date reads relative to that morning.
- **Team** (switch with *Viewing as*): Dr. Anika Patel (PI), Dr. Sean Brennan (physician), Maya Reyes (CRC), Luis Tran (research RN).
- **3 trials (Trial A, B and C), 3 cohorts each.** Only Cohort 1 is open, with 1 slot. Cohorts 2 and 3 are on hold with no date.
  - Trial A › Cohort 1: any NSCLC after chemo-immunotherapy.
  - Trial B › Cohort 1: non-squamous NSCLC without EGFR or ALK alterations, after chemo-immunotherapy.
  - Trial C › Cohort 1: KRAS G12C NSCLC after chemo-immunotherapy. Trial C is the only trial that needs KRAS G12C.
- **3 patients, all NSCLC after chemo-immunotherapy**, all in Thursday's review. Their stage, biomarkers and prior lines decide every match.
  - *Priya Nair*, no mutations, is queued for Trial A (Oct 1).
  - *Marcus Bell*, KRAS G12C, is queued for Trials A, B and C (Oct 14).
  - *Eleanor Hughes*, no mutations, is queued for Trial B (Oct 21).
- **Who blocks whom.** Only Bell fits Trial C, so the plan seats all three: Bell in C, Nair in A, Hughes in B. Moving Bell to A blocks Nair; moving him to B blocks Hughes.

### What is simplified

- **The optimizer is the app's.** `src/domain/optimizer.ts` ports SphinxMatch's solver (`@shared/utils` `optimizeAssignments`, run by the worker's `optimize_assignments`), the same model as the matching playground's "v2 · Trial interest" tab:
  - The Interest List is a set, not a ranking. Every queued slot the patient fits (eligible or pending review) counts the same, so the plan is the one that **seats the most patients**.
  - **Pool seniority breaks ties, and only ties**: whoever entered the pool first (the earliest queue date among the slots they fit).
  - **Next in line** for an opening comes from the app's backfill re-solve: take one proposed patient out of the trial, re-solve, and see who gets a slot. The app keeps whoever lands in that exact seat; with several identical slots in one opening that can be a patient already proposed there, so the board reads it per opening.
  - Accepted and pre-screening pairings keep their slots and take the patient out of the pool, as a committed offer does in the app.
- **Where the demo still differs from the app** (each is a question under *Questions for you*):
  - A dismissed pairing stays out until the team undoes it. In the app a dismissal only closes that proposal, so the next run may propose it again.
  - Seniority is the queue date. The app reads it from `matched_at`, which the matcher overwrites on every re-match, so a re-check resets a patient's place. The playground also moves a patient who declines to the back for ties; neither the app nor the demo does.
- The board re-plans live as you accept, dismiss or queue. **Run optimizer** saves a new meeting snapshot so "new since snapshot" resets.
- The matcher is a handful of readable checks per opening (`src/domain/matching.ts`), not the real engine.

## A 10-minute walkthrough

Start from a reset. Viewing as Dr. Patel.

1. **The board (SR1).** Patient Slot Review opens on the 8:14 AM snapshot. Tiles: 3 patients in review, 3 slots open now, 0 opening soon (the 6 cohorts on hold have no date), 0 patients blocked: the plan seats everyone.
2. **Why this slot (SR2, A5, SR9).** Click *Bell, Marcus*. Slots narrows to his possible slots: Trial C › Cohort 1 under Optimizer proposed slot, Trials A and B under Queued for Optimized Match. His proposal card says what each alternative would cost: "placing Bell, Marcus there instead leaves Nair, Priya without a slot" for Trial A, and Hughes, Eleanor for Trial B. Only he fits Trial C, so the plan puts him there.
3. **A patient and a slot together (SR2, A3, SR8).** With Bell still selected, click *Trial A › Cohort 1* in his list. It opens in place and Slots stays narrowed to him. Patients narrows to Trial A › Cohort 1: Nair under Optimizer proposed patient, Bell under Also queued for Optimized Match. The bar above the board shows both selections; the × on each clears just that one, and Esc clears both.
4. **Block Nair or Hughes (SR5).** Clear the selection (Esc) and drag *Bell, Marcus* by his card (say his patient prefers Trial A). On pickup, Slots narrows to the openings that fit him, each outlined. Hover one and the label under the pointer says what letting go will do. Drop him on Trial A › Cohort 1. He is proposed for Trial C, so it is **Place by hand**. The dialog shows the cost in patients: his Trial C proposal is released, and Nair loses her Trial A proposal and is blocked. Pick a reason (Clinical urgency, Patient preference, PI decision, Other) and place him. Blocked now shows Nair with "No open slot in the opening", and Trial B as open and a fit for her, though she isn't queued for it. Click **Undo** on the toast.
   - Drop him on Trial B › Cohort 1 instead and Hughes is the one blocked.
   - Without a mouse, select Bell and use **Place here…** under a slot.
5. **Dismiss with a reason (A6).** Tracking › *Bell, Marcus* › Dismiss… › Patient declined. No one else fits Trial C, so the toast says no one is waiting for it. The plan moves Bell to Trial B, because he entered the pool before Hughes (Oct 14; Hughes Oct 21). Hughes becomes next in line there, and Blocked goes to 1. The header counts the dismissal. Click **Undo** on the toast before going on.
6. **Accept and assign (SR3).** Accept *Bell*: the consent call goes to Maya R. (due Fri Nov 13), pre-screen labs to Luis T. after consent. The slot is held 7 days for consent (until Nov 19), so Slots › Near future shows it as a slot that may come back, next to the six cohorts on hold.
7. **The team after the meeting (SR3).** *Viewing as* Maya R., then *Assigned to: Me*: Bell's consent call. Expand his *Steps and trail* and mark the call done. His labs step goes to Luis T. with a due date, and his "slot back Nov 19 without consent" line leaves Near future. **Undo** next to the call (or on the toast) puts all of that back; only the latest step done can be undone.
8. **Revert after Accept (SR10).** Switch *Viewing as* back to Dr. Patel. Tracking › *Bell, Marcus* › **Revert…**. The dialog shows what is already done (the consent call) and which open steps it cancels (pre-screen labs, Luis T.), then asks what happens to Bell. *Back to the optimizer*: he is proposed for Trial C again. *Release and dismiss* with a reason: he is proposed for Trial B instead, because he entered the pool before Hughes, and Hughes becomes next in line. **Undo** on the toast puts the accepted slot and its steps back. Revert also works on a placement by hand: place Bell in Trial A as in step 4, then **Revert…** gives Nair her slot back. In Matrix, **Revert…** is on the accepted cell.
9. **Names on a shared screen (A9).** Switch Names to *Meeting*: "Priya N." and the last four of the MRN.
10. **Lists narrow, and the View switch (SR6, SR7, SR8).**
    - Select a patient: Slots and Optimizer decisions show only what applies to them, grouped (Optimizer proposed slot, Queued for Optimized Match, Also fits, not queued).
    - Select a slot: Patients shows who holds it, its proposals, who is next in line and who else is queued.
    - **Show all** brings the rest back, dimmed.
    - **View** above the board switches between Cards, Compact, List and Matrix. In Compact and List the selected patient opens as a full card. In Matrix every cell is one patient and one slot, both selections narrow it, and clicking a cell offers Accept, Dismiss, Place by hand or Queue.
11. **Patients (01, 05).** Patients › My Patients, grouped by what needs Dr. Patel: Nair and Bell in today's review, each with their proposal. Hughes follows Dr. Brennan; switch *Viewing as* to see her.
12. **Profile (12, 09).** Open a patient › Profile. Update staging asks "new restaging or fix a mistake" and defaults the date accordingly. Labs are shown against their reference range.
13. **Questions for you.** The open decisions, each with where to look. Copy answers puts them on the clipboard.

## Publish to GitHub Pages, behind a password

`npm run build:pages` builds the one-file demo and encrypts it (AES-256-GCM, key from the password with PBKDF2-SHA256, 600,000 iterations) into `dist-pages/index.html`, a small password page. The demo's text, data and code are not readable in the published file until the password is entered; the browser decrypts it and swaps the page in. "Remember on this device" keeps the key in that browser for this build; open the page with `?lock` to forget it.

- **Password:** `DEMO_PASSWORD` in the environment, or a `DEMO_PASSWORD=...` line in `.env.local` (git-ignored). At least 10 characters; four random words is a good shape. Never commit it.
- **Deploy:** `.github/workflows/pages.yml` runs only when started by hand. Once: add the repository secret `DEMO_PASSWORD` (Settings › Secrets and variables › Actions) and set Settings › Pages › Source to **GitHub Actions**. Then Actions › Deploy to GitHub Pages › Run workflow.
- **To change or revoke the password,** change the secret and run the workflow again.
- **Limits:** this is light protection for a prototype with invented data. Anyone with the link can download the encrypted file and try passwords offline, so a short or reused password can be guessed. Pages from a private repository need a paid GitHub plan; if the repository is public, the source (and so the demo) is readable on GitHub whatever the page password.

## Code map

```
src/domain/      types, seed data, matcher, board derivations, optimizer.ts (the app's solver), dates, names
src/state/       one store: state, memoized board, actions (persisted to localStorage)
src/components/  app shell, status chips and tones, toast
src/notes/       Design notes (canvas board numbers with before/after text)
src/feedback/    Questions for you
src/pages/patients/     Patients list and patient chart
src/pages/slot-review/  Patient Slot Review board (dnd.tsx: drag to a slot; reduce.ts: narrowing; MatrixView.tsx; BoardActions.tsx: the shared dialogs)
scripts/                artifact and GitHub Pages builds (encrypt-pages.mjs: the password gate)
src/theme.ts     copied from @app/client so the demo looks like SphinxMatch
```

Porting notes for later: `src/domain/optimizer.ts` is a copy of the app's solver, so proposals match what the worker would store for the same pool. The board derivations in `src/domain/board.ts` map onto `get_assignment_recommendations`, `get_allocation_decisions`, `get_matching_pool` and `get_watchlist`; accept and dismiss onto `accept_` / `reject_assignment_recommendation` (dismiss already takes `p_memo`). The steps after Accept (SR3) need a new table and RPCs.
