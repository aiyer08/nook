import assert from 'node:assert/strict';
import {
  addDays, daysBetween, finishedOn, isTaskDoneOn, monthGrid, recurrenceHitsOn,
  relativeDay, rolloverDays, taskAppearsOn, toDateStr,
} from '../src/lib/dates.ts';
import { toEmbed, unfurl, safeUrl, normalizeUrl, formatBytes } from '../src/lib/media.ts';
import { fieldsFromGoogle, toGoogleBody, readWhen } from '../src/lib/gcal-map.ts';
import { streaks, gridDays, yearDays, correlation, describeCorrelation } from '../src/lib/streaks.ts';
import { identify, fromDataCiteAttrs } from '../src/lib/papers.ts';
import { CATALOGUE } from '../src/lib/catalogue.ts';
import { GARDEN, FAVOURITES, homeFlowerOf } from '../src/lib/garden.ts';
import {
  SEED_EVERY, canWater, daysToNextStage, growthDays, nextPlot, seedsDue, stageOf, towardNextSeed,
} from '../src/lib/growth.ts';
import { skyFromCode } from '../src/lib/weather.ts';
import { compareGoalDue, compareRows, compareTaskDue, dueFieldOf, taskWhen } from '../src/lib/due.ts';
import { dropWidgetContents, moveWidgetTo, travellingWith } from '../src/lib/move.ts';
import { EMBED_LIMIT, fileIdsIn, kindOfMime, orphans, shouldEmbed } from '../src/lib/files.ts';
import {
  coverage, currentLecture, describeMeets, lectureTitle, lectureWhen, lecturesOf, meetingDates,
  missingDates, nextMeeting,
} from '../src/lib/classes.ts';
import { compareBy, COLLECTION_PRESETS, presetById } from '../src/lib/collections.ts';
import { completionDates, describeWeek, weekStart, wrapUp } from '../src/lib/wrapped.ts';

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('  ok  ' + name); };

const T = '2026-09-04'; // a Friday

const task = (o) => ({
  id: 'x', widgetId: 'w', sectorId: 's', title: 't', notes: '',
  kind: 'floating', done: false, createdOn: T, subtasks: [], order: 0, ...o,
});

console.log('\ndates');
t('local date string, not UTC', () => {
  assert.equal(toDateStr(new Date(2026, 8, 4, 23, 30)), '2026-09-04');
});
t('addDays crosses a month boundary', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});
t('daysBetween survives a DST change', () => {
  assert.equal(daysBetween('2026-03-01', '2026-03-31'), 30);
});
t('month grid is 6 weeks, Sunday first', () => {
  const g = monthGrid('2026-09');
  assert.equal(g.length, 42);
  assert.equal(g[0], '2026-08-30');
  assert.ok(g.includes('2026-09-30'));
});

console.log('\nrollover — the whole point of the app');
t('an unfinished floating task shows up again the next day', () => {
  const x = task({ createdOn: '2026-09-01' });
  assert.equal(taskAppearsOn(x, T), true);
  assert.equal(rolloverDays(x, T), 3);
});
t('a dated task does NOT roll over', () => {
  const x = task({ kind: 'dated', dueDate: '2026-09-01' });
  assert.equal(taskAppearsOn(x, T), false);
  assert.equal(rolloverDays(x, T), 0);
});
t('a floating task made today has waited zero days', () => {
  assert.equal(rolloverDays(task({}), T), 0);
});
t('a finished task stops rolling', () => {
  const x = task({ createdOn: '2026-09-01', done: true, completedOn: '2026-09-02' });
  assert.equal(rolloverDays(x, T), 0);
  assert.equal(finishedOn(x, T), false);
  assert.equal(finishedOn(x, '2026-09-02'), true);
});
t('a task not yet created does not appear in the past', () => {
  assert.equal(taskAppearsOn(task({ createdOn: '2026-09-10' }), T), false);
});

console.log('\nrecurrence');
t('daily hits every day', () => {
  const x = task({ recurrence: { freq: 'daily' }, completions: [] });
  assert.equal(taskAppearsOn(x, T), true);
  assert.equal(taskAppearsOn(x, addDays(T, 5)), true);
});
t('weekly hits only its weekdays', () => {
  const fri = { freq: 'weekly', weekdays: [5] };
  assert.equal(recurrenceHitsOn(fri, T), true);        // Fri
  assert.equal(recurrenceHitsOn(fri, addDays(T, 1)), false); // Sat
  assert.equal(recurrenceHitsOn(fri, addDays(T, 7)), true);
});
t('monthly hits its day of the month', () => {
  const r = { freq: 'monthly', monthDay: 4 };
  assert.equal(recurrenceHitsOn(r, T), true);
  assert.equal(recurrenceHitsOn(r, '2026-10-04'), true);
  assert.equal(recurrenceHitsOn(r, '2026-10-05'), false);
});
t('ticking a recurring task only marks that one day', () => {
  const x = task({ recurrence: { freq: 'daily' }, completions: [T] });
  assert.equal(isTaskDoneOn(x, T), true);
  assert.equal(isTaskDoneOn(x, addDays(T, 1)), false);
  assert.equal(finishedOn(x, T), true);
});
t('a recurring task does not appear before it existed', () => {
  const x = task({ createdOn: '2026-09-04', recurrence: { freq: 'daily' } });
  assert.equal(taskAppearsOn(x, '2026-09-01'), false);
});

console.log('\nwarm wording');
t('relative days read like speech', () => {
  assert.equal(relativeDay(T, T), 'today');
  assert.equal(relativeDay(addDays(T, 1), T), 'tomorrow');
  assert.equal(relativeDay(addDays(T, -1), T), 'yesterday');
  assert.equal(relativeDay(addDays(T, 3), T), 'in 3 days');
});

