import assert from 'node:assert/strict';
import {
  addDays, daysBetween, finishedOn, isTaskDoneOn, monthGrid, recurrenceHitsOn,
  relativeDay, rolloverDays, taskAppearsOn, toDateStr,
} from '../src/lib/dates.ts';
import { toEmbed, unfurl, safeUrl, normalizeUrl } from '../src/lib/media.ts';
import { fieldsFromGoogle, toGoogleBody, readWhen } from '../src/lib/gcal-map.ts';
import { streaks, gridDays, yearDays, correlation, describeCorrelation } from '../src/lib/streaks.ts';
import { identify, fromDataCiteAttrs } from '../src/lib/papers.ts';
import { CATALOGUE } from '../src/lib/catalogue.ts';
import { GARDEN, FAVOURITES, homeFlowerOf } from '../src/lib/garden.ts';
import {
  SEED_EVERY, canWater, daysToNextStage, growthDays, nextPlot, seedsDue, stageOf, towardNextSeed,
} from '../src/lib/growth.ts';
import { skyFromCode } from '../src/lib/weather.ts';
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

console.log(`\n${pass} checks passed\n`);
