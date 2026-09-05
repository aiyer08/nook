/**
 * Presets for the collection engine.
 *
 * Every list-shaped page in the plan — applications, books, recipes, the
 * networking log, the subscription audit — is the same structure with a
 * different schema. Defining them as data rather than as components is what
 * makes thirty pages cost about as much as one.
 */
import type { CollectionView, FieldDef, FieldType, ID, WidgetData } from './types';
import type { IconName } from '../components/Icons';

/* ---------------- palette for select chips ---------------- */

export const CHIP = {
  slate: '#A3C4E0',
  lavender: '#C0A9DB',
  mint: '#9FCFB8',
  rose: '#EFA3B0',
  butter: '#EFCE7B',
  peach: '#F2B58F',
  sage: '#B4C69A',
  clay: '#D89A86',
  sea: '#95CBC8',
  periwinkle: '#AAB0E8',
  muted: '#D9C7B8',
} as const;

/* ---------------- tiny schema DSL ---------------- */

let seq = 0;
/** Stable-per-preset field ids. Short, because they end up as object keys. */
const fid = (name: string) => `f${(seq++).toString(36)}_${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`;

function f(type: FieldType, name: string, extra: Partial<FieldDef> = {}): FieldDef {
  return { id: fid(name), name, type, ...extra };
}

const title = (name = 'Name') => f('text', name, { primary: true });
const pick = (name: string, opts: [string, string][]) =>
  f('select', name, {
    options: opts.map(([label, color]) => ({ id: label.toLowerCase().replace(/\W+/g, '-'), label, color })),
  });
const tags = (name: string, opts: [string, string][]) =>
  f('multiselect', name, {
    options: opts.map(([label, color]) => ({ id: label.toLowerCase().replace(/\W+/g, '-'), label, color })),
  });
const stars = (name = 'Rating') => f('stars', name, { max: 5 });
const money = (name: string, unit = '$') => f('money', name, { suffix: unit });
const num = (name: string, suffix?: string) => f('number', name, { suffix });
const date = (name: string) => f('date', name);
const note = (name = 'Notes') => f('longtext', name);
const link = (name = 'Link') => f('url', name);
const check = (name: string) => f('checkbox', name);

const STAGES: [string, string][] = [
  ['Interested', CHIP.muted],
  ['Drafting', CHIP.butter],
  ['Submitted', CHIP.slate],
  ['Interview', CHIP.lavender],
  ['Decision', CHIP.mint],
];

export interface CollectionPreset {
  id: string;
  label: string;
  blurb: string;
  icon: IconName;
  /** which life sectors this tends to belong to, used to sort the picker */
  sectors?: string[];
  build: () => WidgetData & { fields: FieldDef[]; view: CollectionView };
  /** rows created with it, so the widget is never an empty grid */
  seed?: string[];
  checklist?: string[];
}

function preset(
  id: string,
  label: string,
  blurb: string,
  icon: IconName,
  fields: FieldDef[],
  view: CollectionView,
  opts: {
    groupBy?: string; dateField?: string; imageField?: string;
    sectors?: string[]; seed?: string[]; checklist?: string[];
  } = {},
): CollectionPreset {
  const byName = (n?: string) => fields.find((x) => x.name === n)?.id;
  return {
    id, label, blurb, icon,
    sectors: opts.sectors,
    seed: opts.seed,
    checklist: opts.checklist,
    build: () => ({
      fields,
      view,
      groupBy: byName(opts.groupBy),
      dateField: byName(opts.dateField),
      imageField: byName(opts.imageField),
      sortDir: 'asc',
    }),
  };
}

/* ------------------------------------------------------------------ */
/* the catalogue                                                       */
/* ------------------------------------------------------------------ */

