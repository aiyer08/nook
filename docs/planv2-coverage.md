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
