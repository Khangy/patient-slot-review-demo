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
- **Trials**: SLV-417 (KRAS G12C, dose escalation and expansion), SOLVE-Lung 3 (previously treated NSCLC, arms by histology), SPX-201 (HER3 ADC: breast after or without a prior topo-I ADC, NSCLC cohort opening Dec 1), ctDNA-Guided Adjuvant Colon (randomized, whole trial).
- **26 patients**, 20 of them in Thursday's review. Their diagnoses, stage, biomarkers and prior lines decide every match, so a breast patient never "fits" a KRAS G12C lung cohort.

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

1. **The board (SR1).** Patient Slot Review opens on the 8:14 AM snapshot. Tiles: 20 patients in review, 38 slots open now, 6 opening soon (plus one cohort on hold with no date), 3 patients blocked.
2. **Select a patient, and why this slot (SR2, A5, SR9).** Click *Rossi, Elena*. Slots narrows to her four possible slots (proposed, on her queue, also fits), and Optimizer decisions to her proposal: SLV-417 › Cohort A. She is queued for SOLVE-Lung 3 › Arm A too, and the card says why not there: "placing Rossi, Elena there instead leaves Siddiqui, Bilal without a slot." The Interest List is a set, as in the app, so the plan seats all four patients who want Arm A or Cohort A.
3. **A patient and a slot together (SR2, A3, SR8).** With Rossi still selected, click *SOLVE-Lung 3 › Arm A* in her list. It opens in place and Slots stays narrowed to her; Patients narrows to Arm A: Petrova, Mendoza and Siddiqui proposed, Okafor (accepted at SLV-417 last week) and Rossi placed elsewhere. The bar above the board shows both; the × on each clears just that one, Esc clears both.
4. **Blocked, with the real reason (SR4, A4, A7).** Optimizer decisions › Blocked:
   - Morgan is next in line for SPX-201 › Arm A2: its 4 open slots are proposed to patients who entered the pool earlier. SPX-201 › Dose Level 2 is open and fits her, and she is not queued for it (**Queue** would propose her there).
   - Alvarez fits only SPX-201 › Arm A1, which has no open slot; one may come back Nov 24.
   - Lindqvist was re-matched at Stage IIIC on Nov 6; SOLVE-Lung 3 needs Stage IV.
5. **Dismiss with a reason (A6).** Tracking › *Feldman, Ruth* › Dismiss… › Patient declined, note "prefers to stay local". The toast says Morgan is proposed for Arm A2 now (New since snapshot). Feldman moves to Blocked as "Dismissed by the team" with her reason, so Blocked stays at 3. The header counts the dismissal.
6. **Accept and assign (SR3).** Accept *Rossi*: the consent call goes to Maya R. (due Fri Nov 13), pre-screen labs to Luis T. after consent. The slot is held 7 days for consent (until Nov 19), so it appears in Near future as a slot that may come back.
7. **The team after the meeting (SR3).** *Viewing as* Maya R., then *Assigned to: Me*: her consent calls for Okafor and Rossi. Expand Okafor's *Steps and trail* (last week's voicemail and call-back notes are there) and mark his call done: his labs step goes to Luis T. with a due date, and his "slot back Nov 19 without consent" line leaves Near future.
8. **Near future (SR4).** Slots › Near future: Arm A1 may come back Nov 24 (Alvarez queued, Nguyen and Nair watching); SPX-201 › Cohort B opens Dec 1 (who fits and waits, or how many who fit are placed elsewhere now); SLV-417 › Cohort C is on hold with no date.
9. **Names on a shared screen (A9).** Switch Names to *Meeting*: "Samuel O." and the last four of the MRN.
10. **Drag a patient onto a slot (SR5).** Clear the selection (Esc) and drag *Rossi, Elena* by her card (say her patient prefers Arm A). On pickup, Slots narrows to the openings that fit her, each outlined; hover one and the label under the pointer says what letting go will do. Drop her on SOLVE-Lung 3 › Arm A: she is proposed for Cohort A, so it is **Place by hand**. The dialog shows the cost in patients (her Cohort A proposal is released; "Siddiqui, Bilal loses the proposal for SOLVE-Lung 3 › Arm A…"), asks why (Clinical urgency, Patient preference, PI decision, Other) and assigns the steps like Accept. Dropping a patient on the slot the optimizer proposed for them opens Accept; dropping one on a slot that cannot take them says why (Kowalski on a lung arm: "Not a fit: Colorectal cancer…"). Without a mouse, select the patient and use **Place here…** under a slot.
11. **Lists narrow, and the View switch (SR6, SR7, SR8).** Select a patient: Slots and Optimizer decisions show only what applies to them, grouped (Proposed, On their queue, Also fits); select a slot and Patients shows who holds it, its proposals, who is next in line and who else is queued. **Show all** brings the rest back, dimmed. **View** above the board switches between Cards, Compact, List and Matrix. In Compact and List the selected patient opens as a full card. In Matrix every cell is one patient and one slot, both selections narrow it, and clicking a cell offers Accept, Dismiss, Place by hand or Queue.
12. **Patients (01, 05).** Patients › My Patients, grouped by what needs Dr. Patel: Castillo (undeclared referral), Brooks (status changed to Stage IV), Whitfield (nothing queued), Lindqvist (no longer eligible), then Coming up and Nothing due.
13. **Triage to the board (07, 03).** Open *Castillo, Ana*: the header asks whether she is looking for a trial. Choose Seeking. Trial Options › SLV-417 › Cohort A shows *Why this match* line by line. Queue her, then open Patient Slot Review: she is proposed for Cohort A.
14. **Stale matches and watches (13, 10).** Open *Brooks, Lena*: Trial Options says her staging changed Nov 6, after the Nov 2 match. **Re-check now**: the SPX-201 openings move to Matches, and her watch reads STATUS CHANGED Stage IIA → IV. Keep… with a note, or Queue.
15. **Profile (12, 09).** Update staging asks "new restaging or fix a mistake" and defaults the date accordingly. Labs flag HIGH and LOW against a reference range.
16. **Questions for you.** The open decisions, each with where to look. Copy answers puts them on the clipboard.

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