export const COLLECTION_PRESETS: CollectionPreset[] = [
  /* ---- the headline one ---- */
  preset(
    'applications', 'Application tracker',
    'Jobs, scholarships, clubs, grad school. Board for the pipeline, calendar for deadlines, table to compare awards.',
    'briefcase',
    [
      title('Application'),
      pick('Stage', STAGES),
      pick('Kind', [
        ['Job', CHIP.slate], ['Internship', CHIP.periwinkle], ['Scholarship', CHIP.butter],
        ['Grant', CHIP.sage], ['Club', CHIP.rose], ['Programme', CHIP.lavender],
        ['Grad school', CHIP.sea], ['Other', CHIP.muted],
      ]),
      f('text', 'Organisation'),
      date('Deadline'),
      money('Award'),
      link('Posting'),
      pick('Outcome', [
        ['Waiting', CHIP.muted], ['Offer', CHIP.mint], ['Rejected', CHIP.clay],
        ['Withdrew', CHIP.muted], ['Waitlist', CHIP.butter],
      ]),
      note('Notes'),
    ],
    'board',
    {
      groupBy: 'Stage', dateField: 'Deadline',
      sectors: ['Work', 'School', 'Career'],
      checklist: ['Transcript', 'Letter of recommendation 1', 'Letter of recommendation 2', '500-word essay', 'Resume', 'Submit'],
    },
  ),

  /* ---- career and research ---- */
  preset('networking', 'Networking log',
    'Who you know, and how long it has been. Sorted by last contact so nobody quietly falls off.',
    'people',
    [title('Person'), f('text', 'Where they are'), f('text', 'How you met'),
     date('Last contacted'), pick('Warmth', [['Close', CHIP.mint], ['Warm', CHIP.butter], ['Cooling', CHIP.peach], ['Cold', CHIP.slate]]),
     f('text', 'Email'), note('One thing to remember')],
    'table', { dateField: 'Last contacted', sectors: ['Career', 'Work'] }),

  preset('interviewqa', 'Interview Q&A bank',
    'Questions you have been asked, and the answer you wish you had given.',
    'brain',
    [title('Question'), pick('Kind', [['Behavioural', CHIP.lavender], ['Technical', CHIP.slate], ['Research', CHIP.sea], ['Fit', CHIP.rose]]),
     note('Your answer'), stars('Confidence'), f('text', 'Asked by')],
    'table', { groupBy: 'Kind', sectors: ['Career', 'Work'] }),

  preset('portfolio', 'Portfolio projects',
    'What you have built, and what state it is in.',
    'palette',
    [title('Project'), pick('Status', [['Idea', CHIP.muted], ['Building', CHIP.butter], ['Shipped', CHIP.mint], ['Shelved', CHIP.clay]]),
     f('text', 'Stack'), link('Live'), link('Repo'), note('What it does'), date('Shipped')],
    'gallery', { groupBy: 'Status', sectors: ['Career', 'Creative'] }),

  preset('skills', 'Skills inventory',
    'What you can do, honestly rated, so you can see what to practise.',
    'bolt',
    [title('Skill'), pick('Area', [['Technical', CHIP.slate], ['Research', CHIP.sea], ['Writing', CHIP.butter], ['People', CHIP.rose], ['Craft', CHIP.lavender]]),
     stars('Confidence'), note('Evidence'), f('text', 'Next step')],
    'table', { groupBy: 'Area', sectors: ['Career', 'School'] }),

  preset('conferences', 'Conferences & talks',
    'Where you went, what you saw, who you should email about it.',
    'plane',
    [title('Event'), date('When'), f('text', 'Where'),
     pick('Role', [['Attended', CHIP.muted], ['Poster', CHIP.butter], ['Talk', CHIP.rose], ['Organised', CHIP.lavender]]),
     note('Worth remembering')],
    'calendar', { dateField: 'When', groupBy: 'Role', sectors: ['Career', 'School'] }),

  /* ---- money ---- */
  preset('subscriptions', 'Subscription audit',
    'Everything quietly leaving your account each month.',
    'coin',
    [title('Service'), money('Monthly'), date('Renews'),
     pick('Verdict', [['Keep', CHIP.mint], ['Unsure', CHIP.butter], ['Cancel', CHIP.clay], ['Cancelled', CHIP.muted]]),
     f('text', 'Paid with'), note('Notes')],
    'table', { groupBy: 'Verdict', dateField: 'Renews', sectors: ['Money'] }),

  preset('budget', 'Monthly budget',
    'Planned against actual, line by line.',
    'coin',
    [title('Line'), pick('Category', [['Rent', CHIP.slate], ['Food', CHIP.sage], ['Transport', CHIP.periwinkle], ['Fun', CHIP.rose], ['Health', CHIP.mint], ['Saving', CHIP.butter], ['Other', CHIP.muted]]),
     money('Planned'), money('Actual'), note('Notes')],
    'table', { groupBy: 'Category', sectors: ['Money'] }),

  preset('winnings', 'Scholarship winnings',
    'What you have actually been awarded. Pairs with the application tracker.',
    'star',
    [title('Award'), money('Amount'), date('Awarded'), f('text', 'From'),
     pick('Status', [['Applied', CHIP.muted], ['Won', CHIP.mint], ['Received', CHIP.sage], ['Declined', CHIP.clay]]),
     note('Notes')],
    'table', { groupBy: 'Status', dateField: 'Awarded', sectors: ['Money', 'School'] }),

  /* ---- social ---- */
  preset('birthdays', 'Perpetual birthdays',
    'One page, no year. Never rewrite it.',
    'cake',
    [title('Person'), date('Birthday'), f('text', 'How you know them'), note('Gift ideas')],
    'calendar', { dateField: 'Birthday', sectors: ['Social'] }),

  preset('metpeople', 'People I met',
    'Name, where, and one detail — the detail is what makes you rememberable.',
    'people',
    [title('Name'), f('text', 'Where'), date('When'), f('text', 'One detail'), note('Notes')],
    'table', { dateField: 'When', sectors: ['Social'] }),

  preset('somtime', 'We should do this sometime',
    'The list that otherwise lives in a dozen half-finished text messages.',
    'sparkle',
    [title('Idea'), f('text', 'With whom'), pick('Effort', [['An evening', CHIP.mint], ['A day', CHIP.butter], ['A weekend', CHIP.peach], ['A trip', CHIP.rose]]),
     check('Done'), date('Did it'), note('Notes')],
    'table', { groupBy: 'Effort', sectors: ['Social'] }),

  preset('letters', 'Letters & postcards sent',
    'Who you wrote to, and who owes you one.',
    'note',
    [title('To'), date('Sent'), pick('Kind', [['Letter', CHIP.butter], ['Postcard', CHIP.sea], ['Card', CHIP.rose], ['Parcel', CHIP.peach]]),
     check('Replied'), note('What you said')],
    'table', { dateField: 'Sent', sectors: ['Social'] }),

  preset('concerts', 'Concerts & shows',
    'Every gig, play and film, with a rating you will disagree with later.',
    'music',
    [title('Act or show'), date('When'), f('text', 'Venue'), stars(), f('text', 'Went with'), note('Notes')],
    'gallery', { dateField: 'When', sectors: ['Social', 'Creative'] }),

  preset('restaurants', 'Restaurants & coffee',
    'Where to go back to, and where not to.',
    'cup',
    [title('Place'), f('text', 'Where'), stars(),
     pick('Kind', [['Coffee', CHIP.clay], ['Breakfast', CHIP.butter], ['Lunch', CHIP.sage], ['Dinner', CHIP.slate], ['Dessert', CHIP.rose], ['Bar', CHIP.lavender]]),
     money('Typical'), check('Been'), note('Order this')],
    'gallery', { groupBy: 'Kind', sectors: ['Social', 'Home'] }),

  /* ---- home and life ---- */
  preset('meals', 'Weekly meal plan',
    'What you are eating, and therefore what you need to buy.',
    'cup',
    [title('Meal'), pick('Day', [['Mon', CHIP.slate], ['Tue', CHIP.sage], ['Wed', CHIP.butter], ['Thu', CHIP.peach], ['Fri', CHIP.rose], ['Sat', CHIP.lavender], ['Sun', CHIP.sea]]),
     pick('Sitting', [['Breakfast', CHIP.butter], ['Lunch', CHIP.sage], ['Dinner', CHIP.slate], ['Snack', CHIP.rose]]),
     note('Ingredients'), check('Shopped')],
    'board', { groupBy: 'Day', sectors: ['Home'] }),

  preset('cleaning', 'Cleaning rotation',
    'The jobs, how often, and when you last actually did them.',
    'house',
    [title('Job'), pick('How often', [['Daily', CHIP.rose], ['Weekly', CHIP.butter], ['Fortnightly', CHIP.sage], ['Monthly', CHIP.slate], ['Seasonal', CHIP.lavender]]),
     date('Last done'), f('text', 'Room'), check('Done this round')],
    'board', { groupBy: 'How often', dateField: 'Last done', sectors: ['Home'] }),

  preset('plants', 'Plant watering',
    'Which plant, how thirsty, when you last remembered.',
    'leaf',
    [title('Plant'), f('text', 'Where it lives'),
     pick('Water', [['Twice a week', CHIP.sea], ['Weekly', CHIP.mint], ['Fortnightly', CHIP.sage], ['Monthly', CHIP.muted]]),
     date('Last watered'), note('Notes')],
    'table', { groupBy: 'Water', dateField: 'Last watered', sectors: ['Home'] }),

  preset('petcare', 'Pet care log',
    'Feeding, walks, vet visits, medication.',
    'paw',
    [title('What'), date('When'), pick('Kind', [['Food', CHIP.butter], ['Walk', CHIP.sage], ['Vet', CHIP.rose], ['Medicine', CHIP.lavender], ['Grooming', CHIP.sea], ['Play', CHIP.peach]]),
     f('text', 'Who did it'), note('Notes')],
    'calendar', { dateField: 'When', groupBy: 'Kind', sectors: ['Home'] }),

  preset('packing', 'Packing list',
    'Clone it per trip and tick your way down.',
    'plane',
    [title('Item'), pick('Bag', [['Carry-on', CHIP.slate], ['Checked', CHIP.periwinkle], ['Wearing', CHIP.rose]]),
     pick('Group', [['Clothes', CHIP.butter], ['Toiletries', CHIP.sea], ['Tech', CHIP.slate], ['Documents', CHIP.clay], ['Meds', CHIP.mint], ['Other', CHIP.muted]]),
     check('Packed'), num('How many')],
    'board', { groupBy: 'Group', sectors: ['Home'] }),

  preset('itinerary', 'Travel itinerary',
    'The plan, hour by hour, with the booking references you will need at a gate.',
    'plane',
    [title('What'), date('When'), f('text', 'Time'), f('text', 'Where'),
     pick('Kind', [['Travel', CHIP.slate], ['Stay', CHIP.lavender], ['Food', CHIP.sage], ['Thing to do', CHIP.rose], ['Admin', CHIP.muted]]),
     f('text', 'Booking ref'), link('Details'), note('Notes')],
    'calendar', { dateField: 'When', groupBy: 'Kind', sectors: ['Home'] }),

  preset('bucket', 'Bucket list',
    'The big ones. No deadlines, no guilt.',
    'star',
    [title('Thing'), pick('Someday', [['This year', CHIP.rose], ['Next few years', CHIP.butter], ['One day', CHIP.slate]]),
     money('Roughly'), check('Done'), date('Did it'), note('Notes')],
    'gallery', { groupBy: 'Someday', sectors: ['Reflection', 'Home'] }),

  preset('gifts', 'Gift planner',
    'Ideas caught the moment they occur to you, not in a panic in December.',
    'sparkle',
    [title('For whom'), f('text', 'Idea'), pick('Occasion', [['Birthday', CHIP.rose], ['Christmas', CHIP.mint], ['Thank you', CHIP.butter], ['Just because', CHIP.lavender]]),
     money('Budget'), date('Needed by'), check('Bought'), link('Where')],
    'board', { groupBy: 'Occasion', dateField: 'Needed by', sectors: ['Social', 'Home'] }),

  preset('places', 'Places I have been',
    'Cities, countries, hikes — with the one thing you would tell someone.',
    'plane',
    [title('Place'), f('text', 'Country'), date('When'), stars(), f('text', 'Went with'), note('Tell people about')],
    'gallery', { dateField: 'When', sectors: ['Social', 'Home'] }),

  /* ---- health ---- */
  preset('symptoms', 'Symptom log',
    'What hurt, how much, and what you had been doing. Patterns show up eventually.',
    'heart',
    [title('Symptom'), date('When'), f('number', 'Severity', { suffix: '/10' }),
     tags('Possible triggers', [['Sleep', CHIP.periwinkle], ['Stress', CHIP.clay], ['Screen', CHIP.slate], ['Food', CHIP.sage], ['Weather', CHIP.sea], ['Hormonal', CHIP.rose], ['Unknown', CHIP.muted]]),
     f('text', 'What helped'), note('Notes')],
    'calendar', { dateField: 'When', sectors: ['Health'] }),

  preset('workouts', 'Workout log',
    'What you did, for how long, and how it felt afterwards.',
    'bolt',
    [title('Session'), date('When'), pick('Kind', [['Walk', CHIP.sage], ['Run', CHIP.rose], ['Lift', CHIP.slate], ['Swim', CHIP.sea], ['Yoga', CHIP.lavender], ['Cycle', CHIP.mint], ['Sport', CHIP.peach], ['Other', CHIP.muted]]),
     num('Minutes', 'min'), stars('How it felt'), note('Notes')],
    'calendar', { dateField: 'When', groupBy: 'Kind', sectors: ['Health'] }),

  preset('selfcare', 'Self-care menu',
    'Sorted by how much you have got in you, so tired-you can still choose.',
    'heart',
    [title('Thing'), pick('Costs', [['5 minutes', CHIP.butter], ['30 minutes', CHIP.sage], ['An hour', CHIP.slate], ['A whole afternoon', CHIP.lavender]]),
     f('text', 'Where'), note('Why it helps')],
    'board', { groupBy: 'Costs', sectors: ['Health'] }),

  preset('coping', 'Coping strategies',
    'Written down while calm, for reading when not.',
    'brain',
    [title('Strategy'), pick('For', [['Anxious', CHIP.periwinkle], ['Low', CHIP.slate], ['Overwhelmed', CHIP.clay], ['Angry', CHIP.rose], ['Numb', CHIP.muted], ['Panicky', CHIP.lavender]]),
     stars('Works for me'), note('How to do it')],
    'board', { groupBy: 'For', sectors: ['Health'] }),

  preset('therapy', 'Therapy notes',
    'What you talked about, what you are taking away, what to raise next time.',
    'brain',
    [title('Session'), date('When'), note('What came up'), note('To try'), f('text', 'For next time')],
    'table', { dateField: 'When', sectors: ['Health'] }),

  /* ---- reflection ---- */
  preset('wins', 'Wins & brag log',
    'For the day you have to write about yourself and can remember nothing.',
    'star',
    [title('Win'), date('When'), pick('Size', [['Tiny', CHIP.butter], ['Real', CHIP.mint], ['Big', CHIP.rose]]),
     pick('Area', [['Work', CHIP.slate], ['School', CHIP.lavender], ['Health', CHIP.mint], ['Social', CHIP.rose], ['Personal', CHIP.sea]]),
     note('What happened')],
    'table', { dateField: 'When', groupBy: 'Size', sectors: ['Reflection', 'Career'] }),

  preset('lettinggo', 'Things I am letting go of',
    'Named, so they stop taking up room.',
    'leaf',
    [title('Thing'), date('Let go'), note('Why')],
    'table', { dateField: 'Let go', sectors: ['Reflection'] }),

  preset('lessons', 'Lessons learned',
    'The thing you would tell yourself six months ago.',
    'brain',
    [title('Lesson'), date('When'), f('text', 'Learned from'), note('The long version')],
    'table', { dateField: 'When', sectors: ['Reflection'] }),

  preset('vision', 'Vision board',
    'Pictures and words for where you are heading.',
    'sparkle',
    [title('Thing'), link('Picture'), pick('Area', [['Work', CHIP.slate], ['Home', CHIP.peach], ['Health', CHIP.mint], ['Travel', CHIP.sea], ['Learning', CHIP.lavender], ['People', CHIP.rose]]),
     note('Why it matters')],
    'gallery', { imageField: 'Picture', groupBy: 'Area', sectors: ['Reflection', 'Creative'] }),

  /* ---- creative and media ---- */
  preset('books', 'Books',
    'Read, reading, and the pile you are in denial about.',
    'book',
    [title('Book'), f('text', 'Author'), pick('Status', [['Want to read', CHIP.muted], ['Reading', CHIP.butter], ['Finished', CHIP.mint], ['Abandoned', CHIP.clay]]),
     stars(), date('Finished'), num('Pages'), note('One line about it')],
    'board', { groupBy: 'Status', dateField: 'Finished', sectors: ['Creative', 'School'] }),

  preset('watchlist', 'Films & shows',
    'What to watch, what you watched, and whether it was worth it.',
    'play',
    [title('Title'), pick('Status', [['Want to watch', CHIP.muted], ['Watching', CHIP.butter], ['Finished', CHIP.mint], ['Gave up', CHIP.clay]]),
     pick('Kind', [['Film', CHIP.slate], ['Series', CHIP.lavender], ['Documentary', CHIP.sage]]),
     stars(), f('text', 'Where'), date('Finished'), note('One line about it')],
    'board', { groupBy: 'Status', sectors: ['Creative', 'Social'] }),

  preset('recipes', 'Recipes to try',
    'Saved links you might actually cook, with a verdict once you have.',
    'cup',
    [title('Dish'), link('Recipe'), pick('Status', [['To try', CHIP.muted], ['Made it', CHIP.mint], ['In rotation', CHIP.rose], ['Never again', CHIP.clay]]),
     stars(), pick('Effort', [['Weeknight', CHIP.sage], ['Weekend', CHIP.butter], ['A project', CHIP.clay]]),
     note('Changes I would make')],
    'gallery', { groupBy: 'Status', sectors: ['Home', 'Creative'] }),

  preset('currently', 'Currently',
    'Reading, watching, listening, obsessed with. A snapshot of now.',
    'sparkle',
    [title('Thing'), pick('Kind', [['Reading', CHIP.butter], ['Watching', CHIP.slate], ['Listening', CHIP.lavender], ['Playing', CHIP.mint], ['Obsessed with', CHIP.rose]]),
     f('text', 'Month'), note('Notes')],
    'board', { groupBy: 'Kind', sectors: ['Creative'] }),

  preset('playlist', 'Playlist of the month',
    'The songs that will sound like this month forever.',
    'music',
    [title('Song'), f('text', 'Artist'), f('text', 'Month'), link('Listen'), note('Why')],
    'table', { sectors: ['Creative'] }),

  /* ---- study, so the Lavender sprig isn't half empty ---- */
  preset('classes', 'Class schedule',
    'What you have, when, and where. One row per class.',
    'book',
    [title('Class'), pick('Day', [['Mon', CHIP.slate], ['Tue', CHIP.sage], ['Wed', CHIP.butter], ['Thu', CHIP.peach], ['Fri', CHIP.rose], ['Sat', CHIP.lavender], ['Sun', CHIP.sea]]),
     f('text', 'Time'), f('text', 'Room'), f('text', 'Taught by'), link('Page'), note('Notes')],
    'board', { groupBy: 'Day', sectors: ['School'] }),

  preset('assignments', 'Assignment tracker',
    'Everything due, what it is worth, and how far along you are.',
    'list',
    [title('Assignment'), f('text', 'Class'), date('Due'),
     pick('Stage', [['Not started', CHIP.muted], ['Reading', CHIP.butter], ['Drafting', CHIP.peach], ['Editing', CHIP.slate], ['Submitted', CHIP.mint]]),
     f('number', 'Worth', { suffix: '%' }), f('progress', 'Done', { max: 100, suffix: '%' }), note('Notes')],
    'board', { groupBy: 'Stage', dateField: 'Due', sectors: ['School'] }),

  preset('grades', 'Grade tracker',
    'What you got, what it counted for, and the running picture.',
    'star',
    [title('Piece of work'), f('text', 'Class'), f('number', 'Mark', { suffix: '%' }),
     f('number', 'Weight', { suffix: '%' }), date('Returned'), note('What to do differently')],
    'table', { dateField: 'Returned', sectors: ['School'] }),

  preset('syllabus', 'Syllabus breakdown',
    'A long module chopped into weeks you can actually tick off.',
    'book',
    [title('Topic'), f('text', 'Week'), f('text', 'Class'), check('Read'), check('Understood'),
     link('Materials'), note('Questions')],
    'table', { sectors: ['School'] }),

  preset('reading', 'Reading progress',
    'Long texts and how far in you are.',
    'book',
    [title('Text'), f('text', 'For'), f('progress', 'Progress', { max: 100, suffix: '%' }),
     num('Pages'), date('Needed by'), note('Notes')],
    'table', { dateField: 'Needed by', sectors: ['School'] }),

  preset('labnotes', 'Lab notebook',
    'What you did, what happened, what it means.',
    'brain',
    [title('Entry'), date('When'), note('Method'), note('What happened'), note('What it means'),
     pick('Result', [['Worked', CHIP.mint], ['Partly', CHIP.butter], ['Failed', CHIP.clay], ['Inconclusive', CHIP.muted]])],
    'table', { dateField: 'When', groupBy: 'Result', sectors: ['School', 'Career'] }),

  preset('flashcards', 'Flashcard schedule',
    'Decks and when they are next due, spaced out.',
    'brain',
    [title('Deck'), f('text', 'Class'), date('Next review'), num('Cards'),
     pick('Confidence', [['Shaky', CHIP.clay], ['Getting there', CHIP.butter], ['Solid', CHIP.mint]])],
    'table', { dateField: 'Next review', sectors: ['School'] }),

  /* ---- applications, the rest of the Peony ---- */
  preset('recletters', 'Recommendation letters',
    'Who you asked, when, and whether it has landed.',
    'note',
    [title('Referee'), f('text', 'For which application'), date('Asked'), date('Needed by'),
     pick('Status', [['To ask', CHIP.muted], ['Asked', CHIP.butter], ['Agreed', CHIP.slate], ['Submitted', CHIP.mint], ['Declined', CHIP.clay]]),
     check('Thanked'), note('Notes')],
    'board', { groupBy: 'Status', dateField: 'Needed by', sectors: ['Career', 'School'] }),

  preset('outcomes', 'Outcome log',
    'Every answer you got, so the pattern is visible rather than remembered.',
    'flag',
    [title('What'), date('Heard back'),
     pick('Outcome', [['Offer', CHIP.mint], ['Rejected', CHIP.clay], ['Waitlist', CHIP.butter], ['Ghosted', CHIP.muted], ['Withdrew', CHIP.slate]]),
     note('Any feedback'), note('What I would change')],
    'table', { groupBy: 'Outcome', dateField: 'Heard back', sectors: ['Career', 'School'] }),

  /* ---- home ---- */
  preset('grocery', 'Grocery list',
    'Grouped by aisle, so you walk the shop once.',
    'cup',
    [title('Item'), pick('Aisle', [['Produce', CHIP.sage], ['Dairy', CHIP.butter], ['Meat & fish', CHIP.rose], ['Dry goods', CHIP.clay], ['Frozen', CHIP.sea], ['Household', CHIP.slate], ['Other', CHIP.muted]]),
     num('How many'), check('Got it'), money('Roughly')],
    'board', { groupBy: 'Aisle', sectors: ['Home'] }),

  /* ---- tasks ---- */
  preset('inbox', 'Quick capture inbox',
    'Somewhere to throw things before you decide what they are.',
    'note',
    [title('Thing'), date('Caught'),
     pick('Then what', [['Undecided', CHIP.muted], ['Do it', CHIP.mint], ['Someday', CHIP.slate], ['Delegate', CHIP.butter], ['Drop it', CHIP.clay]]),
     note('Notes')],
    'table', { groupBy: 'Then what', dateField: 'Caught' }),

  preset('someday', 'Someday / maybe',
    'Not now, not never. Out of your head and off today.',
    'moon',
    [title('Someday'), pick('If', [['I had time', CHIP.slate], ['I had money', CHIP.butter], ['I felt braver', CHIP.rose], ['Things were calmer', CHIP.lavender]]),
     date('Look again'), note('Why it appeals')],
    'gallery', { groupBy: 'If', dateField: 'Look again', sectors: ['Reflection'] }),

  /* ---- creative ---- */
  preset('swatches', 'Pen & colour swatches',
    'What each pen actually looks like on this paper.',
    'palette',
    [title('Pen'), f('text', 'Colour'), f('text', 'Nib'), stars('Feel'),
     pick('Bleeds', [['No', CHIP.mint], ['A bit', CHIP.butter], ['Badly', CHIP.clay]]), note('Notes')],
    'gallery', { sectors: ['Creative'] }),

  preset('stickerbook', 'Sticker & washi archive',
    'What you own, so you stop buying the same roll twice.',
    'sparkle',
    [title('Piece'), pick('Kind', [['Washi', CHIP.rose], ['Sticker', CHIP.butter], ['Stamp', CHIP.sage], ['Sticky notes', CHIP.slate]]),
     f('text', 'From'), link('Picture'), check('Used'), note('Notes')],
    'gallery', { groupBy: 'Kind', imageField: 'Picture', sectors: ['Creative'] }),

  preset('handwriting', 'Handwriting practice',
    'Drills, dates, and whether it is getting better.',
    'pencil',
    [title('Drill'), date('Practised'), num('Minutes', 'min'), stars('How it went'), note('Notes')],
    'calendar', { dateField: 'Practised', sectors: ['Creative'] }),

  /* ---- the blank one ---- */
  preset('blank', 'Blank collection',
    'A titled list with nothing in it. Add whatever columns you like.',
    'list',
    [title('Item'), check('Done'), note('Notes')],
    'table', {}),
];