console.log('\nlinks and embeds');
t('bare domains become https urls', () => {
  assert.equal(normalizeUrl('github.com/a/b'), 'https://github.com/a/b');
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('not a url'), null);
});
t('youtube in all its shapes', () => {
  for (const u of [
    'https://www.youtube.com/watch?v=abc123XYZ_-',
    'https://youtu.be/abc123XYZ_-',
    'https://www.youtube.com/shorts/abc123XYZ_-',
  ]) {
    const e = toEmbed(u);
    assert.equal(e.kind, 'youtube', u);
    assert.ok(e.src.includes('abc123XYZ_-'), u);
    assert.ok(e.src.startsWith('https://www.youtube-nocookie.com/embed/'), u);
  }
});
t('spotify, vimeo, maps and figma all embed', () => {
  assert.equal(toEmbed('https://open.spotify.com/playlist/37i9dQZF1DX').kind, 'spotify');
  assert.equal(toEmbed('https://vimeo.com/123456').kind, 'vimeo');
  assert.equal(toEmbed('https://www.google.com/maps/place/Kyoto').kind, 'maps');
  assert.equal(toEmbed('https://www.figma.com/file/abc/Design').kind, 'figma');
});
t('an unknown site refuses to pretend it can embed', () => {
  assert.equal(toEmbed('https://example.com/some/page').kind, 'none');
});
t('unfurl names what it recognises', () => {
  const yt = unfurl('https://www.youtube.com/watch?v=jfKfPfyJRdk');
  assert.equal(yt.title, 'YouTube video');
  assert.ok(yt.image.includes('jfKfPfyJRdk'));

  const gh = unfurl('https://github.com/facebook/react');
  assert.equal(gh.title, 'facebook/react');
  assert.equal(gh.provider, 'GitHub');

  const wiki = unfurl('https://en.wikipedia.org/wiki/Bullet_journal');
  assert.equal(wiki.title, 'Bullet Journal');

  const plain = unfurl('https://example.com/my-cool-article.html');
  assert.equal(plain.title, 'My Cool Article');
  assert.equal(plain.domain, 'example.com');
});
t('a spotify track gets a sensible name', () => {
  assert.equal(unfurl('https://open.spotify.com/track/abc').title, 'Track on Spotify');
});


/* ---------------------------------------------------------------- */
/* Google Calendar mapping                                           */
/* ---------------------------------------------------------------- */
const link = {
  calendarId: 'me@example.com', summary: 'Personal', sectorId: 's', widgetId: 'w',
  timeMin: '2026-07-01T00:00:00.000Z', writeBack: true,
};
const ev = (o) => ({
  id: 'e1', widgetId: 'w', sectorId: 's', kind: 'event', title: 'Thing',
  date: '2026-09-04', ...o,
});

console.log('\ngoogle → nook');
t('a timed event keeps its local wall-clock time', () => {
  const off = new Date('2026-09-04T15:30:00').getTimezoneOffset();
  const sign = off <= 0 ? '+' : '-';
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const iso = `2026-09-04T15:30:00${sign}${pad(off / 60)}:${pad(off % 60)}`;
  const f = fieldsFromGoogle({ id: 'g1', summary: 'Standup', start: { dateTime: iso },
    end: { dateTime: iso.replace('15:30', '16:00') } }, link);
  assert.equal(f.date, '2026-09-04');
  assert.equal(f.time, '15:30');
  assert.equal(f.endTime, '16:00');
});
t('an all-day event has a date and no time', () => {
  const f = fieldsFromGoogle({ id: 'g2', summary: 'Holiday',
    start: { date: '2026-12-25' }, end: { date: '2026-12-26' } }, link);
  assert.equal(f.date, '2026-12-25');
  assert.equal(f.time, undefined);
});
t('a nameless google event is not left blank', () => {
  assert.equal(fieldsFromGoogle({ id: 'g3', start: { date: '2026-09-04' } }, link).title, '(no title)');
});
t('events with other people become meetings, and name them', () => {
  const f = fieldsFromGoogle({ id: 'g4', summary: 'Review', start: { date: '2026-09-04' },
    attendees: [{ displayName: 'Me', self: true }, { displayName: 'Sam' }, { email: 'p@x.com' }] }, link);
  assert.equal(f.kind, 'meeting');
  assert.equal(f.people, 'Sam, p@x.com');
});
t('a solo event stays an event', () => {
  const f = fieldsFromGoogle({ id: 'g5', summary: 'Gym', start: { date: '2026-09-04' },
    attendees: [{ displayName: 'Me', self: true }] }, link);
  assert.equal(f.kind, 'event');
  assert.equal(f.people, undefined);
});
t('a long guest list is trimmed, not dumped', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ displayName: `P${i}` }));
  const f = fieldsFromGoogle({ id: 'g6', summary: 'All hands', start: { date: '2026-09-04' },
    attendees: many }, link);
  assert.equal(f.people, 'P0, P1, P2, P3 +5');
});
t('the joining link is found, however google supplies it', () => {
  assert.equal(fieldsFromGoogle({ id: 'a', start: { date: '2026-09-04' },
    hangoutLink: 'https://meet.google.com/abc' }, link).link, 'https://meet.google.com/abc');
  assert.equal(fieldsFromGoogle({ id: 'b', start: { date: '2026-09-04' },
    conferenceData: { entryPoints: [{ entryPointType: 'phone', uri: 'tel:+1' },
      { entryPointType: 'video', uri: 'https://zoom.us/j/1' }] } }, link).link, 'https://zoom.us/j/1');
  assert.equal(fieldsFromGoogle({ id: 'c', start: { date: '2026-09-04' },
    description: 'call in at https://teams.microsoft.com/l/xyz please' }, link).link,
    'https://teams.microsoft.com/l/xyz');
});
t('the google identity is recorded so it is never re-added', () => {
  const f = fieldsFromGoogle({ id: 'g7', etag: '"abc"', start: { date: '2026-09-04' } }, link);
  assert.deepEqual(f.google, { calendarId: 'me@example.com', eventId: 'g7', etag: '"abc"', htmlLink: undefined });
  assert.equal(f.pendingPush, false);
});
t('a repeating instance remembers its series', () => {
  const f = fieldsFromGoogle({ id: 'g8_20260904', recurringEventId: 'g8',
    start: { date: '2026-09-04' } }, link);
  assert.equal(f.seriesId, 'g8');
});
t('nonsense dates do not crash the mapper', () => {
  assert.deepEqual(readWhen({ dateTime: 'not-a-date' }), {});
  assert.deepEqual(readWhen(undefined), {});
});

