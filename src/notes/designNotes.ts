// One entry per board on the "Patient Pages Before and After" canvas. With Design notes on,
// a small badge sits next to the part of the screen each board changed; the badge opens
// this text. Tags follow the canvas: Small PR, Decision, Migration, Later, Keep as is.

export type NoteTag = 'Small PR' | 'Decision' | 'Migration' | 'Later' | 'Keep as is';

export interface DesignNoteEntry {
  id: string;
  title: string;
  area: 'Patient pages' | 'Slot Allocation' | 'Patient Slot Review' | 'Nov 10 feedback';
  tags: NoteTag[];
  before: string;
  after: string;
}

const N: DesignNoteEntry[] = [
  // ── Patient pages ──
  { id: '01', area: 'Patient pages', title: 'Two tabs, columns by job', tags: ['Migration'],
    before: 'Opened blank until you searched. Rows showed identity only (split name, age, UPN, Current Trial, mostly empty) across five tabs.',
    after: 'Two tabs. All Patients finds one patient: name with MRN, DOB, diagnosis and stage, status. My Patients keeps only what decides who to open next.' },
  { id: '05', area: 'Patient pages', title: 'My Patients by what needs you', tags: ['Migration'],
    before: 'Alphabetical. A status change, the event a watch exists for, was small grey print under a routine REVIEW DUE line.',
    after: 'Grouped: Needs you (waiting on a person today), Coming up (next two weeks), Nothing due. The event leads each row: verb, status, date.' },
  { id: '02', area: 'Patient pages', title: 'Name masking', tags: ['Keep as is'],
    before: 'Masked by default, revealed one patient at a time; the Profile switch "Always show patient PII" unmasks every screen.',
    after: 'Decided Nov 5: no change. In this demo the switch lives in the settings menu, on by default so the test data reads easily.' },
  { id: '06', area: 'Patient pages', title: 'Primary diagnosis', tags: ['Small PR'],
    before: 'The header showed "-" until someone starred a diagnosis, even when there was only one.',
    after: 'A lone diagnosis counts as primary. With several and none starred, the header asks you to choose.' },
  { id: '07', area: 'Patient pages', title: 'Triage in the header', tags: ['Small PR'],
    before: 'The only way to triage a new referral was Edit Demographics, then a status field below MRN and date of birth.',
    after: 'An undeclared patient opens with the question in the header. Afterwards the status chip is the control; Edit Demographics keeps MRN, DOB and contact.' },
  { id: '12', area: 'Patient pages', title: 'Staging date', tags: ['Small PR'],
    before: 'Editing a staging pre-filled last scan\'s date, so a restaging could be saved under the old date. A disabled Save never said what was missing.',
    after: 'The dialog asks what happened. A new restaging defaults to today and shows the previous date; a correction keeps it. Save says what is missing.' },
  { id: '09', area: 'Patient pages', title: 'Lab flags', tags: ['Later'],
    before: 'Hand-entered labs had no reference range, so they never flagged, and a flag did not say high or low.',
    after: 'Common labs get a default range, editable to the site\'s lab. Flagged rows say HIGH or LOW.' },
  { id: '03', area: 'Patient pages', title: 'Why this match', tags: ['Decision'],
    before: 'Evidence came only from the Pre-Screening Preview, which needs structured criteria; without them the pane showed a red error. Randomized arms showed as separate matches.',
    after: '"Why this match" always lists what the matcher checked against the record. A randomized trial is one row with its design.' },
  { id: '13', area: 'Patient pages', title: 'Stale matches', tags: ['Later'],
    before: 'A patient restaged to IV still read "needs Stage IV". The only refresh was a faint "re-run" link.',
    after: 'When the record changed after the last check, Trial Options says so and offers Re-check now.' },
  { id: '08', area: 'Patient pages', title: 'Slot counts name their scope', tags: ['Decision'],
    before: 'One row read 6 slots in the list (the trial) and 0 in the detail (the cohort).',
    after: 'Every count names its scope: "0 open in Arm A1 · 4 in the trial". A wait shows how many others watch the same opening.' },
  { id: '14', area: 'Patient pages', title: 'Calmer copy', tags: ['Small PR'],
    before: 'A trial without entered criteria showed a red alert. The cost of a placement read "blocks 1".',
    after: 'Missing setup is said calmly with a way to fix it. The cost is said in patients: "1 other patient needs it".' },
  { id: '04', area: 'Patient pages', title: 'One name per concept', tags: ['Decision'],
    before: 'Five names for queueing a patient; slot or seat depending on the screen; Watchlist the status vs watching a trial.',
    after: 'Nov 10 round: "Queued for Optimized Match" and "slot" everywhere. Watchlist stays the status; Watch is per trial.' },
  { id: '10', area: 'Patient pages', title: 'Keep with a note', tags: ['Migration'],
    before: 'Keep was one click that recorded nothing, and 30 days was the shortest check-in.',
    after: 'Keep… takes a note and "look again in 1 week, 2 weeks, 30 or 60 days". The note shows on the watch.' },
  { id: '11', area: 'Patient pages', title: 'Hospice or comfort care', tags: ['Migration'],
    before: 'Four not-seeking reasons; a patient moving to hospice was filed under one of them.',
    after: 'A fifth reason, "Hospice or comfort care", shown in the header and the logs.' },
  { id: 'R2', area: 'Nov 10 feedback', title: 'Status chip is the control', tags: ['Small PR'],
    before: '"Untriaged", and the status changed only through Edit Demographics.',
    after: '"Undeclared". The status chip opens Seeking, look now / Watchlist, maybe later / Not seeking… with a reason.' },

  // ── Slot Allocation findings ──
  { id: 'A1', area: 'Slot Allocation', title: 'Every open slot', tags: ['Migration'],
    before: 'The board showed 16 of 39 open slots: only the ones that got a proposal.',
    after: 'Slots › Now lists every open slot by opening, proposed or not, and who fits but is not queued.' },
  { id: 'A2', area: 'Slot Allocation', title: 'Trials by name', tags: ['Small PR'],
    before: 'Trials by NCT number; chips one per opening with identical labels.',
    after: 'The short name first, the NCT number after it in mono; every opening named.' },
  { id: 'A3', area: 'Slot Allocation', title: 'Slots by opening', tags: ['Small PR'],
    before: 'One card per seat with alternates who already held other seats; a queued patient with no seat appeared nowhere.',
    after: 'Select a slot: its candidates in rank order, the reserve, and who it would block.' },
  { id: 'A4', area: 'Slot Allocation', title: 'Why no slot', tags: ['Small PR'],
    before: '"Every open seat went to someone else" for every unplaced patient, often wrong.',
    after: 'Blocked says which it is: no open slot in the opening, lost to a higher rank, no longer eligible, or dismissed. Each comes with an action.' },
  { id: 'A5', area: 'Slot Allocation', title: 'Which choice this is', tags: ['Decision'],
    before: 'A proposal hid that it was the patient\'s 2nd choice and why.',
    after: 'Proposals say 1st or 2nd choice. The demo ranks by time on the queue; how much a 1st choice should weigh is the decision.' },
  { id: 'A6', area: 'Slot Allocation', title: 'Dismiss with a reason', tags: ['Small PR'],
    before: 'One-click dismiss with no reason; the header still read "0 deviations" after a dismissal.',
    after: 'Dismiss asks why (one tap and an optional note). The header counts accepted and dismissed since the snapshot.' },
  { id: 'A7', area: 'Slot Allocation', title: 'Nobody leaves quietly', tags: ['Migration'],
    before: 'A queued patient re-matched as not eligible silently left the board.',
    after: 'Blocked › No longer eligible lists them with the re-match date and what changed.' },
  { id: 'A8', area: 'Slot Allocation', title: 'Counts the watchers can get', tags: ['Small PR'],
    before: '"6 open slots" counted the whole trial, slots already proposed included.',
    after: 'Near future and slot waits count the opening\'s own slots; watchers show under the opening they wait for.' },
  { id: 'A9', area: 'Slot Allocation', title: 'Names on a shared screen', tags: ['Decision'],
    before: 'The board showed full names and MRNs while the Patients list masked them.',
    after: 'Try the Names switch above the board: full names, meeting form (Samuel O.), or follow the Profile switch.' },
  { id: 'A10', area: 'Slot Allocation', title: 'One set of words', tags: ['Decision'],
    before: 'Slot Allocation / Preliminary Slot Allocation Chart / Assignments; slot, seat, offer, placement, baseline, deviation, artifact.',
    after: 'One page name and one word per thing: slot, proposal, Queued for Optimized Match, meeting snapshot.' },

  // ── Patient Slot Review ──
  { id: 'SR1', area: 'Patient Slot Review', title: 'One board for the Thursday meeting', tags: ['Decision', 'Migration'],
    before: 'By patient, By trial and Watchlist were three separate views of the meeting.',
    after: 'From the hand sketch: Patients | Slots (Now, Near future) | Optimizer decisions (Tracking, Blocked), on one screen.' },
  { id: 'SR2', area: 'Patient Slot Review', title: 'Connected both ways', tags: ['Small PR'],
    before: 'To ask "who else could take this slot?" the team switched views and lost the patient.',
    after: 'Select a patient: their possible slots and decision light up. Select a slot: candidates in order, reserve, and who would be blocked.' },
  { id: 'SR3', area: 'Patient Slot Review', title: 'Who does the next step', tags: ['Decision', 'Migration'],
    before: 'Commit held the slot and showed a toast. Who calls the patient, who books labs and by when was tracked off the app.',
    after: 'Accept assigns a short run of steps, each with a person and a due date. Filter to "Assigned to: Me", hand off with a note, see the trail.' },
  { id: 'SR4', area: 'Patient Slot Review', title: 'Near future and blocked', tags: ['Decision'],
    before: 'Openings on hold were invisible until they opened; unplaced patients got one sentence that was often wrong.',
    after: 'Near future lists openings on hold with dates and slots that may come back, with who waits. Blocked lists every unplaced patient with the real reason.' },
];

export const DESIGN_NOTES: Record<string, DesignNoteEntry> = Object.fromEntries(N.map((n) => [n.id, n]));
export const DESIGN_NOTE_LIST = N;
