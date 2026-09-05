/**
 * Classes, and a note per lecture.
 *
 * Three depths, one card: your classes, the lectures in a class, and the note
 * for a lecture. Which one you're looking at lives in the widget's own data,
 * so the notebook is still open where you left it tomorrow.
 *
 * The bit that earns its keep is the timetable. You give a class its days and
 * time once — "Mon/Wed 10:00, 22 Sep to 5 Dec" — and it fills the term in for
 * you, numbered and dated. Nobody types thirty dates into a planner twice.
 */
import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ClassRecord, LectureNote, Meets, Sector, Widget } from '../../lib/types';
import { useDoc, useUI } from '../../lib/store';
import { Icon } from '../Icons';
import { Checkbox, Empty } from '../ui';
import { PASTELS, readableOn } from '../../lib/themes';
import { addDays, today as todayStr } from '../../lib/dates';
import {
  DAY_SHORT, WEEK_ORDER, classesOf, coverage, currentLecture, describeMeets, lectureWhen,
  lecturesOf, missingDates, nextMeeting,
} from '../../lib/classes';
import { deleteFile, putFile, urlFor } from '../../lib/files';
import { formatBytes } from '../../lib/media';
import { play } from '../../lib/sound';

export function ClassesWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const allClasses = useDoc((s) => s.doc.classes);
  const allLectures = useDoc((s) => s.doc.lectures);
  const patch = useDoc((s) => s.patchWidgetData);
  const addClass = useDoc((s) => s.addClass);
  const toast = useUI((s) => s.toast);

  const [draft, setDraft] = useState('');
  const accent = widget.accent ?? sector.accent;

  const classes = useMemo(() => classesOf(allClasses, widget.id), [allClasses, widget.id]);
  const openClass = classes.find((c) => c.id === widget.data.openClass) ?? null;

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    const id = addClass({ widgetId: widget.id, sectorId: widget.sectorId, name });
    setDraft('');
    patch(widget.id, { openClass: id, openLecture: undefined });
    toast(`${name} added. Give it a timetable and it'll fill the term in.`);
  };

  /* ---- one class, open ---- */
  if (openClass) {
    return (
      <ClassView
        widget={widget}
        cls={openClass}
        lectures={allLectures}
        accent={accent}
        onBack={() => patch(widget.id, { openClass: undefined, openLecture: undefined })}
      />
    );
  }

  /* ---- the shelf ---- */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add a class — CS 106B, Organic Chemistry…"
          aria-label="New class"
          style={{ flex: 1, padding: '8px 12px', fontSize: 13.5 }}
        />
        <button className="btn icon primary" onClick={add} aria-label="Add class" style={{ padding: 8 }}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {classes.length === 0 && (
          <Empty icon="book">
            A class each, then its lectures inside. Put the timetable in once and the term fills
            itself in — dates, times and all.
          </Empty>
        )}

        <AnimatePresence initial={false}>
          {classes.map((c) => {
            const mine = lecturesOf(allLectures, c.id);
            const seen = coverage(mine);
            const next = nextMeeting(c.meets);
            return (
              <motion.button
                key={c.id}
                layout
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => patch(widget.id, { openClass: c.id, openLecture: undefined })}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', marginBottom: 7,
                  padding: '9px 11px', borderRadius: 'var(--r)',
                  border: `3px solid ${c.colour}`,
                  background: `color-mix(in srgb, ${c.colour} 16%, var(--surface))`,
                  opacity: c.done ? 0.6 : 1,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.code && (
                    <span
                      style={{
                        padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: c.colour, color: readableOn(c.colour),
                        border: '2px solid var(--line)', flexShrink: 0,
                      }}
                    >
                      {c.code}
                    </span>
                  )}
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, minWidth: 0 }}>{c.name}</span>
                  {(c.syllabusUrl || c.syllabusFileId) && (
                    <Icon name="note" size={13} color="var(--ink-faint)" />
                  )}
                  <Icon name="chevronRight" size={14} color="var(--ink-faint)" />
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 3 }}>
                  {describeMeets(c.meets)}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                  {seen.total === 0
                    ? 'no lectures yet'
                    : `${seen.done}/${seen.total} written up`}
                  {next && ` · next ${next === todayStr() ? 'today' : next}`}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ================================================================== */
