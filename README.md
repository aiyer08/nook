# Nook

A cozy, personal life planner. You pick the parts of your life you want to keep
track of, and each one becomes its own page you arrange by hand — like a
scrapbook rather than a database.

Built from the idea in [PLAN.md](./PLAN.md).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle
```

Everything is saved in your browser. There is no account and no server — Google
Calendar sync included, which talks to Google's API directly from the page.

---

## What it does

**Setup.** Choose a kawaii friend (bunny, mouse, frog, cat, bear), name them,
pick which parts of life you're sorting — Work, School, Health, Social, or
anything you type in — and pick a colour mood. Each part becomes a tab with its
own accent colour, so you recognise where something belongs before you read it.

**Pages you arrange yourself.** Widgets are dragged, resized, tilted, taped and
recoloured. Snap-to-grid is a per-page toggle, so a page can be tidy or loose.
Widgets available: to-do, goals, calendar, meetings, people, important dates,
notes, links, image, embed, habits, and a handwritten note-to-self.

**To-do that doesn't nag.** Tasks come in two kinds:

- **Floating** ("finish essay draft") rolls over on its own until it's done. The
  app says *"From yesterday — let's try again today"*, never *"3 DAYS OVERDUE"*.
- **Dated** ("dentist, 3pm Tuesday") stays on its day. Dated things that slip by
  go into a "From earlier" pile rather than following you around.

Tasks can repeat (daily / chosen weekdays / monthly), carry notes and sub-steps,
and take an **effort tag** — 5 min, 15 min, Focus, Deep work. You can filter by
effort, which is a far more useful question when you're tired than "what did I
decide was important last week".

**Today.** One view across every tab: what's on the clock, habits due, floating
work sorted longest-waiting-first, what slipped, the next seven days, and what
you've already finished. Filter the whole thing by how much energy you have.

**A friend who reacts.** Your avatar breathes when idle, perks up when you tick
something, cheers when a goal lands, and dozes off at night when the day is
clear. Ticking things earns hats, accessories and room decor (up to 130
completions), and seasonal pieces appear on their own — a pumpkin hat in autumn,
a winter hat in December. It only ever encourages; nothing scolds.

**Doodle layer.** A pen, a highlighter and an eraser draw straight over the
page, under nothing. Strokes are stored per page and are undoable.

**Bringing things in.** Paste a screenshot straight from the clipboard and it
lands on the page as an image. Drop a file, or point at an image URL. Paste a
link and get a preview card; paste a YouTube, Spotify, Vimeo, SoundCloud, Figma
or Google Maps link and get a live embed.

**Google Calendar, both ways.** Real events appear in Nook; events you make in
Nook appear in Google. Per calendar you pick which widget it lands in and
whether it's two-way or read-only. Pulling is incremental — Nook keeps Google's
sync cursor, so it learns about deletions too — and writes carry a version
marker so a colleague's edit is never clobbered. When both sides changed the
same event, **Google wins and Nook says so**. It runs on its own while the app
is open. All of it happens straight from your browser: no server, no third
party, and the access token is never written to disk. Setup takes about ten
minutes the first time — see
**[docs/google-calendar-setup.md](./docs/google-calendar-setup.md)**.

**Undo.** ⌘Z / ⌘⇧Z, eighty steps deep, covering everything — tasks, widgets,
tabs, doodles, settings, even importing a backup.

### Keys

| | |
|---|---|
| `⌘Z` / `⌘⇧Z` | undo / redo |
| `T` | today, across every tab |
| `N` | add a widget |
| `V` `P` `M` `E` | move · pen · highlighter · eraser |
| `1`–`9` | jump to a tab |
| `⌘V` | paste a screenshot or link onto the page |

---

## How it looks, and why

The plan asked for cozy paper rather than software, so:

- **Five colours per theme** — background, surface, ink, accent, muted — and
  never a sixth. Eight themes ship, two of them dark. Each life sector then gets
  its own pastel accent on top.
- **Never pure white or pure black.** Cream `#FFFBF5`, warm brown `#4A3B35`.
- **Tinted shadows.** Shadows are mixed from the ink and accent, never grey —
  the single most common thing that makes a hobby app look off.
