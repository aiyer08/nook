# PLANv2, item by item

An honest map of what got built, what became a preset rather than its own
widget, and what didn't get done.

**The shape of the answer.** PLANv2 lists roughly sixty pages. Building sixty
widgets would have been sixty things to maintain and sixty places for bugs, so
the work went into three engines and a catalogue of presets on top:

| Engine | Widget type | Covers |
|---|---|---|
| **Collection** — one row shape, four lenses (table · board · calendar · gallery) | `collection` | ~35 of the list-shaped pages |
| **Tracker** — one record per day, eight renderings | `tracker` | 16 of the log-shaped pages |
| **Spread** — one range, five layouts | `spread` | future · monthly · weekly · daily · hourly |

That's your own point 5 taken literally: *"if you build views as swappable
renderers over one data structure from the start, every future widget gets it
free."* Adding "restaurants I want to try" is now a schema, not a component.

---

## The numbered list

| # | Asked for | Status |
|---|---|---|
| 1 | Application tracker: Interested → Drafting → Submitted → Interview → Decision | **Built.** Collection preset. Board for the pipeline, calendar for deadlines, table to compare awards |
| 1 | Materials locker, attach to applications | **Built.** `materials` widget; documents kept once with a version label, attached by paper-clip chip |
| 1 | Per-application checklist, missing at a glance | **Built.** Every row has one; cards show "3 missing" without opening; overdue-with-missing goes red on the calendar |
| 2 | Habit tracker, GitHub-contributions grid | **Built.** Tracker `grid` mode |
| 2 | Current **and** longest streak, computed from the date list | **Built.** Nothing cached — both derived on render, so back-filling a forgotten day repairs the streak. 8 tests cover it |
| 3 | Papers: paste DOI/arXiv, auto-fill, one-line takeaway | **Built.** See the note on arXiv below |
| 4 | Follow-ups: person, subject, sent, nudge after N days | **Built.** Neutral → amber at the nudge → red at double |
| 4 | Waiting on them vs. waiting on me | **Built.** Separate statuses and filters |
| 5 | One list, four lenses | **Built.** This is the collection engine |
| 6 | Daily journal with preset questions | **Built.** Plus six prompt-set presets (monthly review, goal pyramid, word of the year, letter to future self, session notes, brain dump) |
| 7 | Countdown | **Built** |
| 8 | Energy/mood log, plotted against completed tasks | **Built.** Scatter plot with a correlation that refuses to claim a pattern under five days |
| 9 | Sleep hours + steps | **Built.** Tracker `bars`. Typed in for now; shaped to be filled from a fitness app later |
| 10 | Collections — blank titled list in one click | **Built.** "Blank collection", plus ~35 ready-made ones |
| 11 | Future log, monthly, weekly, daily, hourly | **Built.** All five, as the `spread` widget |
| 12 | Cycle tracker | **Built.** Flow, symptoms, and a predicted next date once there are two cycles |
| 12 | Spending log — jar/thermometer | **Built.** `thermometer`, fills or empties (debt) |
| 12 | Study hours per subject — stacked bars | **Built.** Tracker `bars` with named series |
| 13 | Books / films / shows with star ratings | **Built.** Two collection presets |
| 13 | Recipes, gratitude log, memory jar, quote page | **Built** |
| 13 | Brain dump | **Built** as a journal preset |
| 13 | Level 10 life wheel | **Built.** Seeds its spokes from *your* tabs rather than a stock list |
| 13 | Year in pixels | **Built.** 365 squares, six-colour palette, leap years handled |
| 14 | Migration count; at 3 ask do-it / schedule-it / let-it-go | **Built.** For both tasks and collection rows |
| 14 | Pet asks twice before letting go | **Built.** Your avatar asks, twice, and letting go is framed as a real decision rather than a failure |

## The per-sector lists

