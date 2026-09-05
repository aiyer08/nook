/**
 * The nudge iOS won't give you itself.
 *
 * Chrome offers to install a web app; Safari never does — the option is
 * buried in the Share sheet, and most people never find it. Since Nook is a
 * planner you'd want on your Home Screen (and it works offline once it's
 * there), it's worth one quiet mention.
 *
 * Rules: iOS Safari only, not already installed, once ever, dismissible, and
 * remembered in its own localStorage key so it can't touch the document.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './Icons';

const SEEN = 'nook.addToHome.dismissed';

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, but a Mac has no touch points
  const ios = /iPhone|iPod|iPad/.test(ua)
    || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!ios) return false;
  // Chrome and Firefox on iOS can't add to the Home Screen the same way
  return !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function alreadyInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = (navigator as { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia('(display-mode: standalone)').matches;
}

export function AddToHome() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(SEEN) === 'yes';
    } catch {
      /* private mode: just don't show it */
      dismissed = true;
    }
    if (dismissed || alreadyInstalled() || !isIosSafari()) return;
    // let the app draw first; a banner during the first paint reads as an ad
    const t = window.setTimeout(() => setShow(true), 2600);
    return () => window.clearTimeout(t);
  }, []);

  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(SEEN, 'yes');
    } catch {
      /* nothing to remember it with, and that's fine */
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          role="dialog"
          aria-label="Add Nook to your Home Screen"
          style={{
            position: 'fixed', left: 10, right: 10,
            bottom: 'calc(10px + var(--safe-bottom))',
            zIndex: 9100,
            display: 'flex', gap: 10, alignItems: 'flex-start',
            padding: '12px 12px 12px 14px',
            borderRadius: 'var(--r-lg)', border: '3px solid var(--line)',
            background: 'var(--surface)', boxShadow: 'var(--shadow-lg)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'grid',
              placeItems: 'center', border: '2.5px solid var(--line)', background: 'var(--bg)',
            }}
          >
            <Icon name="upload" size={17} color="var(--ink-soft)" />
          </span>
          <p style={{ margin: 0, flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>
            <strong style={{ fontWeight: 700 }}>Keep Nook on your Home Screen.</strong>
            {' '}Tap Share at the bottom of Safari, then <em>Add to Home Screen</em>. It opens
            full-screen after that, and works without a signal.
          </p>
          <button
            className="btn ghost tiny"
            onClick={close}
            aria-label="Not now"
            style={{ padding: 6, flexShrink: 0 }}
          >
            <Icon name="close" size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