/* one class: its timetable, its syllabus, its lectures                */
/* ================================================================== */

function ClassView({
  widget, cls, lectures, accent, onBack,
}: {
  widget: Widget;
  cls: ClassRecord;
  lectures: LectureNote[];
  accent: string;
  onBack: () => void;
}) {
  const patch = useDoc((s) => s.patchWidgetData);
  const update = useDoc((s) => s.updateClass);
  const remove = useDoc((s) => s.removeClass);
  const fillTerm = useDoc((s) => s.fillTerm);
  const addLecture = useDoc((s) => s.addLecture);
  const sound = useDoc((s) => s.doc.settings.sound);
  const toast = useUI((s) => s.toast);

  const [tab, setTab] = useState<'lectures' | 'about'>('lectures');
  const [confirm, setConfirm] = useState(false);

  const mine = useMemo(() => lecturesOf(lectures, cls.id), [lectures, cls.id]);
  const openLecture = mine.find((l) => l.id === widget.data.openLecture) ?? null;
  const waiting = useMemo(() => missingDates(cls, lectures).length, [cls, lectures]);

  if (openLecture) {
    return (
      <LectureView
        lecture={openLecture}
        cls={cls}
        siblings={mine}
        onOpen={(id) => patch(widget.id, { openLecture: id })}
        onBack={() => patch(widget.id, { openLecture: undefined })}
      />
    );
  }

  const fill = () => {
    const made = fillTerm(cls.id);
    play(made ? 'pop' : 'tick', sound);
    toast(made
      ? `${made} lecture${made === 1 ? '' : 's'} added, dated and numbered.`
      : cls.meets?.days.length
        ? 'Every date in the timetable already has a lecture.'
        : 'Give it some days and a start date first.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      {/* the spine */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <button className="btn ghost tiny" onClick={onBack} aria-label="All classes" style={{ padding: 5 }}>
          <Icon name="chevronLeft" size={15} />
        </button>
        <input
          value={cls.name}
          onChange={(e) => update(cls.id, { name: e.target.value })}
          aria-label="Class name"
          style={{ flex: 1, fontWeight: 700, fontSize: 14, padding: '5px 9px', borderWidth: 2 }}
        />
        <input
          value={cls.code ?? ''}
          onChange={(e) => update(cls.id, { code: e.target.value })}
          placeholder="code"
          aria-label="Class code"
          style={{ width: 78, fontSize: 12.5, padding: '5px 8px', borderWidth: 2 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        <button
          className={`btn tiny ${tab === 'lectures' ? 'primary' : ''}`}
          onClick={() => setTab('lectures')}
        >
          Lectures {mine.length > 0 && `· ${mine.length}`}
        </button>
        <button
          className={`btn tiny ${tab === 'about' ? 'primary' : ''}`}
          onClick={() => setTab('about')}
        >
          Timetable &amp; syllabus
        </button>
      </div>

      {tab === 'about' ? (
        <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'grid', gap: 10, paddingRight: 4 }}>
          <MeetsEditor cls={cls} onChange={(meets) => update(cls.id, { meets })} />
          <Syllabus cls={cls} />

          <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 700 }}>
            Who teaches it
            <input
              value={cls.teacher ?? ''}
              onChange={(e) => update(cls.id, { teacher: e.target.value })}
              placeholder="and their office hours"
              aria-label="Teacher"
              style={{ fontSize: 12.5, padding: '5px 9px', borderWidth: 2, fontWeight: 500 }}
            />
          </label>

          <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 700 }}>
            Anything else about this class
            <textarea
              value={cls.notes ?? ''}
              onChange={(e) => update(cls.id, { notes: e.target.value })}
              rows={3}
              placeholder="Grading, the textbook, where the readings live…"
              aria-label="Class notes"
              style={{ fontSize: 12.5, fontWeight: 500 }}
            />
          </label>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)' }}>Colour</span>
            {PASTELS.map((p) => (
              <button
                key={p.id}
                onClick={() => update(cls.id, { colour: p.value })}
                aria-label={p.name}
                title={p.name}
                style={{
                  width: 22, height: 22, borderRadius: 8, padding: 0, background: p.value,
                  border: cls.colour === p.value ? '3px solid var(--ink)' : '2px solid var(--line)',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2 }}>
            <Checkbox
              checked={Boolean(cls.done)}
              onChange={() => update(cls.id, { done: !cls.done })}
              accent={accent}
              size={20}
              label="Finished this class"
            />
            <span style={{ fontSize: 12, color: 'var(--ink-soft)', flex: 1 }}>Finished with it</span>
            {confirm ? (
              <>
                <button
                  className="btn tiny"
                  style={{ background: '#E8A598' }}
                  onClick={() => { remove(cls.id); onBack(); }}
                >
                  Delete it and its notes
                </button>
                <button className="btn ghost tiny" onClick={() => setConfirm(false)}>Keep</button>
              </>
            ) : (
              <button className="btn ghost tiny" style={{ color: '#B4544A' }} onClick={() => setConfirm(true)}>
                <Icon name="trash" size={12} /> Delete
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button className="btn tiny primary" onClick={fill} title={describeMeets(cls.meets)}>
              <Icon name="repeat" size={13} />
              {waiting > 0 ? `Fill in ${waiting} lecture${waiting === 1 ? '' : 's'}` : 'Fill in the term'}
            </button>
            <button
              className="btn tiny"
              onClick={() => {
                const last = mine[mine.length - 1];
                const date = last ? addDays(last.date, 7) : todayStr();
                const id = addLecture(cls.id, date, { time: cls.meets?.time });
                patch(widget.id, { openLecture: id });
              }}
            >
              <Icon name="plus" size={13} /> One lecture
            </button>
          </div>

          <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
            {mine.length === 0 && (
              <Empty icon="book">
                No lectures yet. Set the days and times under <em>Timetable &amp; syllabus</em>, then
                fill the term in.
              </Empty>
            )}
            <AnimatePresence initial={false}>
              {mine.map((l) => (
                <LectureRow
                  key={l.id}
                  lecture={l}
                  colour={cls.colour}
                  onOpen={() => patch(widget.id, { openLecture: l.id })}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

function LectureRow({
  lecture, colour, onOpen,
}: { lecture: LectureNote; colour: string; onOpen: () => void }) {
  const update = useDoc((s) => s.updateLecture);
  const written = lecture.body.trim().length > 0;
  const isToday = lecture.date === todayStr();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
        padding: '7px 9px', borderRadius: 'var(--r)',
        border: `2px solid ${isToday ? colour : 'var(--line)'}`,
        background: isToday ? `color-mix(in srgb, ${colour} 16%, var(--surface))` : 'var(--surface)',
      }}
    >
      <Checkbox
        checked={Boolean(lecture.covered)}
        onChange={() => update(lecture.id, { covered: !lecture.covered })}
        accent={colour}
        size={19}
        label={`${lecture.title} written up`}
      />
      <button
        onClick={onOpen}
        style={{ flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', minWidth: 0 }}
      >
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{lecture.title}</span>
        <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-soft)' }}>
          {lectureWhen(lecture)}
          {written && ' · written up'}
          {lecture.files?.length ? ` · ${lecture.files.length} file${lecture.files.length === 1 ? '' : 's'}` : ''}
        </span>
      </button>
      <Icon name="chevronRight" size={14} color="var(--ink-faint)" />
    </motion.div>
  );
}

/* ================================================================== */
/* one lecture: the page you actually write on                         */
/* ================================================================== */

function LectureView({
  lecture, cls, siblings, onOpen, onBack,
}: {
  lecture: LectureNote;
  cls: ClassRecord;
  siblings: LectureNote[];
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const update = useDoc((s) => s.updateLecture);
  const remove = useDoc((s) => s.removeLecture);
  const toast = useUI((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const i = siblings.findIndex((l) => l.id === lecture.id);
  const previous = siblings[i - 1];
  const next = siblings[i + 1];

  const attach = async (files: FileList | null) => {
    const chosen = Array.from(files ?? []);
    if (!chosen.length) return;
    setBusy(true);
    try {
      const added = [];
      for (const file of chosen) {
        const stored = await putFile(file, file.name);
        added.push({ id: stored.id, name: stored.name, size: stored.size });
      }
      update(lecture.id, { files: [...(lecture.files ?? []), ...added] });
    } catch {
      toast('That file wouldn’t save, sorry.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button className="btn ghost tiny" onClick={onBack} aria-label="All lectures" style={{ padding: 5 }}>
          <Icon name="chevronLeft" size={15} />
        </button>
        <input
          value={lecture.title}
          onChange={(e) => update(lecture.id, { title: e.target.value })}
          aria-label="Lecture title"
          style={{ flex: 1, fontWeight: 700, fontSize: 13.5, padding: '5px 9px', borderWidth: 2 }}
        />
        <button
          className="btn ghost tiny"
          disabled={!previous}
          onClick={() => previous && onOpen(previous.id)}
          aria-label="Previous lecture"
          style={{ padding: 4 }}
        >
          <Icon name="chevronUp" size={14} />
        </button>
        <button
          className="btn ghost tiny"
          disabled={!next}
          onClick={() => next && onOpen(next.id)}
          aria-label="Next lecture"
          style={{ padding: 4 }}
        >
          <Icon name="chevronDown" size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
        <span
          style={{
            padding: '1px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: cls.colour, color: readableOn(cls.colour), border: '2px solid var(--line)',
          }}
        >
          {cls.code || cls.name}
        </span>
        <input
          type="date"
          value={lecture.date}
          onChange={(e) => e.target.value && update(lecture.id, { date: e.target.value })}
          aria-label="Lecture date"
          style={{ fontSize: 12, padding: '3px 7px', borderWidth: 2 }}
        />
        <input
          type="time"
          value={lecture.time ?? ''}
          onChange={(e) => update(lecture.id, { time: e.target.value || undefined })}
          aria-label="Lecture time"
          style={{ fontSize: 12, padding: '3px 7px', borderWidth: 2 }}
        />
        <span style={{ flex: 1 }} />
        <button
          className="btn ghost tiny"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          title="Slides, a handout, a photo of the board"
        >
          <Icon name={busy ? 'clock' : 'upload'} size={12} />
        </button>
        <button
          className="btn ghost tiny"
          style={{ color: '#B4544A' }}
          onClick={() => {
            for (const f of lecture.files ?? []) void deleteFile(f.id);
            remove(lecture.id);
            onBack();
          }}
          aria-label="Delete this lecture"
        >
          <Icon name="trash" size={12} />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => { void attach(e.target.files); e.target.value = ''; }}
        />
      </div>

      {(lecture.files?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {lecture.files?.map((f) => (
            <Attachment
              key={f.id}
              file={f}
              onRemove={() => {
                void deleteFile(f.id);
                update(lecture.id, { files: (lecture.files ?? []).filter((x) => x.id !== f.id) });
              }}
            />
          ))}
        </div>
      )}

      <textarea
        value={lecture.body}
        onChange={(e) => update(lecture.id, { body: e.target.value })}
        placeholder="What was said. Paste, ramble, bullet — future you only needs to recognise it."
        aria-label="Lecture notes"
        style={{ flex: 1, minHeight: 90, fontSize: 13.5, lineHeight: 1.6, resize: 'none' }}
      />

      <label style={{ display: 'grid', gap: 3, fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700 }}>
        IN THE MARGIN
        <textarea
          value={lecture.questions ?? ''}
          onChange={(e) => update(lecture.id, { questions: e.target.value })}
          rows={2}
          placeholder="Things to look up, questions to ask…"
          aria-label="Questions"
          style={{ fontSize: 12.5, fontWeight: 500 }}
        />
      </label>
    </div>
  );
}

function Attachment({
  file, onRemove,
}: { file: { id: string; name: string; size: number }; onRemove: () => void }) {
  const toast = useUI((s) => s.toast);
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 4px 2px 8px',
        borderRadius: 999, border: '2px solid var(--line)', background: 'var(--surface-2)',
        fontSize: 11, maxWidth: 200,
      }}
    >
      <button
        onClick={async () => {
          const url = await urlFor(file.id);
          if (!url) { toast('That file isn’t in this browser any more.', 'warn'); return; }
          window.open(url, '_blank', 'noopener');
        }}
        style={{
          background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: 700,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130,
        }}
        title={`${file.name} · ${formatBytes(file.size)}`}
      >
        {file.name}
      </button>
      <button
        className="btn ghost tiny"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        style={{ padding: 2, minHeight: 0 }}
      >
        <Icon name="close" size={11} />
      </button>
    </span>
  );
}

/* ================================================================== */
/* the timetable, and the syllabus                                     */
/* ================================================================== */

function MeetsEditor({ cls, onChange }: { cls: ClassRecord; onChange: (m: Meets) => void }) {
  const toggleDay = useDoc((s) => s.toggleClassDay);
  const meets: Meets = cls.meets ?? { days: [] };
  const set = (patch: Partial<Meets>) => onChange({ ...meets, ...patch });

  return (
    <div
      style={{
        display: 'grid', gap: 7, padding: 10, borderRadius: 'var(--r)',
        border: '2px dashed var(--line)', background: 'var(--surface-2)',
      }}
    >
      <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)' }}>
        WHEN IT MEETS
      </p>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {WEEK_ORDER.map((d) => {
          const on = meets.days.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggleDay(cls.id, d)}
              aria-pressed={on}
              style={{
                width: 36, height: 36, borderRadius: 999, padding: 0, fontSize: 12, fontWeight: 700,
                border: `2.5px solid ${on ? cls.colour : 'var(--line)'}`,
                background: on ? cls.colour : 'var(--surface)',
                color: on ? readableOn(cls.colour) : 'var(--ink-faint)',
              }}
            >
              {DAY_SHORT[d]}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="time"
          value={meets.time ?? ''}
          onChange={(e) => set({ time: e.target.value || undefined })}
          aria-label="Start time"
          style={{ fontSize: 12.5, padding: '4px 8px', borderWidth: 2 }}
        />
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>to</span>
        <input
          type="time"
          value={meets.endTime ?? ''}
          onChange={(e) => set({ endTime: e.target.value || undefined })}
          aria-label="End time"
          style={{ fontSize: 12.5, padding: '4px 8px', borderWidth: 2 }}
        />
        <input
          value={meets.where ?? ''}
          onChange={(e) => set({ where: e.target.value })}
          placeholder="Room, or a link"
          aria-label="Where"
          style={{ flex: 1, minWidth: 110, fontSize: 12.5, padding: '4px 8px', borderWidth: 2 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 700 }}>Term</span>
        <input
          type="date"
          value={meets.from ?? ''}
          onChange={(e) => set({ from: e.target.value || undefined })}
          aria-label="First day of term"
          style={{ fontSize: 12.5, padding: '4px 8px', borderWidth: 2 }}
        />
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>to</span>
        <input
          type="date"
          value={meets.to ?? ''}
          onChange={(e) => set({ to: e.target.value || undefined })}
          aria-label="Last day of term"
          style={{ fontSize: 12.5, padding: '4px 8px', borderWidth: 2 }}
        />
      </div>

      <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12 }}>
        <input
          type="checkbox"
          checked={Boolean(meets.everyOtherWeek)}
          onChange={(e) => set({ everyOtherWeek: e.target.checked || undefined })}
          style={{ width: 18, height: 18, padding: 0, borderWidth: 2 }}
        />
        Every other week
      </label>

      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-soft)' }}>
        {describeMeets(meets)}
        {meets.from ? '' : ' — a start date is what lets the term be filled in.'}
      </p>
    </div>
  );
}

function Syllabus({ cls }: { cls: ClassRecord }) {
  const update = useDoc((s) => s.updateClass);
  const toast = useUI((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const take = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const previous = cls.syllabusFileId;
      const stored = await putFile(file, file.name);
      update(cls.id, {
        syllabusFileId: stored.id, syllabusFileName: stored.name, syllabusSize: stored.size,
      });
      if (previous) void deleteFile(previous);
      toast(`Syllabus attached to ${cls.name}.`);
    } catch {
      toast('That file wouldn’t save, sorry.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const open = async () => {
    if (!cls.syllabusFileId) return;
    const url = await urlFor(cls.syllabusFileId);
    if (!url) { toast('That file isn’t in this browser any more.', 'warn'); return; }
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div
      style={{
        display: 'grid', gap: 7, padding: 10, borderRadius: 'var(--r)',
        border: '2px dashed var(--line)', background: 'var(--surface-2)',
      }}
    >
      <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)' }}>SYLLABUS</p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={cls.syllabusUrl ?? ''}
          onChange={(e) => update(cls.id, { syllabusUrl: e.target.value })}
          placeholder="Paste the link — Canvas, a Drive file, the course page…"
          aria-label="Syllabus link"
          style={{ flex: 1, minWidth: 150, fontSize: 12.5, padding: '5px 9px', borderWidth: 2 }}
        />
        {cls.syllabusUrl && (
          <a
            className="btn tiny"
            href={cls.syllabusUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the link"
          >
            <Icon name="link" size={12} /> Open
          </a>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn tiny" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Icon name={busy ? 'clock' : 'upload'} size={12} />
          {cls.syllabusFileId ? 'Replace the PDF' : 'Or keep the PDF here'}
        </button>
        {cls.syllabusFileId && (
          <>
            <button className="btn tiny" onClick={() => void open()}>
              <Icon name="play" size={12} /> {cls.syllabusFileName ?? 'syllabus'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              {formatBytes(cls.syllabusSize ?? 0)}
            </span>
            <button
              className="btn ghost tiny"
              onClick={() => {
                void deleteFile(cls.syllabusFileId!);
                update(cls.id, {
                  syllabusFileId: undefined, syllabusFileName: undefined, syllabusSize: undefined,
                });
              }}
              aria-label="Remove the syllabus file"
            >
              <Icon name="close" size={12} />
            </button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf,image/*,.doc,.docx,.txt,.md"
          hidden
          onChange={(e) => { void take(e.target.files); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}

/** Today's lectures, across every class. Used by the Today view. */
export function todaysLectures(
  classes: ClassRecord[],
  lectures: LectureNote[],
  date = todayStr(),
): { lecture: LectureNote; cls: ClassRecord }[] {
  const byId = new Map(classes.map((c) => [c.id, c]));
  return lectures
    .filter((l) => l.date === date && byId.has(l.classId))
    .map((l) => ({ lecture: l, cls: byId.get(l.classId)! }))
    .sort((a, b) => (a.lecture.time ?? '').localeCompare(b.lecture.time ?? ''));
}

export { currentLecture };