Built as collection presets: networking log · interview Q&A bank · portfolio
projects · skills inventory · conferences · subscription audit · monthly budget
· scholarship winnings · perpetual birthdays · people I met · "we should do
this sometime" · letters sent · concerts · restaurants · meal plan · cleaning
rotation · plant watering · pet care · packing list · travel itinerary · bucket
list · gift planner · places I've been · symptom log · workout log · self-care
menu (sorted by what you've got in you) · coping strategies · therapy notes ·
wins/brag log · things I'm letting go of · lessons learned · vision board ·
books · films & shows · recipes · currently · playlist of the month.

Built as tracker presets: habit grid · year in pixels · mood & energy · sleep ·
steps · study hours · spending · weather log · gratitude · highlight of the day
· line a day · meds & water · routine checklist · cycle · no-spend days · daily
rating.

## Aesthetic details

| Asked for | Status |
|---|---|
| Page-turn between tabs | **Built.** The page swings in on the hinge you came from |
| ±1–2° rotation on placed widgets | **Already there**, from the first build |
| Hand-drawn wobbly borders instead of rectangles | **Built.** Deterministic per widget, so an edge never shimmers on re-render. Toggleable |
| Pen textures — fineliner, brush, highlighter | **Built.** One setting, applied to every stroke. Brush is a real taper (filled outline, since SVG has no variable stroke width) |
| Washi tape tool — drag a strip, pick a pattern | **Built.** Six patterns, eight colours, drag / rotate / stretch / peel off |
| Sticker drawer unlocked by completing things | **Built.** 11 stickers, unlocking from 0 to 120 finished things, same reward pool as the avatar's hats |
| Paper clips and tape for attachments | **Built.** Gallery cards are taped-in Polaroids; locker documents wear a paper clip |
| Threading — "see p. 34" | **Built.** Two-way links between rows; deleting a row cleans up the threads pointing at it |
| **Header banners** (SVG ribbon shapes) | **Not built** |
| **Erasable undo** (visually erases rather than deleting) | **Not built.** Undo works, it just isn't animated as an erasure |

## Two things that aren't quite what the plan assumed

**arXiv's API can't be called from a browser.** The plan says "Crossref and
arXiv both have open APIs with no API key required". Crossref does send
`Access-Control-Allow-Origin: *` and works directly. arXiv's `export.arxiv.org`
sends **no CORS header at all**, so a page can't read it however key-free it is.
Rather than add a proxy, arXiv ids are resolved through **DataCite**, which
holds every arXiv DOI (`10.48550/arXiv.<id>`) and does allow browser requests.
Same result, no backend. Verified against both registries.

**"Places I've been" has no map, and the meal plan has no auto grocery list.**
Both exist as collections and work, but the map-with-pins and the
ingredients-to-shopping-list generation aren't there. Those are real features,
not styling — worth their own pass.


---

## The garden picker

The widget picker is now eleven flowers. Each is a folder: closed it's a bud on
a stem with the category in handwriting and a dewdrop holding the count; click
and the petals swing open on their hinges, staggered 40ms apart with spring
easing so it ripples rather than snapping, and a tray of seed packets slides
out beneath.

All eleven are drawn by **one** parametric SVG component — petal count, petal
silhouette, palette and growth form are data. Eight growth forms keep them
telling apart at a glance:

| Form | Flowers |
|---|---|
| `circle` — a disc with six round petals, the plainest flower there is | Daisy (Tasks & Doing) |
| `cup` — a few tall petals leaning together, still a cup when open | Tulip (Time & Planning) |
| `pompom` — concentric rings of tiny petals | Marigold (Money) |
| `ladder` — paired leaflets climbing the stem as rungs, star blooms on top | Jacob's ladder (Study & Knowledge) |
| `cluster` — several small blooms that scatter apart | Forget-me-not (People) |
| `dome` — a mound of florets | Hydrangea (Home & Places) |
| `spiral` — coiled layers seen from above | Rose (Reflection) |
| `single` — petals radiating from a centre, varied by count and silhouette | Sunflower, lotus, peony, poppy |

Built: hover sway · staggered hinge bloom · seed-packet tray · a petal that
drifts down and fades on close · search that wilts non-matching flowers rather
than filtering them · a bee that roams the whole grid and sits down twice a lap
on the flower you plant from most · unbloomed grey-green buds for categories you
haven't used · seasonal palette drift.

Lavender's spire was retired to make room for Jacob's ladder, which was asked
for by name.

Two deliberate departures:

- **The category name sits under the flower, not on the leaf.** At the size a
  leaf actually occupies (~20px in a 104px bloom) handwritten text was
  illegible. The handwriting is kept; the position moved.
- **Watering and the pressed-flower archive aren't built.** Watering is the one
  idea in the plan that crosses from cute into nagging, and you flagged that
  yourself; pressing needs an archive feature that doesn't exist yet.

---

## The mouse, the growing garden, atmosphere, focus and Wrapped

Five things that turn the app from a filing cabinet into somewhere to be.

**The burrow.** The mascot lives in the corner of the page: a hole they peek out
of, potter about in, tidy around and nap in, on a slow loop that never fully
stops. Three jobs beyond being alive:

- **Courier.** Drag a task onto them, open another tab, and they carry it there.
  There's a button in the task's own detail too, because you can't drag with a
  keyboard. The delivery makes a to-do list on the far side if the tab hasn't
  got one, so it can't fail into nothing.
- **Hide and seek.** Once a day they tuck behind one of your widgets and the
  burrow is empty. The tail pokes out from behind the card; find it and you get
  a sticker and a seed.

**The garden grows.** Every five finished things earns a seed; seeds are planted
on their own page (`G`) and grow over weeks. A plant's stage is *derived* from
the day it went in plus the distinct days you watered it — nothing stores
"stage 3" — so it keeps growing while the app is closed, back-filling works, and
there's no number to reset. Nothing is ever removed: a missed week slows the
garden, it doesn't empty it.

**Atmosphere.** Real weather from Open-Meteo (no key, `Access-Control-Allow-Origin: *`
verified against the live endpoint) drawn onto the page: rain falls over the
board, snow settles in a wobbly cap along the top edge of every widget, fog
hazes the edges, a storm flashes now and then. The location is a rough town —
browser geolocation rounded to two decimals, or typed by name. Cozy sound is
three synthesised loops (rain, café, fireplace): noise through a filter, no
files to download, off by default and faded in over a second. Lamplight after
dark is a warm pool over the middle with dimmer edges.

**Cozy focus.** Start it from a widget's menu or a task (the length comes from
the effort tag you already set). Everything dims but the widget you're in, rain
starts on the paper, the mouse curls up and sleeps beside the timer, and a
seedling grows through the session. Leave early and it stays a sprout — that is
the entire penalty. No lost streak, no red text.

**Nook Wrapped.** Things finished, the longest run *and* the best you ever had,
your busiest week and biggest day, month by month, the year as a strip of mood
colour with grey for days you didn't say, the flower you reached for most, and
the quiet numbers (seeds planted, flowers in bloom, hours focused, times you
found the mouse). Every figure is computed from what was already saved, so a
thin year says so plainly rather than inventing something.

### Still not built

- **Watering is in, pressing is not.** The pressed-flower archive still needs an
  archive feature that doesn't exist. Watering turned out fine once it was worth
  a day of growth rather than a daily obligation — skipping it just means the
  plant grows at its own pace.
- **Wrapped isn't shareable yet.** It reads well and it's built to be posted,
  but there's no image export; that wants a canvas render of the slides.
- **"Things finished" counts tasks, not tracker ticks.** A habit grid's squares
  feed the mood strip, not the headline number.
