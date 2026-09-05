import assert from 'node:assert/strict';
import {
  addDays, daysBetween, finishedOn, isTaskDoneOn, monthGrid, recurrenceHitsOn,
  relativeDay, rolloverDays, taskAppearsOn, toDateStr,
} from '../src/lib/dates.ts';
import { toEmbed, unfurl, safeUrl, normalizeUrl } from '../src/lib/media.ts';
import { fieldsFromGoogle, toGoogleBody, readWhen } from '../src/lib/gcal-map.ts';
import { streaks, gridDays, yearDays, correlation, describeCorrelation } from '../src/lib/streaks.ts';
import { identify, fromDataCiteAttrs } from '../src/lib/papers.ts';

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

console.log(`\n${pass} checks passed\n`);