console.log('\nnook → google');
t("an all-day event's end date is the next day (google counts it exclusive)", () => {
  const b = toGoogleBody(ev({ date: '2026-09-04' }));
  assert.deepEqual(b.start, { date: '2026-09-04' });
  assert.deepEqual(b.end, { date: '2026-09-05' });
});
t('an all-day event at a month boundary rolls over correctly', () => {
  assert.deepEqual(toGoogleBody(ev({ date: '2026-09-30' })).end, { date: '2026-10-01' });
  assert.deepEqual(toGoogleBody(ev({ date: '2026-12-31' })).end, { date: '2027-01-01' });
});
t('a timed event round-trips back to the same wall-clock time', () => {
  const b = toGoogleBody(ev({ date: '2026-09-04', time: '09:15', endTime: '10:45' }));
  const back = fieldsFromGoogle({ id: 'x', start: b.start, end: b.end }, link);
  assert.equal(back.date, '2026-09-04');
  assert.equal(back.time, '09:15');
  assert.equal(back.endTime, '10:45');
});
t('an event with no end time gets an hour', () => {
  const b = toGoogleBody(ev({ time: '14:00' }));
  const mins = (new Date(b.end.dateTime) - new Date(b.start.dateTime)) / 60000;
  assert.equal(mins, 60);
});
t('an end time before the start is corrected, not sent as-is', () => {
  const b = toGoogleBody(ev({ time: '14:00', endTime: '13:00' }));
  assert.ok(new Date(b.end.dateTime) > new Date(b.start.dateTime));
  assert.equal((new Date(b.end.dateTime) - new Date(b.start.dateTime)) / 60000, 60);
});
t('empty fields are omitted rather than sent as blanks', () => {
  const b = toGoogleBody(ev({ location: '', notes: '' }));
  assert.equal(b.location, undefined);
  assert.equal(b.description, undefined);
});


