import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDoc, useUI } from '../lib/store';
import type { EffortTag, EventItem, Task } from '../lib/types';
import {
  addDays, finishedOn, greeting, isTaskDoneOn, MONTHS, prettyDate, prettyTime, recurrenceHitsOn,
  relativeDay, taskAppearsOn, today as todayStr, WEEKDAYS, parseDateStr,
} from '../lib/dates';
import { EFFORTS } from '../lib/effort';
import { Icon } from './Icons';
import { Empty } from './ui';
import { TaskRow } from './TaskRow';
import { Avatar } from './Avatar';
import { eventOnDay } from './widgets/CalendarWidget';
import { readableOn } from '../lib/themes';
import { todaysLectures } from './widgets/ClassesWidget';

export function TodayView({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useDoc((s) => s.doc);
  const addTask = useDoc((s) => s.addTask);
  const addWidget = useDoc((s) => s.addWidget);
  const setActiveSector = useDoc((s) => s.setActiveSector);
  const mood = useUI((s) => s.avatarMood);
  const [filter, setFilter] = useState<EffortTag | 'all'>('all');
  const [draft, setDraft] = useState('');
  const [target, setTarget] = useState<string>(doc.sectors[0]?.id ?? '');

  const today = todayStr();
  const sectorName = (id: string) => doc.sectors.find((s) => s.id === id)?.name ?? '';
  const sectorAccent = (id: string) => doc.sectors.find((s) => s.id === id)?.accent ?? 'var(--accent)';

  const buckets = useMemo(() => {
    const timed: { time: string; task?: Task; event?: EventItem }[] = [];
    const floating: Task[] = [];
    const habits: Task[] = [];
    const earlier: Task[] = [];
    const done: Task[] = [];
    const soon: { date: string; event?: EventItem; task?: Task }[] = [];

    for (const t of doc.tasks) {
      if (finishedOn(t, today)) { done.push(t); continue; }
      // finished on an earlier day — quietly out of the way
      if (isTaskDoneOn(t, today)) continue;
      if (t.recurrence) {
        if (recurrenceHitsOn(t.recurrence, today) && t.createdOn <= today) habits.push(t);
        continue;
      }
      if (t.kind === 'dated' && t.dueDate) {
        if (t.dueDate === today) {
          if (t.dueTime) timed.push({ time: t.dueTime, task: t });
          else floating.push(t);
        } else if (t.dueDate < today) earlier.push(t);
        else if (t.dueDate <= addDays(today, 7)) soon.push({ date: t.dueDate, task: t });
        continue;
      }
      if (taskAppearsOn(t, today)) floating.push(t);
    }

    for (const e of doc.events) {
      if (eventOnDay(e, today)) {
        timed.push({ time: e.time ?? '23:59', event: e });
      } else {
        for (let i = 1; i <= 7; i++) {
          const d = addDays(today, i);
          if (eventOnDay(e, d)) { soon.push({ date: d, event: e }); break; }
        }
      }
    }

    timed.sort((a, b) => a.time.localeCompare(b.time));
    // longest-waiting first — the thing you keep skipping shouldn't hide at the bottom
    floating.sort((a, b) => a.createdOn.localeCompare(b.createdOn));
    soon.sort((a, b) => a.date.localeCompare(b.date));
    return { timed, floating, habits, earlier, done, soon };
  }, [doc.tasks, doc.events, today]);

  const lectures = useMemo(
    () => todaysLectures(doc.classes, doc.lectures, today),
    [doc.classes, doc.lectures, today],
  );

  const pass = (e?: EffortTag) => filter === 'all' || e === filter;
  const openCount =
    buckets.timed.filter((i) => i.task).length + buckets.floating.length + buckets.habits.length;
  const total = openCount + buckets.done.length;
  const pct = total ? Math.round((buckets.done.length / total) * 100) : 0;

  const quickAdd = () => {
    const title = draft.trim();
    if (!title || !target) return;
    let widget = doc.widgets.find((w) => w.sectorId === target && w.type === 'todo');
    if (!widget) {
      const id = addWidget(target, 'todo');
      widget = useDoc.getState().doc.widgets.find((w) => w.id === id);
    }
    if (!widget) return;
    addTask({ widgetId: widget.id, sectorId: target, title, kind: 'floating' });
    setDraft('');
  };

  const d = parseDateStr(today);
  const avatarMood =
    total > 0 && buckets.done.length === total ? 'cheer' : mood === 'idle' && openCount === 0 ? 'sleepy' : mood;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'var(--bg)' }}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="scroll"
            style={{
              height: '100%', overflowY: 'auto',
              paddingTop: 'var(--safe-top)',
              paddingBottom: 'calc(24px + var(--safe-bottom))',
            }}
          >
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '22px 20px 90px' }}>
              {/* header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
                <div style={{ flex: 1 }}>
                  <p className="hand" style={{ margin: 0, fontSize: 26, color: 'var(--ink-soft)' }}>
                    {greeting()} — {doc.avatar.name} is here too
                  </p>
                  <h1 style={{ fontSize: 34, lineHeight: 1.05, marginTop: 2 }}>
                    {WEEKDAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}
                  </h1>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
                    <span className="chip">
                      <Icon name="check" size={13} /> {buckets.done.length} done today
                    </span>
                    {doc.stats.streak > 1 && (
                      <span className="chip on">
                        <Icon name="bolt" size={13} /> {doc.stats.streak}-day streak
                      </span>
                    )}
                    <span className="chip">
                      <Icon name="list" size={13} /> {openCount} left
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Avatar
                    species={doc.avatar.species}
                    color={doc.avatar.color}
                    hat={doc.avatar.hat}
                    accessory={doc.avatar.accessory}
                    mood={avatarMood}
                    size={104}
                    animate={doc.settings.motion}
                  />
                </div>
                <button className="btn icon" onClick={onClose} aria-label="Close today view">
                  <Icon name="close" size={18} />
                </button>
              </div>

              {/* progress ribbon */}
              <div
                style={{
                  height: 16, borderRadius: 999, border: '3px solid var(--line)',
                  background: 'var(--surface)', overflow: 'hidden', marginBottom: 6,
                }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Today's progress"
              >
                <motion.div
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                  style={{ height: '100%', background: 'var(--accent)' }}
                />
              </div>
              <p className="hand" style={{ margin: '0 0 16px', fontSize: 19, color: 'var(--ink-soft)' }}>
                {total === 0
                  ? 'A completely open day. Rare and good.'
                  : pct === 100
                    ? 'Everything’s ticked. Go and rest.'
                    : pct >= 50
                      ? 'Past halfway — nice going.'
                      : 'One at a time is fine.'}
              </p>

              {/* quick add */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') quickAdd(); }}
                  placeholder="Add something for today…"
                  aria-label="Quick add task"
                  style={{ flex: '1 1 220px', padding: '10px 14px' }}
                />
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  aria-label="Which tab?"
                  style={{ padding: '10px 12px', fontWeight: 700 }}
                >
                  {doc.sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button className="btn primary" onClick={quickAdd}>
                  <Icon name="plus" size={16} /> Add
                </button>
              </div>

              {/* energy filter */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-faint)' }}>
                  What have you got in you?
                </span>
                <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
                  Anything
                </button>
                {EFFORTS.map((e) => (
                  <button
                    key={e.id}
                    className={`chip ${filter === e.id ? 'on' : ''}`}
                    onClick={() => setFilter(filter === e.id ? 'all' : e.id)}
                    style={filter === e.id ? { background: `color-mix(in srgb, ${e.tint} 40%, var(--surface))`, borderColor: e.tint } : undefined}
                  >
                    <Icon name={e.icon} size={12} /> {e.label}
                  </button>
                ))}
              </div>

              {total === 0 && buckets.soon.length === 0 && (
                <Empty icon="moon">
                  Nothing here yet! Your {doc.avatar.species} is taking a nap. 🌙
                </Empty>
              )}

              {/*
                Lectures. They're dated and timed, so they belong on today's
                page — but they're read-only here: writing them up happens in
                the notebook, one tap away.
              */}
              {lectures.length > 0 && (
                <Block title="Lectures today" icon="book">
                  {lectures.map(({ lecture, cls }) => (
                    <button
                      key={lecture.id}
                      onClick={() => { setActiveSector(cls.sectorId); onClose(); }}
                      style={{
                        display: 'flex', width: '100%', gap: 9, alignItems: 'center', textAlign: 'left',
                        padding: '8px 10px', marginBottom: 6, borderRadius: 'var(--r)',
                        border: `2.5px solid ${cls.colour}`,
                        background: `color-mix(in srgb, ${cls.colour} 16%, var(--surface))`,
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 46 }}>
                        {lecture.time ?? '—'}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>
                          {cls.code || cls.name}
                          <span style={{ color: 'var(--ink-soft)', fontWeight: 600 }}> · {lecture.title}</span>
                        </span>
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-soft)' }}>
                          {[cls.meets?.where, lecture.body.trim() ? 'written up' : 'not written up yet']
                            .filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <Icon name="chevronRight" size={14} color="var(--ink-faint)" />
                    </button>
                  ))}
                </Block>
              )}

              {/* on the clock */}
              {buckets.timed.length > 0 && (
                <Block title="On the clock" icon="clock">
                  {buckets.timed.map((item, i) => {
                    if (item.task) {
                      return pass(item.task.effort) ? (
                        <ul key={item.task.id} style={{ margin: 0, padding: 0 }}>
                          <TaskRow
                            task={item.task}
                            date={today}
                            accent={sectorAccent(item.task.sectorId)}
                            sectorName={sectorName(item.task.sectorId)}
                            dense
                          />
                        </ul>
                      ) : null;
                    }
                    const e = item.event!;
                    return <EventLine key={e.id + i} event={e} accent={sectorAccent(e.sectorId)} sector={sectorName(e.sectorId)} onGo={() => { setActiveSector(e.sectorId); onClose(); }} />;
                  })}
                </Block>
              )}

              {/* habits */}
              {buckets.habits.filter((t) => pass(t.effort)).length > 0 && (
                <Block title="Every day things" icon="repeat">
                  <ul style={{ margin: 0, padding: 0 }}>
                    {buckets.habits.filter((t) => pass(t.effort)).map((t) => (
                      <TaskRow key={t.id} task={t} date={today} accent={sectorAccent(t.sectorId)} sectorName={sectorName(t.sectorId)} dense />
                    ))}
                  </ul>
                </Block>
              )}

              {/* floating */}
              {buckets.floating.filter((t) => pass(t.effort)).length > 0 && (
                <Block title="Whenever you can" icon="list">
                  <ul style={{ margin: 0, padding: 0 }}>
                    {buckets.floating.filter((t) => pass(t.effort)).map((t) => (
                      <TaskRow key={t.id} task={t} date={today} accent={sectorAccent(t.sectorId)} sectorName={sectorName(t.sectorId)} dense />
                    ))}
                  </ul>
                </Block>
              )}

              {/* dated things that slipped */}
              {buckets.earlier.filter((t) => pass(t.effort)).length > 0 && (
                <Block title="From earlier" icon="clock" note="These had a day and it passed. Move them or let them go — both fine.">
                  <ul style={{ margin: 0, padding: 0 }}>
                    {buckets.earlier.filter((t) => pass(t.effort)).map((t) => (
                      <TaskRow key={t.id} task={t} date={today} accent={sectorAccent(t.sectorId)} sectorName={sectorName(t.sectorId)} dense />
                    ))}
                  </ul>
                </Block>
              )}

              {/* coming up */}
              {buckets.soon.length > 0 && (
                <Block title="Next seven days" icon="calendar">
                  {buckets.soon.map((s, i) => (
                    s.event ? (
                      <EventLine
                        key={s.event.id + i}
                        event={s.event}
                        accent={sectorAccent(s.event.sectorId)}
                        sector={sectorName(s.event.sectorId)}
                        dateOverride={s.date}
                        onGo={() => { setActiveSector(s.event!.sectorId); onClose(); }}
                      />
                    ) : (
                      <div key={s.task!.id} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '6px 0' }}>
                        <span className="chip" style={{ minWidth: 78, justifyContent: 'center' }}>
                          {relativeDay(s.date)}
                        </span>
                        <span style={{ flex: 1, fontSize: 13.5 }}>{s.task!.title}</span>
                        <span
                          className="chip"
                          style={{ background: `color-mix(in srgb, ${sectorAccent(s.task!.sectorId)} 30%, var(--surface))`, borderColor: sectorAccent(s.task!.sectorId), fontSize: 11 }}
                        >
                          {sectorName(s.task!.sectorId)}
                        </span>
                      </div>
                    )
                  ))}
                </Block>
              )}

              {/* done */}
              {buckets.done.length > 0 && (
                <Block title={`Finished today · ${buckets.done.length}`} icon="check">
                  <ul style={{ margin: 0, padding: 0, opacity: 0.72 }}>
                    {buckets.done.map((t) => (
                      <TaskRow key={t.id} task={t} date={today} accent={sectorAccent(t.sectorId)} sectorName={sectorName(t.sectorId)} dense />
                    ))}
                  </ul>
                </Block>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Block({
  title, icon, note, children,
}: { title: string; icon: Parameters<typeof Icon>[0]['name']; note?: string; children: React.ReactNode }) {
  return (
    <section
      className="card"
      style={{ padding: '14px 16px', marginBottom: 14, boxShadow: 'var(--shadow-sm)' }}
    >
      <h2 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon name={icon} size={17} color="var(--ink-soft)" /> {title}
      </h2>
      {note && <p style={{ margin: '-4px 0 8px', fontSize: 12.5, color: 'var(--ink-soft)' }}>{note}</p>}
      {children}
    </section>
  );
}

function EventLine({
  event, accent, sector, dateOverride, onGo,
}: { event: EventItem; accent: string; sector: string; dateOverride?: string; onGo: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '6px 0' }}>
      <span
        className="chip"
        style={{
          minWidth: 78, justifyContent: 'center', background: accent, borderColor: accent,
          color: readableOn(accent, '#4A3B35'),
        }}
      >
        {dateOverride ? relativeDay(dateOverride) : event.time ? prettyTime(event.time) : prettyDate(event.date)}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, wordBreak: 'break-word' }}>
          {event.title}
        </span>
        {(event.location || event.people) && (
          <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)' }}>
            {[event.people, event.location].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
      {event.link && (
        <a className="btn tiny" href={event.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          Join
        </a>
      )}
      <button className="btn ghost tiny" onClick={onGo} title={`Go to ${sector}`}>
        {sector}
      </button>
    </div>
  );
}