export function presetById(id: string) {
  return COLLECTION_PRESETS.find((p) => p.id === id);
}

export const VIEW_LABEL: Record<CollectionView, string> = {
  table: 'Table',
  board: 'Board',
  calendar: 'Calendar',
  gallery: 'Gallery',
};

export const VIEW_ICON: Record<CollectionView, IconName> = {
  table: 'list',
  board: 'grid',
  calendar: 'calendar',
  gallery: 'image',
};

/* ---------------- reading and writing cells ---------------- */

export const primaryField = (fields: FieldDef[]) =>
  fields.find((x) => x.primary) ?? fields[0];

export function cellText(field: FieldDef, v: CellValueLike): string {
  if (v === undefined || v === '' || v === null) return '';
  if (field.type === 'checkbox') return v ? 'Yes' : 'No';
  if (field.type === 'multiselect') {
    const arr = Array.isArray(v) ? v : [];
    return arr
      .map((id) => field.options?.find((o) => o.id === id)?.label ?? id)
      .join(', ');
  }
  if (field.type === 'select') {
    return field.options?.find((o) => o.id === v)?.label ?? String(v);
  }
  if (field.type === 'money') return `${field.suffix ?? '$'}${v}`;
  if (field.type === 'number') return `${v}${field.suffix ? ` ${field.suffix}` : ''}`;
  if (field.type === 'stars') return '★'.repeat(Number(v) || 0);
  return String(v);
}

type CellValueLike = string | number | boolean | string[] | undefined | null;

export function optionColor(field: FieldDef, id: CellValueLike): string | undefined {
  if (typeof id !== 'string') return undefined;
  return field.options?.find((o) => o.id === id)?.color;
}

/** Sort comparator honouring the field type rather than sorting everything as text. */
export function compareBy(field: FieldDef | undefined, a: Record<ID, CellValueLike>, b: Record<ID, CellValueLike>) {
  if (!field) return 0;
  const av = a[field.id];
  const bv = b[field.id];
  const empty = (v: CellValueLike) => v === undefined || v === '' || v === null;
  if (empty(av) && empty(bv)) return 0;
  if (empty(av)) return 1; // blanks last, always
  if (empty(bv)) return -1;
  if (['number', 'money', 'stars', 'progress'].includes(field.type)) {
    return Number(av) - Number(bv);
  }
  if (field.type === 'select') {
    const order = (v: CellValueLike) => field.options?.findIndex((o) => o.id === v) ?? 0;
    return order(av) - order(bv);
  }
  return String(av).localeCompare(String(bv));
}
