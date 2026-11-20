// The open decisions from the Patient Slot Review ticket and the Decision-tagged boards.
// Answers stay in this browser; "Copy answers" puts them on the clipboard as plain text.

export interface Question {
  id: string;
  boards: string[]; // canvas board ids
  prompt: string;
  context: string;
  options: string[]; // empty = free text only
  /** where in the demo to look before answering */
  lookAt?: { label: string; to: string };
}

export const QUESTIONS: Question[] = [
  {
    id: 'near-future',
    boards: ['SR4'],
    prompt: 'What should count as a slot "opening soon"?',
    context: 'Slots › Near future shows openings on hold with a date in the next 4 weeks, plus openings on hold with no date set.',
    options: ['Next 2 weeks', 'Next 4 weeks (as shown)', 'Next 8 weeks', 'Any date, sorted by date'],
    lookAt: { label: 'Slots › Near future', to: '/slot-review?slots=soon' },
  },
  {
    id: 'may-return',
    boards: ['SR4'],
    prompt: 'Should slots that might come back show in Near future?',
    context: 'For example a slot held for a patient who has not consented yet, or a slot held by someone in screening.',
    options: ['Yes, with the date it would come back (as shown)', 'No, only openings that will certainly open'],
    lookAt: { label: 'Slots › Near future', to: '/slot-review?slots=soon' },
  },
  {
    id: 'in-review',
    boards: ['SR1'],
    prompt: 'Who belongs in "Patients in review"?',
    context: 'Today the board lists everyone queued for an opening, plus patients a team member adds by hand with nothing queued.',
    options: ['Everyone queued, plus patients added by hand (as shown)', 'Only patients the team adds to the meeting'],
  },
  {
    id: 'watchlist',
    boards: ['SR1', 'SR4', 'A8'],
    prompt: 'Where should patients who are watching a trial appear?',
    context: 'Watchers waiting for a slot show under the opening in Near future, next to who is queued for it and who fits.',
    options: ['Inside Near future and Blocked (as shown)', 'A separate Watchlist tab on the board', 'Both'],
  },
  {
    id: 'names',
    boards: ['A9'],
    prompt: 'Names on a projected meeting screen?',
    context: 'The Patients list masks names unless the Profile switch is on. The meeting board is likely to be on a shared screen. Try the Names switch above the board.',
    options: ['Full names (as today)', 'Meeting form: "Priya N." and the last 4 of the MRN', 'Follow the Profile masking switch'],
    lookAt: { label: 'Patient Slot Review', to: '/slot-review' },
  },
  {
    id: 'steps',
    boards: ['SR3'],
    prompt: 'The steps after Accept: a fixed chain or free tasks?',
    context: 'Accepting creates: accepted at the meeting (PI) → consent call (CRC) → book pre-screen labs (RN) → pre-screening opens. Each has a person and a due date.',
    options: ['Fixed chain (as shown)', 'Fixed chain, editable per pairing', 'Free-form tasks'],
  },
  {
    id: 'consent-due',
    boards: ['SR3'],
    prompt: 'Default due date for the consent call, and how long to hold the slot without consent?',
    context: 'The demo sets the call for the next business day and holds the slot 7 days.',
    options: ['Call next business day, hold 7 days (as shown)', 'Call in 2 business days, hold 7 days', 'Call next business day, hold 14 days'],
  },
  {
    id: 'optimizer-weights',
    boards: ['SR9', 'A5'],
    prompt: 'Besides seating the most patients, should anything else count when the optimizer plans?',
    context:
      'Today the app (and this demo) treats every queued slot the same: the plan seats the most patients and ties go to whoever entered the pool first. So Bell, the only patient with KRAS G12C, is proposed for Trial C Cohort 1, which leaves Trial A for Nair and Trial B for Hughes. The matching playground also tries a patient\'s order of choice, slots about to close, and urgency.',
    options: [
      'No: seat the most, ties by time in the pool (the app today)',
      'Also the patient\'s order of choice (playground: Patient choice)',
      'Also slots about to close (playground: Slot urgency)',
      'Also urgency set by the physician (playground: Patient urgency)',
    ],
    lookAt: { label: 'Select Bell, Marcus', to: '/slot-review?patient=p-bell' },
  },
  {
    id: 'decline-seniority',
    boards: ['SR9'],
    prompt: 'When a patient declines an offer, should they keep their place in the pool?',
    context:
      'Ties go to whoever entered the pool first. The matching playground moves a patient who declines to the back for future ties and keeps the place of one who fails screening. The app keeps it either way (and resets it whenever the patient is re-matched).',
    options: ['Keep their place either way', 'Back of the pool after a decline, keep it after a screen fail (playground)', 'Back of the pool for that trial only'],
  },
  {
    id: 'dismiss-returns',
    boards: ['A6'],
    prompt: 'After the team dismisses a proposal, may the optimizer propose it again?',
    context:
      'In this demo a dismissed pairing stays out until someone undoes it. In the app a dismissal only closes that proposal: the next run (nightly, or Run optimizer) may propose the same patient for the same slot.',
    options: ['Stays out until the team undoes it (as in the demo)', 'Can come back on the next run (the app today)', 'Comes back only when something changes (staging, a new slot)'],
  },
  {
    id: 'evidence',
    boards: ['03'],
    prompt: 'Is "Why this match" enough to queue a patient before full criteria are entered?',
    context: 'Trial Options lists the checks the matcher ran against the record (diagnosis, stage, biomarkers, prior therapy).',
    options: ['Yes', 'Yes, with a reminder to confirm the criteria', 'No, wait until criteria are entered'],
    lookAt: { label: 'Priya Nair › Trial Options', to: '/patients/p-nair?tab=options' },
  },
  {
    id: 'drag-place',
    boards: ['SR5'],
    prompt: 'When someone drags a patient onto a slot the optimizer gave to someone else, what should happen?',
    context:
      'Try dragging Bell, Marcus onto Trial A › Cohort 1 (say his patient prefers it). The dialog asks why, shows who loses a slot (Nair), then holds the slot like Accept.',
    options: [
      'Place by hand with a reason; the plan re-seats everyone else around it (as shown)',
      'Only the PI can place by hand',
      'It becomes a proposal the meeting still has to accept',
      'Do not allow it: only the optimizer proposes',
    ],
    lookAt: { label: 'Patient Slot Review', to: '/slot-review' },
  },
  {
    id: 'revert',
    boards: ['SR10'],
    prompt: 'After a slot is accepted and its steps assigned, how should the team take it back?',
    context:
      'Revert… on an accepted card releases the slot and cancels the open steps. The team picks: back to the optimizer (it may propose the same slot again) or release and dismiss with a reason. Try it on Bell after accepting him.',
    options: [
      'Ask each time, as shown',
      'Always back to the optimizer',
      'Always release and dismiss with a reason',
      'Only the PI can revert after the consent call',
    ],
    lookAt: { label: 'Patient Slot Review', to: '/slot-review' },
  },
  {
    id: 'board-view',
    boards: ['SR6', 'SR7'],
    prompt: 'Which view should the meeting open on?',
    context: 'View (above the board) switches between Cards, Compact, List and Matrix. Selecting a patient or a slot narrows the other lists in every view.',
    options: ['Cards', 'Compact', 'List', 'Matrix', 'Each person picks, the board remembers'],
    lookAt: { label: 'Patient Slot Review', to: '/slot-review' },
  },
  {
    id: 'anything-else',
    boards: [],
    prompt: 'Anything else?',
    context: 'What would you change before the team uses this on a Thursday?',
    options: [],
  },
];