/* ---------------------------------------------------------------- */
/* streaks — computed from the date list, never cached               */
/* ---------------------------------------------------------------- */
console.log('\nstreaks');
t('no days means no streak, and says so quietly', () => {
  const s = streaks([], T);
  assert.deepEqual({ c: s.current, l: s.longest, n: s.total }, { c: 0, l: 0, n: 0 });
});
t('a run ending today is the current streak', () => {
  const s = streaks(['2026-09-02', '2026-09-03', '2026-09-04'], T);
  assert.equal(s.current, 3);
  assert.equal(s.longest, 3);
  assert.equal(s.todayDone, true);
});
t("not having done it yet today does not break the streak", () => {
  const s = streaks(['2026-09-01', '2026-09-02', '2026-09-03'], T);
  assert.equal(s.current, 3);
  assert.equal(s.todayDone, false);
});
t('a two-day gap does break it', () => {
  const s = streaks(['2026-08-30', '2026-08-31', '2026-09-01'], T);
  assert.equal(s.current, 0);
  assert.equal(s.longest, 3);
});
t('the longest streak survives a break — the whole point', () => {
  const s = streaks(
    ['2026-08-01','2026-08-02','2026-08-03','2026-08-04','2026-08-05', '2026-09-04'],
    T,
  );
  assert.equal(s.current, 1);
  assert.equal(s.longest, 5);
  assert.equal(s.longestStart, '2026-08-01');
  assert.equal(s.longestEnd, '2026-08-05');
});
t('duplicate and unsorted dates are handled', () => {
  const s = streaks(['2026-09-03', '2026-09-04', '2026-09-03', '2026-09-02'], T);
  assert.equal(s.current, 3);
  assert.equal(s.total, 3);
});
t('a streak across a month boundary counts', () => {
  const s = streaks(['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02',
    '2026-09-03', '2026-09-04'], T);
  assert.equal(s.current, 6);
});
t('back-filling a forgotten day repairs the streak with no migration', () => {
  const before = streaks(['2026-09-01', '2026-09-03', '2026-09-04'], T);
  assert.equal(before.current, 2);
  const after = streaks(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'], T);
  assert.equal(after.current, 4);
});

console.log('\ngrids');
t('the habit grid is whole weeks, ending on the week containing today', () => {
  const g = gridDays(4, T);
  assert.equal(g.length, 28);
  assert.ok(g.includes(T));
  assert.equal(new Date(`${g[0]}T00:00:00`).getDay(), 0); // starts Sunday
});
t('year-in-pixels covers a leap year exactly', () => {
  assert.equal(yearDays(2024).length, 366);
  assert.equal(yearDays(2026).length, 365);
  assert.equal(yearDays(2026)[0], '2026-01-01');
  assert.equal(yearDays(2026)[364], '2026-12-31');
});

console.log('\ncorrelation, hedged honestly');
t('too little data refuses to claim a pattern', () => {
  assert.equal(correlation([[1, 1], [2, 2]]), undefined);
  assert.match(describeCorrelation(undefined, 2), /few more days/i);
});
t('a real relationship is detected', () => {
  const r = correlation([[1,1],[2,2],[3,3],[4,4],[5,5],[4,4]]);
  assert.ok(r > 0.9, `expected strong positive, got ${r}`);
  assert.match(describeCorrelation(r, 6), /line up with getting more done/);
});
t('flat data yields no correlation rather than a divide-by-zero', () => {
  assert.equal(correlation([[3,1],[3,2],[3,3],[3,4],[3,5]]), undefined);
});


/* ---------------------------------------------------------------- */
/* paper lookup: recognising what was pasted                        */
/* ---------------------------------------------------------------- */
console.log('\npaper identifiers');
t('a bare DOI is recognised', () => {
  assert.deepEqual(identify('10.1038/nature12373'), { kind: 'doi', doi: '10.1038/nature12373' });
});
t('a DOI inside any url is dug out', () => {
  for (const u of [
    'https://doi.org/10.1038/nature12373',
    'https://dx.doi.org/10.1038/nature12373',
    'https://www.nature.com/articles/nature12373?doi=10.1038/nature12373',
  ]) assert.equal(identify(u).doi, '10.1038/nature12373', u);
});
t('trailing punctuation from a copy-paste is trimmed', () => {
  assert.equal(identify('see 10.1038/nature12373.').doi, '10.1038/nature12373');
});
t('arXiv links in all their forms', () => {
  for (const u of [
    'https://arxiv.org/abs/1706.03762',
    'https://arxiv.org/pdf/1706.03762',
    'https://arxiv.org/abs/1706.03762v5',
    'arXiv:1706.03762',
    '1706.03762',
  ]) {
    const got = identify(u);
    assert.equal(got.kind, 'arxiv', u);
    assert.equal(got.arxivId, '1706.03762', u);
  }
});
t('the old arXiv id scheme still parses', () => {
  assert.equal(identify('https://arxiv.org/abs/cs/0501001').arxivId, 'cs/0501001');
});
t('a plain url is kept as a url, not guessed at', () => {
  assert.equal(identify('https://example.com/paper').kind, 'url');
});
t('nonsense is refused rather than half-accepted', () => {
  assert.equal(identify('').kind, 'none');
  assert.equal(identify('some notes about a paper').kind, 'none');
});

console.log('\nDataCite mapping');
t('a DataCite record becomes a readable paper', () => {
  const p = fromDataCiteAttrs({
    titles: [{ title: 'Attention Is All You  Need' }],
    creators: [
      { name: 'Vaswani, Ashish' },
      { name: 'Shazeer, Noam' },
      { name: 'Parmar, Niki' },
      { name: 'Uszkoreit, Jakob' },
    ],
    publicationYear: 2017,
    descriptions: [{ description: 'We propose a new  architecture.', descriptionType: 'Abstract' }],
    publisher: 'arXiv',
  }, '1706.03762');
  assert.equal(p.title, 'Attention Is All You Need');
  // "Family, Given" is flipped so it reads like a name
  assert.equal(p.authors, 'Ashish Vaswani et al.');
  assert.equal(p.year, '2017');
  assert.equal(p.abstract, 'We propose a new architecture.');
  assert.equal(p.url, 'https://arxiv.org/abs/1706.03762');
  assert.equal(p.doi, '10.48550/arXiv.1706.03762');
});
t('three authors or fewer are all named', () => {
  const p = fromDataCiteAttrs({
    titles: [{ title: 'A paper' }],
    creators: [{ givenName: 'Ada', familyName: 'Lovelace' }, { name: 'Grace Hopper' }],
    publicationYear: 1843,
  }, '1234.5678');
  assert.equal(p.authors, 'Ada Lovelace, Grace Hopper');
});
t('a record with no title is treated as not found', () => {
  assert.equal(fromDataCiteAttrs({ creators: [] }, '1'), null);
});


/* ---------------------------------------------------------------- */
/* the garden: nothing may be unreachable                            */
/* ---------------------------------------------------------------- */
console.log('\nthe garden');
t('every widget is filed in a flower — nothing loose', () => {
  const claimed = new Set(GARDEN.flatMap((f) => f.contents));
  const loose = CATALOGUE.filter((e) => !claimed.has(e.key)).map((e) => e.key);
  assert.deepEqual(loose, [], `unfiled: ${loose.join(', ')}`);
});
t('no flower points at a widget that does not exist', () => {
  const keys = new Set(CATALOGUE.map((e) => e.key));
  const dangling = GARDEN.flatMap((f) => f.contents.filter((k) => !keys.has(k)));
  assert.deepEqual(dangling, [], `dangling: ${dangling.join(', ')}`);
});
t('the always-to-hand tray stays small and real', () => {
  const keys = new Set(CATALOGUE.map((e) => e.key));
  assert.ok(FAVOURITES.length <= 8, `favourites should be at most 8, got ${FAVOURITES.length}`);
  assert.equal(new Set(FAVOURITES).size, FAVOURITES.length, 'no duplicates in the tray');
  for (const k of FAVOURITES) assert.ok(keys.has(k), `favourite ${k} is not a real widget`);
});
t('every favourite also lives inside a flower, so the tray is a shortcut not a home', () => {
  for (const k of FAVOURITES) {
    assert.ok(homeFlowerOf(k), `${k} is in the tray but in no flower`);
  }
});
t('the four the user asked for are in the tray', () => {
  for (const k of ['w:calendar', 'w:goals', 'w:notes', 'w:todo']) {
    assert.ok(FAVOURITES.includes(k), `${k} missing from the tray`);
  }
});
t('every flower holds something', () => {
  for (const f of GARDEN) {
    assert.ok(f.contents.length > 0, `${f.id} is empty`);
  }
  assert.equal(GARDEN.length, 11);
});

t('the eleven are actually eleven different flowers', () => {
  // The point of a garden is that you recognise a folder by its silhouette.
  // If most of them share a growth habit they read as one flower in a row of
  // colours, so hold the line on variety.
  const forms = new Set(GARDEN.map((f) => f.form));
  assert.ok(forms.size >= 7, `only ${forms.size} growth habits between eleven flowers`);
  for (const want of ['circle', 'ladder', 'cup', 'pompom']) {
    assert.ok(forms.has(want), `no flower uses the ${want} form`);
  }
  const species = new Set(GARDEN.map((f) => f.species.toLowerCase()));
  assert.equal(species.size, 11, 'two flowers share a species');
});

/* ------------------------------------------------------------------ */

console.log('\nthe garden grows');

const plant = (o) => ({
  id: 'p', flowerId: 'daisy', plantedOn: '2026-09-01', from: 'test', slot: 0, watered: [], ...o,
});

t('a plant grows from the day it went in, not a stored counter', () => {
  const p = plant({ plantedOn: '2026-09-01' });
  assert.equal(growthDays(p, '2026-09-01'), 0);
  assert.equal(growthDays(p, '2026-09-15'), 14);
  // closing the app for a fortnight still grows it
  assert.equal(stageOf(p, '2026-09-01'), 0);
  assert.equal(stageOf(p, '2026-09-04'), 1);
  assert.equal(stageOf(p, '2026-09-08'), 2);
  assert.equal(stageOf(p, '2026-09-15'), 3);
  assert.equal(stageOf(p, '2026-09-23'), 4);
});

t('watering is worth a day, and only once a day', () => {
  const p = plant({ plantedOn: '2026-09-01', watered: ['2026-09-02', '2026-09-02', '2026-09-03'] });
  // two distinct days of watering, not three waterings
  assert.equal(growthDays(p, '2026-09-04'), 3 + 2);
  assert.equal(canWater(plant({ watered: ['2026-09-04'] }), '2026-09-04'), false);
  assert.equal(canWater(plant({ watered: [] }), '2026-09-04'), true);
});

t('a fully grown flower needs no more water', () => {
  const grown = plant({ plantedOn: '2026-01-01' });
  assert.equal(stageOf(grown, '2026-09-04'), 4);
  assert.equal(canWater(grown, '2026-09-04'), false);
  assert.equal(daysToNextStage(grown, '2026-09-04'), null);
});

t('a focus session left early stays a sprout, and never dies', () => {
  const stunted = plant({ plantedOn: '2026-01-01', stunted: true });
  assert.equal(stageOf(stunted, '2026-09-04'), 1);
  assert.equal(daysToNextStage(stunted, '2026-09-04'), null);
});

t('seeds are paid out once per handful of finished things', () => {
  assert.equal(SEED_EVERY, 5);
  assert.equal(seedsDue(4, 0), 0);
  assert.equal(seedsDue(5, 0), 1);
  assert.equal(seedsDue(12, 0), 2);
  // already paid for the first ten
  assert.equal(seedsDue(12, 10), 0);
  assert.equal(seedsDue(15, 10), 1);
  // a counter that somehow went backwards can't mint seeds
  assert.equal(seedsDue(3, 10), 0);
});

t('the progress line counts toward the next seed', () => {
  assert.deepEqual(towardNextSeed(7), { done: 2, need: 5 });
});

t('the bed fills gaps rather than growing forever', () => {
  assert.equal(nextPlot([]), 0);
  assert.equal(nextPlot([plant({ slot: 0 }), plant({ slot: 2 })]), 1);
  assert.equal(nextPlot([plant({ slot: 0 }), plant({ slot: 1 })]), 2);
});

console.log('\nweather codes');
t('WMO codes collapse to what we can draw', () => {
  assert.equal(skyFromCode(0), 'clear');
  assert.equal(skyFromCode(3), 'cloud');
  assert.equal(skyFromCode(45), 'fog');
  assert.equal(skyFromCode(61), 'rain');
  assert.equal(skyFromCode(80), 'rain');
  assert.equal(skyFromCode(73), 'snow');
  assert.equal(skyFromCode(85), 'snow');
  assert.equal(skyFromCode(95), 'storm');
  // anything unexpected is cloudy rather than a crash
  assert.equal(skyFromCode(999), 'cloud');
});

console.log('\nwrapped');

const wdoc = () => ({
  version: 2, onboarded: true,
  avatar: { species: 'mouse', name: 'Mochi', color: '#fff', hat: 'none', accessory: 'none', decor: [] },
  sectors: [{ id: 's', name: 'School', accent: '#ccc', icon: 'book', order: 0, snap: true }],
  activeSectorId: 's',
  widgets: [{
    id: 'w1', sectorId: 's', type: 'tracker', title: 'Mood', x: 0, y: 0, w: 1, h: 1, z: 1,
    rotation: 0, tape: 'none',
    data: { mode: 'mood', days: { '2026-03-02': { mood: 5 }, '2026-03-03': { mood: 3 }, '2025-05-05': { mood: 1 } } },
  }],
  tasks: [
    task({ id: 't1', done: true, completedOn: '2026-03-02' }),
    task({ id: 't2', done: true, completedOn: '2026-03-03' }),
    task({ id: 't3', done: true, completedOn: '2026-03-04' }),
    task({ id: 't4', recurrence: { kind: 'daily' }, completions: ['2026-03-02', '2026-07-09'] }),
    task({ id: 't5', done: true, completedOn: '2025-12-31' }),
    task({ id: 't6' }),
  ],
  events: [], goals: [], contacts: [], strokes: [], decorations: [], items: [], materials: [],
  settings: {},
  stats: { completed: 6, streak: 3, lastActiveDate: '2026-03-04', unlocked: [], seen: [], focusMinutes: 125, bestStreak: 9 },
  garden: {
    seeds: 1, countedCompletions: 5,
    plants: [plant({ id: 'g1', plantedOn: '2026-01-01' }), plant({ id: 'g2', slot: 1, plantedOn: '2026-09-01' })],
    picks: { rose: 4, daisy: 9 }, hide: null, foundOn: ['2026-03-02', '2026-03-03'],
  },
  google: { clientId: '', links: [], pendingDeletes: [], autoSync: false },
});

t('only this year is counted, and recurring ticks count too', () => {
  const dates = completionDates(wdoc(), 2026);
  assert.deepEqual(dates.sort(), ['2026-03-02', '2026-03-02', '2026-03-03', '2026-03-04', '2026-07-09']);
  assert.equal(completionDates(wdoc(), 2025).length, 1);
});

t('the week starts on Monday', () => {
  assert.equal(weekStart('2026-03-04'), '2026-03-02');   // a Wednesday
  assert.equal(weekStart('2026-03-02'), '2026-03-02');   // the Monday itself
  assert.equal(weekStart('2026-03-01'), '2026-02-23');   // a Sunday belongs to the week before
});

t('wrapped adds up the year', () => {
  const w = wrapUp(wdoc(), 2026, '2026-09-04');
  assert.equal(w.completed, 5);
  assert.equal(w.activeDays, 4);
  assert.equal(w.bestStreak, 3);                       // 2, 3 and 4 March
  assert.equal(w.perMonth[2], 4);                      // March
  assert.equal(w.perMonth[6], 1);                      // July
  assert.equal(w.busiestWeek.start, '2026-03-02');
  assert.equal(w.busiestWeek.count, 4);
  assert.equal(w.busiestDay.date, '2026-03-02');
  assert.equal(w.topSector.name, 'School');
});

t('the best streak ever survives a worse year', () => {
  const w = wrapUp(wdoc(), 2026, '2026-09-04');
  assert.equal(w.bestStreakEver, 9);
  assert.ok(w.bestStreakEver >= w.bestStreak);
});

t('mood only counts the year asked for, and stops at today', () => {
  const w = wrapUp(wdoc(), 2026, '2026-09-04');
  assert.equal(w.moodDays, 2);
  assert.equal(w.mood.length, 247);                    // 1 Jan to 4 Sep inclusive
  assert.equal(w.mood.at(-1).date, '2026-09-04');
  assert.equal(w.mood.find((d) => d.date === '2026-03-02').mood, 5);
  assert.equal(w.mood.find((d) => d.date === '2026-03-05').mood, null);
  assert.equal(w.moodAverage, 4);
});

t('a finished year runs to the last day of December', () => {
  const w = wrapUp(wdoc(), 2025, '2026-09-04');
  assert.equal(w.mood.length, 365);
  assert.equal(w.mood.at(-1).date, '2025-12-31');
});

t('the most-used flower comes from what you actually planted from', () => {
  const w = wrapUp(wdoc(), 2026, '2026-09-04');
  assert.equal(w.topFlower.id, 'daisy');
  assert.equal(w.topFlower.count, 9);
});

t('the garden and the quiet numbers come through', () => {
  const w = wrapUp(wdoc(), 2026, '2026-09-04');
  assert.equal(w.plants, 2);
  assert.equal(w.blooms, 1);                           // the January one only
  assert.equal(w.focusMinutes, 125);
  assert.equal(w.mouseFound, 2);
});

t('an empty year says so instead of pretending', () => {
  const w = wrapUp(wdoc(), 2024, '2026-09-04');
  assert.equal(w.completed, 0);
  assert.ok(w.thin);
  assert.equal(w.busiestWeek, null);
  assert.equal(w.moodAverage, null);
});

t('the busiest week reads like a date', () => {
  assert.equal(describeWeek({ start: '2026-03-02', count: 4 }), '2–8 March');
  assert.equal(describeWeek({ start: '2026-03-30', count: 2 }), '30 March – 5 April');
});

console.log('\nsorting by what is due');

const dated = (o) => task({ kind: 'dated', ...o });

t('a deadline beats no deadline', () => {
  const withDate = dated({ id: 'a', dueDate: '2026-12-01' });
  const floating = task({ id: 'b' });
  assert.ok(compareTaskDue(withDate, floating) < 0);
  assert.ok(compareTaskDue(floating, withDate) > 0);
});

t('soonest first, and the time breaks the day', () => {
  const list = [
    dated({ id: 'late', dueDate: '2026-09-10' }),
    dated({ id: 'nine', dueDate: '2026-09-04', dueTime: '09:00' }),
    dated({ id: 'ten', dueDate: '2026-09-04', dueTime: '10:00' }),
    dated({ id: 'noTime', dueDate: '2026-09-04' }),
  ];
  assert.deepEqual(
    [...list].sort(compareTaskDue).map((x) => x.id),
    ['noTime', 'nine', 'ten', 'late'],
  );
});

t('a single-digit hour sorts before a double-digit one', () => {
  // '9:00' unpadded would sort after '10:00' as text
  assert.ok(taskWhen(dated({ dueDate: '2026-09-04', dueTime: '9:00' })) < taskWhen(dated({ dueDate: '2026-09-04', dueTime: '10:00' })));
});

t('floating tasks keep longest-waiting first, then your own order', () => {
  const old = task({ id: 'old', createdOn: '2026-08-01', order: 9 });
  const newer = task({ id: 'new', createdOn: '2026-09-01', order: 0 });
  assert.ok(compareTaskDue(old, newer) < 0);
  const sameDay = [
    task({ id: 'second', order: 1 }),
    task({ id: 'first', order: 0 }),
  ];
  assert.deepEqual([...sameDay].sort(compareTaskDue).map((x) => x.id), ['first', 'second']);
});

t('goals: still going first, soonest deadline first, done at the bottom', () => {
  const goal = (o) => ({ id: 'g', widgetId: 'w', sectorId: 's', title: 'g', target: 1, current: 0, unit: '', notes: '', done: false, ...o });
  const list = [
    goal({ id: 'someday' }),
    goal({ id: 'finished', done: true, dueDate: '2026-01-01' }),
    goal({ id: 'soon', dueDate: '2026-09-09' }),
    goal({ id: 'later', dueDate: '2026-11-01' }),
  ];
  assert.deepEqual(
    [...list].sort(compareGoalDue).map((x) => x.id),
    ['soon', 'later', 'someday', 'finished'],
  );
});

t('the deadline column wins over other dates', () => {
  const fields = [
    { id: 'f1', name: 'Applied on', type: 'date' },
    { id: 'f2', name: 'Deadline', type: 'date' },
  ];
  assert.equal(dueFieldOf(fields).id, 'f2');
  assert.equal(dueFieldOf([fields[0]]).id, 'f1');
  assert.equal(dueFieldOf([{ id: 'x', name: 'Notes', type: 'text' }]), undefined);
});

t('the application tracker sorts itself by its deadline', () => {
  const built = presetById('applications').build();
  const field = built.fields.find((f) => f.id === built.sortBy);
  assert.equal(field.name, 'Deadline');
  assert.equal(built.sortDir, 'asc');
});

t('a preset offers its checklist without applying it', () => {
  const built = presetById('applications').build();
  // the suggestions travel with the widget...
  assert.deepEqual(built.steps, presetById('applications').checklist);
  assert.equal(built.steps.length, 6);
  // ...and a new row starts with nothing ticked or listed
  assert.equal(built.items, undefined);
});

t('every preset with a date column sorts by one', () => {
  for (const p of COLLECTION_PRESETS) {
    const built = p.build();
    const hasDate = built.fields.some((f) => f.type === 'date');
    assert.equal(Boolean(built.sortBy), hasDate, `${p.id} disagrees about having a date`);
  }
});

t('blank cells stay at the bottom when the sort is reversed', () => {
  const field = { id: 'd', name: 'Deadline', type: 'date' };
  const rows = [
    { id: 'blank', values: {} },
    { id: 'oct', values: { d: '2026-10-01' } },
    { id: 'sep', values: { d: '2026-09-01' } },
  ];
  const up = [...rows].sort((a, b) => compareRows(field, a.values, b.values, 1, compareBy));
  const down = [...rows].sort((a, b) => compareRows(field, a.values, b.values, -1, compareBy));
  assert.deepEqual(up.map((r) => r.id), ['sep', 'oct', 'blank']);
  assert.deepEqual(down.map((r) => r.id), ['oct', 'sep', 'blank']);
});

console.log('\nmoving a widget between tabs');

const twoTabs = () => ({
  sectors: [
    { id: 'school', name: 'School', accent: '#c', icon: 'book', order: 0, snap: true },
    { id: 'health', name: 'Health', accent: '#m', icon: 'heart', order: 1, snap: true },
  ],
  widgets: [
    { id: 'w1', sectorId: 'school', type: 'todo', title: 'To-do', x: 40, y: 40, w: 340, h: 360, z: 3, rotation: 0, tape: 'none', data: {} },
    { id: 'w2', sectorId: 'health', type: 'notes', title: 'Notes', x: 20, y: 20, w: 300, h: 200, z: 7, rotation: 0, tape: 'none', data: {} },
  ],
  tasks: [
    task({ id: 't1', widgetId: 'w1', sectorId: 'school' }),
    task({ id: 't2', widgetId: 'other', sectorId: 'school' }),
  ],
  events: [{ id: 'e1', widgetId: 'w1', sectorId: 'school', kind: 'meeting', title: 'm', date: T }],
  goals: [{ id: 'g1', widgetId: 'w1', sectorId: 'school', title: 'g', target: 1, current: 0, unit: '', notes: '', done: false }],
  contacts: [{ id: 'c1', widgetId: 'w1', sectorId: 'school', name: 'A' }],
  items: [{ id: 'i1', widgetId: 'w1', sectorId: 'school', values: {}, order: 0, createdOn: T, checklist: [], materials: [], links: [], migrations: 0 }],
  classes: [{ id: 'cl1', widgetId: 'w1', sectorId: 'school', name: 'CS 106B', colour: '#ccc', order: 0 }],
  lectures: [{ id: 'l1', classId: 'cl1', date: T, title: 'Lecture 1', body: '', updatedOn: T }],
  google: { clientId: '', links: [{ calendarId: 'cal', summary: 'c', sectorId: 'school', widgetId: 'w1', timeMin: T, writeBack: true }], pendingDeletes: [], autoSync: false },
});

t('everything filed in the widget moves with it', () => {
  const d = twoTabs();
  assert.equal(travellingWith(d, 'w1'), 6);   // task, event, goal, contact, row, class
  assert.equal(moveWidgetTo(d, 'w1', 'health', { x: 24, y: 400 }), true);

  assert.equal(d.widgets[0].sectorId, 'health');
  assert.deepEqual([d.widgets[0].x, d.widgets[0].y], [24, 400]);
  for (const rec of [d.tasks[0], d.events[0], d.goals[0], d.contacts[0], d.items[0], d.classes[0]]) {
    assert.equal(rec.sectorId, 'health', 'a record was left behind on the old tab');
  }
  // a lecture hangs off its class, so it needs no sector and can't be orphaned
  assert.equal(d.lectures[0].classId, 'cl1');
  // a synced calendar keeps pointing at the widget it belongs to
  assert.equal(d.google.links[0].sectorId, 'health');
  // ...and nothing else was touched
  assert.equal(d.tasks[1].sectorId, 'school');
  assert.equal(d.widgets[1].sectorId, 'health');
});

t('it lands on top of the board it arrives on', () => {
  const d = twoTabs();
  moveWidgetTo(d, 'w1', 'health', { x: 0, y: 0 });
  assert.equal(d.widgets[0].z, 8);   // the notes widget there was z 7
});

t('a move that would change nothing is refused', () => {
  const d = twoTabs();
  assert.equal(moveWidgetTo(d, 'w1', 'school', { x: 0, y: 0 }), false, 'same tab');
  assert.equal(moveWidgetTo(d, 'w1', 'nope', { x: 0, y: 0 }), false, 'no such tab');
  assert.equal(moveWidgetTo(d, 'ghost', 'health', { x: 0, y: 0 }), false, 'no such widget');
  // refused means untouched, so no undo step gets pushed for nothing
  assert.equal(d.widgets[0].sectorId, 'school');
  assert.equal(d.tasks[0].sectorId, 'school');
});

t('deleting a widget takes everything filed in it, classes included', () => {
  const d = twoTabs();
  dropWidgetContents(d, new Set(['w1']));
  assert.deepEqual(d.tasks.map((t) => t.id), ['t2'], 'another widget’s task survives');
  assert.deepEqual(d.events, []);
  assert.deepEqual(d.goals, []);
  assert.deepEqual(d.contacts, []);
  assert.deepEqual(d.items, []);
  assert.deepEqual(d.classes, [], 'the class went with its notebook');
  assert.deepEqual(d.lectures, [], 'and its lectures went with the class');
  assert.deepEqual(d.google.links, [], 'and we stopped syncing that calendar');
  // the widget records themselves are the caller's business
  assert.equal(d.widgets.length, 2);
});

t('a lecture belonging to a class that stays is left alone', () => {
  const d = twoTabs();
  d.classes.push({ id: 'cl2', widgetId: 'w2', sectorId: 'health', name: 'Other', colour: '#c', order: 0 });
  d.lectures.push({ id: 'l2', classId: 'cl2', date: T, title: 'Lecture 1', body: '', updatedOn: T });
  dropWidgetContents(d, new Set(['w1']));
  assert.deepEqual(d.classes.map((c) => c.id), ['cl2']);
  assert.deepEqual(d.lectures.map((l) => l.id), ['l2']);
});

t('a hand-picked widget colour survives the move', () => {
  const d = twoTabs();
  d.widgets[0].accent = '#EFCE7B';
  moveWidgetTo(d, 'w1', 'health', { x: 0, y: 0 });
  assert.equal(d.widgets[0].accent, '#EFCE7B');
});

console.log('\nthe file store');

t('every place a file can be referenced is found', () => {
  const d = {
    widgets: [
      { id: 'w1', data: { fileId: 'f1' } },
      { id: 'w2', data: { src: 'data:image/png;base64,zzz' } },   // not moved yet
      { id: 'w3', data: {} },
      { id: 'w4', data: { fileId: 'f1' } },                        // shared, counted once
    ],
    materials: [
      { id: 'm1', fileId: 'f2' },
      { id: 'm2', url: 'https://example.com/a.pdf' },
    ],
  };
  assert.deepEqual(fileIdsIn(d).sort(), ['f1', 'f2']);
});

t('a document with nothing in it references no files', () => {
  assert.deepEqual(fileIdsIn({}), []);
  assert.deepEqual(fileIdsIn({ widgets: [], materials: [] }), []);
});

t('orphans are what the store has and the document does not', () => {
  assert.deepEqual(orphans(['a', 'b', 'c'], ['b']), ['a', 'c']);
  assert.deepEqual(orphans(['a'], ['a']), []);
  assert.deepEqual(orphans([], ['a']), []);
});

t('file kinds are read from the type, falling back to the name', () => {
  assert.equal(kindOfMime('application/pdf'), 'pdf');
  assert.equal(kindOfMime('', 'Resume-2026.PDF'), 'pdf');
  assert.equal(kindOfMime('image/jpeg'), 'image');
  assert.equal(kindOfMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), 'doc');
  assert.equal(kindOfMime('', 'statement.docx'), 'doc');
  assert.equal(kindOfMime('application/zip', 'stuff.zip'), 'other');
});

