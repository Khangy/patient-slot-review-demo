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
    context: 'Today the board lists everyone queued for an opening, plus patients a team member adds by hand (James Whitfield was added with nothing queued).',
    options: ['Everyone queued, plus patients added by hand (as shown)', 'Only patients the team adds to the meeting'],
  },
  {
    id: 'watchlist',
    boards: ['SR1', 'SR4', 'A8'],
    prompt: 'Where should patients who are watching a trial appear?',
    context: 'Watchers waiting for a slot show under the opening in Near future (Thu Nguyen and Priya Nair wait for SPX-201 › Arm A1).',
    options: ['Inside Near future and Blocked (as shown)', 'A separate Watchlist tab on the board', 'Both'],
  },
  {
    id: 'names',
    boards: ['A9'],
    prompt: 'Names on a projected meeting screen?',
    context: 'The Patients list masks names unless the Profile switch is on. The meeting board is likely to be on a shared screen. Try the Names switch above the board.',
    options: ['Full names (as today)', 'Meeting form: "Samuel O." and the last 4 of the MRN', 'Follow the Profile masking switch'],
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
    id: 'ranking',
    boards: ['SR2', 'A5'],
    prompt: 'When a slot has more candidates than slots, what should rank them?',
    context: 'The demo ranks by time on the queue and places each patient into their highest choice with room. The real optimizer weighs fit.',
    options: ['Time on the queue (as in the demo)', 'Clinical urgency set by the physician', 'The optimizer\'s fit score', 'Decided at the meeting, no automatic rank'],
    lookAt: { label: 'Select SOLVE-Lung 3 › Arm A', to: '/slot-review?opening=solve-a' },
  },
  {
    id: 'first-choice',
    boards: ['A5'],
    prompt: 'How much should a patient\'s first choice count?',
    context: 'Proposals say "1st choice" or "2nd choice" (Mei Zhou is proposed for her 2nd choice).',
    options: ['Strongly: place by first choice whenever they fit', 'As a tie-breaker after fit', 'Do not use the order of choice'],
  },
  {
    id: 'evidence',
    boards: ['03'],
    prompt: 'Is "Why this match" enough to queue a patient before full criteria are entered?',
    context: 'Trial Options lists the checks the matcher ran against the record (diagnosis, stage, biomarkers, prior therapy).',
    options: ['Yes', 'Yes, with a reminder to confirm the criteria', 'No, wait until criteria are entered'],
    lookAt: { label: 'Elena Rossi › Trial Options', to: '/patients/p-rossi?tab=options' },
  },
  {
    id: 'anything-else',
    boards: [],
    prompt: 'Anything else?',
    context: 'What would you change before the team uses this on a Thursday?',
    options: [],
  },
];
