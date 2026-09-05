/**
 * The three-migrations reckoning.
 *
 * A planner that only ever accumulates becomes a guilt cabinet. Once something
 * has been carried forward three times the card stops nodding along and asks
 * for a decision: do it, schedule it, or let it go.
 *
 * "Let it go" is asked about twice, and the avatar does the asking — not to
 * shame anyone, but because the pause is the entire value of the question. The
 * second answer is always accepted, and letting go is framed as a legitimate
 * outcome rather than a failure. Anyone who wants out can simply ignore this
 * card; it never blocks the row.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDoc, useUI } from '../lib/store';
import { Avatar } from './Avatar';
import { Icon } from './Icons';
import { addDays, today } from '../lib/dates';

type Phase = 'ask' | 'schedule' | 'sure1' | 'sure2';

export interface ReckoningProps {
  /** what the thing is called, for the opening line */
  title: string;
  /** how many times it has been carried */
  count: number;
  /** it was dealt with — reset the count */
  onDoIt: () => void;
  /** put it on a specific day */
  onSchedule: (date: string) => void;
  /** off the list, deliberately */
  onRelease: () => void;
  /** false when there's nowhere to put a date, so the copy stays honest */
  canSchedule?: boolean;
  /** wording differs slightly for a task versus a row in a list */
  noun?: string;
}

export function Reckoning({
  title, count, onDoIt, onSchedule, onRelease, canSchedule = true, noun = 'this',
}: ReckoningProps) {
  const avatar = useDoc((s) => s.doc.avatar);
  const motionOn = useDoc((s) => s.doc.settings.motion);
  const toast = useUI((s) => s.toast);
  const setMood = useUI((s) => s.setMood);

  const [phase, setPhase] = useState<Phase>('ask');
  const [when, setWhen] = useState(addDays(today(), 7));

  const label = title.trim() || noun;
  const short = label.length > 34 ? `${label.slice(0, 34)}…` : label;

  return (
    <div
      style={{
        border: '3px solid #D89A86',
        background: 'color-mix(in srgb, #D89A86 13%, var(--surface))',
        borderRadius: 'var(--r)',
        padding: 10,
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <span style={{ width: 48, flexShrink: 0, marginTop: -4 }}>
        <Avatar
          species={avatar.species}
          color={avatar.color}
          hat={avatar.hat}
          accessory={avatar.accessory}
          mood={phase === 'ask' ? 'idle' : 'sleepy'}
          size={58}
          animate={motionOn}
        />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phase}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.16 }}
          >
            {phase === 'ask' && (
              <>
                <p className="hand" style={{ margin: '0 0 2px', fontSize: 19, lineHeight: 1.2 }}>
                  You’ve carried “{short}” forward {count} times.
                </p>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-soft)' }}>
                  {avatar.name} isn’t judging. Three usually means one of these.
                </p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <button
                    className="btn tiny primary"
                    onClick={() => { onDoIt(); setMood('cheer', 2200); toast('Good. Count back to zero.'); }}
                  >
                    <Icon name="check" size={12} /> Do it now
                  </button>
                  <button className="btn tiny" onClick={() => setPhase('schedule')}>
                    <Icon name="calendar" size={12} /> Schedule it
                  </button>
                  <button className="btn tiny" onClick={() => setPhase('sure1')}>
                    <Icon name="leaf" size={12} /> Let it go
                  </button>
                </div>
              </>
            )}

            {phase === 'schedule' && (
              <>
                <p className="hand" style={{ margin: '0 0 6px', fontSize: 19 }}>When, then?</p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    aria-label="Schedule for"
                    style={{ padding: '4px 8px', fontSize: 12, borderWidth: 2 }}
                  />
                  <button
                    className="btn tiny primary"
                    onClick={() => { onSchedule(when); toast(`Put down for ${when}.`); setPhase('ask'); }}
                  >
                    Put it down
                  </button>
                  <button className="btn ghost tiny" onClick={() => setPhase('ask')}>Back</button>
                </div>
                {!canSchedule && (
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ink-faint)' }}>
                    There’s no date column here, so this only clears the count.
                  </p>
                )}
              </>
            )}

            {phase === 'sure1' && (
              <>
                <p className="hand" style={{ margin: '0 0 6px', fontSize: 19, lineHeight: 1.25 }}>
                  Really? {avatar.name} thinks you wanted this once.
                </p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <button className="btn tiny" onClick={() => setPhase('sure2')}>Yes, really</button>
                  <button className="btn tiny primary" onClick={() => setPhase('ask')}>
                    Actually, keep it
                  </button>
                </div>
              </>
            )}

            {phase === 'sure2' && (
              <>
                <p className="hand" style={{ margin: '0 0 5px', fontSize: 19, lineHeight: 1.25 }}>
                  Last time I’ll ask. Off the list for good?
                </p>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-soft)' }}>
                  Deciding not to do something is a real decision. ⌘Z undoes it either way.
                </p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <button
                    className="btn tiny"
                    onClick={() => { onRelease(); setMood('sleepy', 2600); toast('Let go. That was a decision, not a failure.'); }}
                  >
                    Let it go
                  </button>
                  <button className="btn ghost tiny" onClick={() => setPhase('ask')}>Keep it</button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