t('sizes read in the unit a person would use', () => {
  assert.equal(formatBytes(394), '394 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
  // a 10 GB quota shouldn't print as "10240.0 MB"
  assert.equal(formatBytes(10 * 1024 ** 3), '10.0 GB');
});

t('a backup only inlines files it can sensibly carry', () => {
  assert.equal(shouldEmbed(0), false, 'nothing to embed');
  assert.equal(shouldEmbed(1024), true);
  assert.equal(shouldEmbed(EMBED_LIMIT), true);
  assert.equal(shouldEmbed(EMBED_LIMIT + 1), false);
});

console.log('\nclasses and lectures');

// 2026-09-07 is a Monday
const term = { days: [1, 3], time: '10:00', from: '2026-09-07', to: '2026-09-20' };

t('a weekly timetable becomes the term, date by date', () => {
  assert.deepEqual(meetingDates(term), [
    '2026-09-07', '2026-09-09',   // Mon, Wed
    '2026-09-14', '2026-09-16',
  ]);
});

t('no days or no start date means no dates, rather than a guess', () => {
  assert.deepEqual(meetingDates(undefined), []);
  assert.deepEqual(meetingDates({ days: [], from: '2026-09-07' }), []);
  assert.deepEqual(meetingDates({ days: [1] }), []);
});

t('every other week skips the weeks in between', () => {
  const fortnightly = { ...term, to: '2026-10-05', everyOtherWeek: true };
  assert.deepEqual(meetingDates(fortnightly), [
    '2026-09-07', '2026-09-09',   // week 1
    '2026-09-21', '2026-09-23',   // week 3
    '2026-10-05',                 // week 5
  ]);
});

t('a mistyped end date can not generate forever', () => {
  const silly = { days: [1, 2, 3, 4, 5], from: '2026-01-01', to: '2099-01-01' };
  assert.equal(meetingDates(silly).length, 400);
  assert.equal(meetingDates(silly, 10).length, 10);
});

t('an end date before the start falls back to a term-length window', () => {
  const backwards = { days: [1], from: '2026-09-07', to: '2026-01-01' };
  const dates = meetingDates(backwards);
  assert.ok(dates.length > 0 && dates.length <= 14);
  assert.equal(dates[0], '2026-09-07');
});

t('filling the term twice only adds what is missing', () => {
  const cls = { id: 'c1', widgetId: 'w', sectorId: 's', name: 'CS', colour: '#c', order: 0, meets: term };
  const already = [
    { id: 'l1', classId: 'c1', date: '2026-09-07', title: 'Lecture 1', body: 'notes I wrote', updatedOn: T },
    { id: 'l2', classId: 'c1', date: '2026-09-09', title: 'Lecture 2', body: '', updatedOn: T },
    { id: 'other', classId: 'c2', date: '2026-09-14', title: 'not mine', body: '', updatedOn: T },
  ];
  assert.deepEqual(missingDates(cls, already), ['2026-09-14', '2026-09-16']);
  // and once they exist, there is nothing left to add
  const full = [...already, ...missingDates(cls, already).map((date, i) => ({
    id: `n${i}`, classId: 'c1', date, title: lectureTitle(i + 2), body: '', updatedOn: T,
  }))];
  assert.deepEqual(missingDates(cls, full), []);
});

t('the timetable reads like a timetable', () => {
  assert.equal(describeMeets(term), 'Mon, Wed · 10:00');
  assert.equal(describeMeets({ ...term, endTime: '11:20', where: 'Hewlett 200' }),
    'Mon, Wed · 10:00–11:20 · Hewlett 200');
  assert.equal(describeMeets({ days: [0, 6] }), 'Sat, Sun');   // Monday-first order
  assert.equal(describeMeets(undefined), 'No times set yet');
});

t('a lecture date reads once, not twice', () => {
  const l = (date, time) => ({ id: 'x', classId: 'c', date, time, title: 'L', body: '', updatedOn: T });
  assert.equal(lectureWhen(l('2026-09-09'), '2026-09-09'), 'Today');
  assert.equal(lectureWhen(l('2026-09-10'), '2026-09-09'), 'Tomorrow');
  assert.equal(lectureWhen(l('2026-09-08'), '2026-09-09'), 'Yesterday');
  // prettyDate already leads with the weekday — "Mon Mon Sep 7" was the bug
  assert.equal(lectureWhen(l('2026-09-07'), '2026-09-09'), 'Mon Sep 7');
  assert.equal(lectureWhen(l('2026-09-07', '10:00'), '2026-09-09'), 'Mon Sep 7 · 10:00');
});

t('the next meeting is today if it is today', () => {
  assert.equal(nextMeeting(term, '2026-09-07'), '2026-09-07');
  assert.equal(nextMeeting(term, '2026-09-08'), '2026-09-09');
  assert.equal(nextMeeting(term, '2026-12-01'), null);
});

t('lectures sort by date then time, whatever order they were made in', () => {
  const list = [
    { id: 'b', classId: 'c1', date: '2026-09-09', time: '14:00', title: 'B', body: '', updatedOn: T },
    { id: 'a', classId: 'c1', date: '2026-09-09', time: '09:00', title: 'A', body: '', updatedOn: T },
    { id: 'early', classId: 'c1', date: '2026-09-07', title: 'Early', body: '', updatedOn: T },
    { id: 'nope', classId: 'other', date: '2026-09-01', title: 'Other class', body: '', updatedOn: T },
  ];
  assert.deepEqual(lecturesOf(list, 'c1').map((l) => l.id), ['early', 'a', 'b']);
});

t('the notebook opens on today, then on what is next', () => {
  const list = lecturesOf([
    { id: 'past', classId: 'c', date: '2026-09-07', title: '1', body: '', updatedOn: T },
    { id: 'now', classId: 'c', date: '2026-09-09', title: '2', body: '', updatedOn: T },
    { id: 'soon', classId: 'c', date: '2026-09-14', title: '3', body: '', updatedOn: T },
  ], 'c');
  assert.equal(currentLecture(list, '2026-09-09').id, 'now');
  assert.equal(currentLecture(list, '2026-09-10').id, 'soon');
  assert.equal(currentLecture(list, '2026-12-01').id, 'soon', 'past the end, the last one');
  assert.equal(currentLecture([], '2026-09-09'), null);
});

t('written up counts notes, not just the tick', () => {
  const list = [
    { id: 'a', classId: 'c', date: T, title: '1', body: 'I typed something', updatedOn: T },
    { id: 'b', classId: 'c', date: T, title: '2', body: '', covered: true, updatedOn: T },
    { id: 'c', classId: 'c', date: T, title: '3', body: '   ', updatedOn: T },
  ];
  assert.deepEqual(coverage(list), { done: 2, total: 3 });
});

t('a syllabus and a lecture handout are files the sweep must not eat', () => {
  const d = {
    widgets: [],
    materials: [],
    classes: [{ id: 'c1', syllabusFileId: 'syl' }],
    lectures: [{ id: 'l1', classId: 'c1', files: [{ id: 'slides', name: 's.pdf', size: 1 }] }],
  };
  assert.deepEqual(fileIdsIn(d).sort(), ['slides', 'syl']);
  assert.deepEqual(orphans(['syl', 'slides', 'junk'], fileIdsIn(d)), ['junk']);
});

console.log(`\n${pass} checks passed\n`);
