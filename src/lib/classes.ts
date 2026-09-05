/**
 * Timetables, and the lectures they imply.
 *
 * A class isn't a list of dates, it's a pattern: "Mon/Wed 10am, weeks 1 to 10".
 * Typing thirty dates into a planner is exactly the sort of chore that makes
 * people stop using planners, so the dates are *generated* from the pattern —
 * and because generating is pure and repeatable, adding a week to the term or
 * fixing the time doesn't mean starting again.
 */
import type { ClassRecord, DateStr, LectureNote, Meets } from './types';
import { WEEKDAYS, addDays, daysBetween, parseDateStr, prettyDate, today as todayStr } from './dates';

/** Monday-first order for the day chips, but Date.getDay() numbering. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Every date this pattern falls on, in order.
 *
 * Capped, because a mistyped end date ("2099") shouldn't hang the tab or
 * generate ten thousand lectures.
 */
export function meetingDates(meets: Meets | undefined, limit = 400): DateStr[] {
  if (!meets || !meets.days.length || !meets.from) return [];
  const days = new Set(meets.days);
  const start = meets.from;
  const end = meets.to && meets.to >= start ? meets.to : addDays(start, 7 * 14 - 1);
  const out: DateStr[] = [];

  let cursor = start;
  while (cursor <= end && out.length < limit) {
    const d = parseDateStr(cursor);
    if (days.has(d.getDay())) {
      if (!meets.everyOtherWeek) {
        out.push(cursor);
      } else {
        // week 0, 2, 4… counted from the Monday of the first week
        const back = (parseDateStr(start).getDay() + 6) % 7;
        const firstMonday = addDays(start, -back);
        const week = Math.floor(daysBetween(firstMonday, cursor) / 7);
        if (week % 2 === 0) out.push(cursor);
      }
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** "Mon, Wed · 10:00 · Hewlett 200" — the timetable in one line. */
export function describeMeets(meets: Meets | undefined): string {
  if (!meets || !meets.days.length) return 'No times set yet';
  const days = WEEK_ORDER.filter((d) => meets.days.includes(d)).map((d) => WEEKDAYS[d]);
  const bits = [days.join(', ')];
  if (meets.time) bits.push(meets.endTime ? `${meets.time}–${meets.endTime}` : meets.time);
  if (meets.everyOtherWeek) bits.push('every other week');
  if (meets.where) bits.push(meets.where);
  return bits.join(' · ');
}

/** The next time this class meets, today included. */
export function nextMeeting(meets: Meets | undefined, today: DateStr = todayStr()): DateStr | null {
  const dates = meetingDates(meets);
  return dates.find((d) => d >= today) ?? null;
}

/**
 * How a generated lecture is titled.
 *
 * Numbered, because "Lecture 7" is how a course refers to itself; the date
 * lives in its own field so it can be re-sorted and re-read.
 */
export function lectureTitle(index: number): string {
  return `Lecture ${index + 1}`;
}

/**
 * Which dates in a pattern don't have a lecture yet.
 *
 * The point of generating twice: you set up the term in week one, the
 * timetable changes in week six, and pressing the button again fills in what's
 * missing without touching the notes you've already written.
 */
export function missingDates(
  cls: ClassRecord,
  lectures: LectureNote[],
): DateStr[] {
  const have = new Set(lectures.filter((l) => l.classId === cls.id).map((l) => l.date));
  return meetingDates(cls.meets).filter((d) => !have.has(d));
}

export function lecturesOf(lectures: LectureNote[], classId: string): LectureNote[] {
  return lectures
    .filter((l) => l.classId === classId)
    .sort((a, b) => (a.date === b.date
      ? (a.time ?? '').localeCompare(b.time ?? '')
      : a.date.localeCompare(b.date)));
}

export function classesOf(classes: ClassRecord[], widgetId: string): ClassRecord[] {
  return classes
    .filter((c) => c.widgetId === widgetId)
    .sort((a, b) => (Number(a.done ?? false) - Number(b.done ?? false)) || a.order - b.order);
}

/** The lecture you most likely want open: today's, else the next one, else the last. */
export function currentLecture(list: LectureNote[], today: DateStr = todayStr()): LectureNote | null {
  if (!list.length) return null;
  return list.find((l) => l.date === today)
    ?? list.find((l) => l.date > today)
    ?? list[list.length - 1];
}

/**
 * "Today", "Tomorrow", "Mon Sep 7" — a lecture's date, read out.
 *
 * prettyDate already leads with the weekday, so this must not add one: doing
 * both is where "Mon Mon Sep 7" came from.
 */
export function lectureWhen(l: LectureNote, today: DateStr = todayStr()): string {
  const gap = daysBetween(today, l.date);
  const when = gap === 0 ? 'Today'
    : gap === 1 ? 'Tomorrow'
      : gap === -1 ? 'Yesterday'
        : prettyDate(l.date);
  return l.time ? `${when} · ${l.time}` : when;
}

/** How much of a class you've actually written up. */
export function coverage(list: LectureNote[]): { done: number; total: number } {
  return {
    done: list.filter((l) => l.covered || l.body.trim().length > 0).length,
    total: list.length,
  };
}