- **Chunky and round.** 3px borders, 16–24px radii, oversized checkboxes.
- **Paper grain** from an inline SVG turbulence tile, under everything.
- **Two fonts.** Quicksand for the interface, Caveat by hand for headers and
  empty states only — never body text.
- **Springs, not slides.** Checkboxes squish then overshoot, widgets lift 3% when
  you grab them, pages slide in from the direction you came from, and a
  completed task throws five bits of confetti. Not two hundred.
- **Time-of-day tinting.** A warm amber wash builds after 8pm and fades by
  morning.
- **Sound** is off by default — a soft pop on tick, a page turn between tabs,
  synthesised in the browser so there are no audio files to load.
- Reduced-motion preferences are respected throughout.

Pastels are used for fills only. Text on a pastel chip is always the dark warm
brown, in dark themes too — that's what `readableOn()` in `src/lib/themes.ts`
enforces.

---

## Layout

```
src/
  lib/
    types.ts       the whole data model
    store.ts       zustand doc store + undo history + localStorage
    themes.ts      the eight palettes, pastels, colour maths
    dates.ts       rollover, recurrence, warm relative dates
    effort.ts      the four effort tags
    cosmetics.ts   what unlocks when
    media.ts       image downscaling, link unfurling, embeds
    sound.ts       synthesised pop / page-turn / chime
    google.ts      OAuth token handling + Calendar API v3 calls
    gcal-map.ts    Google event <-> Nook event, pure and tested
    sync.ts        the sync engine: pull, push, gravestones, conflicts
  components/
    Onboarding · TopBar · Board · WidgetFrame · DoodleLayer
    TodayView · TaskRow · Avatar · Panels · Icons · ui
    CalendarSync   connect / link / status, plus auto-sync
    widgets/       one file per widget family
```

**State.** One `Doc` object holds everything. Every change goes through
`commit(label, fn)`, which snapshots the document first — that's why undo is a
single reliable step and why the toast can say *"Undid move widget"*. Rapid
changes (dragging, typing) merge into one history entry. The document is
debounce-saved to `localStorage`; if it ever gets too big to save, the app says
so rather than silently losing work.

**Rollover is computed, not migrated.** A floating task just stores the day it
was made; whether it shows up today is derived. Nothing runs at midnight, so
the app can be closed for a week and still be right when you open it.

---

## Notes and limits

- **Google Calendar sync is two-way and needs no backend**, but it does need an
  OAuth client ID you create once in your own Google Cloud project — Google
  won't grant calendar access to an app it hasn't been told about, and there's
  no way around that from a static site. Ten minutes, walked through in the app
  and in [docs/google-calendar-setup.md](./docs/google-calendar-setup.md).
- **Apple iCloud and Outlook aren't connected.** Their feeds are iCal URLs that
  send no CORS headers, so a browser can't read them directly — that route
  needs a small proxy (one serverless function), unlike Google's API which
  allows browser calls outright.
- **Link previews are built from the URL, not fetched.** A browser can't read
  another site's `<meta>` tags (CORS), and there's no backend here. Known
  services get a real thumbnail and a proper name; everything else gets the
  domain, its favicon and a title you can rename with the pencil. It never
  invents a description it doesn't have.
- **Storage is `localStorage`, ~5 MB.** Imported images are downscaled to
  1400px and re-encoded to WebP, and Settings shows a usage meter. Export a JSON
  backup from Settings any time.
- **Nothing leaves your machine** except two things the browser fetches to draw
  a card: a favicon from DuckDuckGo and, for known services, a thumbnail. Embeds
  load from the service you pasted.

## Tests

```bash
npm test     # 21 checks on the scheduling and link logic
npm run build # TypeScript strict type-check + production bundle
```

`test/logic.test.mjs` covers the parts where a quiet bug would be worst: that a
floating task rolls over and a dated one doesn't, that recurrence ticks only the
day you ticked, that dates stay in your local timezone rather than sliding a day
in UTC, that link unfurling and embeds handle every URL shape without inventing
metadata, and that Google events survive the round trip — all-day events keeping
their exclusive end date, timed events keeping their wall-clock time, an end
before its start being corrected rather than sent.

Those modules (`dates.ts`, `media.ts`, `gcal-map.ts`) are pure, with no DOM and
no network, which is what makes covering them cheap.
