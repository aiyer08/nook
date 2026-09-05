GOAL: make an app similar to notion; allows you to organize your life based on your priorities -- work, school, social, health, etc.

Rationale:
Notion is notoriously difficult to use. I remember when I first tried to use it, I used their AI build feature, but everything was SO ugly. Like the whole just format of notion is so unappealing to me. 

That's why I want to make a more personizable, custom app. 
Here's what Im envisioning:
something like google slides where you are able to make shapes and have those be adjustable widget type things 
    - Optional snap-to-grid. Free placement feels great for 5 minutes and looks like a junk drawer after a month. Let people toggle it.
I envision being able to change the colors of everything and have it be very cute and fun and custom
    - Theme tokens. Instead of coloring every widget individually, define one palette (primary, background, accent) that all widgets pull from.


Main features:
0. choose a fun kawaii character avatar (bunny, mouse, frog, etc.)
    - Avatar reacts to progress (stretches, naps, celebrates). Keep it encouraging only, never guilt-tripping — apps that shame you for overdue tasks get deleted in week two.
    - Earn cosmetics (hats, room decor, stickers) by completing things. Cheap to build, huge for retention.
    - Seasonal skins so the app feels alive in October vs. December.
1. what sectors of your life do you want to organize? work, school, social, health, etc., you select whatever 
2. There should be different tabs for each section of your life 
3. premade widget options
    - goals
    - to-do
    - calendar
    - meetings
    - people's contacts 
    - important dates 
    - notes
    - etc. 

4. it needs to be effortless when it comes to the to-do. anything you don't check off one day should become over-due for the next day. 
    - Split tasks into two types. Date-bound (dentist at 3pm Tuesday) vs. floating (finish essay draft). Only floating tasks should roll over.
    - Recurring tasks (daily meds, weekly laundry).
    - Effort tags instead of only priority. Tag things "5 min" / "deep work," then filter by energy level. Way more useful than P1/P2/P3 when you're tired.
5. there should be easy note taking features for each to-do
6. Doodle layer. A freehand pen on top of the canvas. Nothing else in this category has it and it fits your aesthetic perfectly.
7. A "Today" view that cuts across all tabs
8. UNDO FEATURE!


the app should allow you to import your own images, images from google, embed links, and more. 
    Paste a link, get an auto preview card (this is called "unfurling").
    Paste a screenshot straight from clipboard.
    Spotify / YouTube / Google Maps embeds.


UI:
Cozy paper / bullet-journal — warm off-white "paper" texture, washi tape, hand-drawn icons, tape-and-sticker collage. Reads as a scrapbook.

Roundness. border-radius is the CSS property that rounds corners. 4px reads corporate, 16–24px reads friendly, fully-round reads toy. Go 16px+ on everything and be consistent.

Chunkiness. Make things slightly too big. Fat 3px borders, oversized checkboxes, buttons with generous padding. Analogy: Duplo blocks vs. Lego — same idea, but the chunky version reads as playful and the precise version reads as technical.

Never pure white or pure black. Use 
#FFFBF5-ish cream instead of 
#FFFFFF, and a warm dark brown like 
#4A3B35 instead of 
#000000. Pure white/black is what makes screens feel clinical — it's the difference between fluorescent office lighting and a lamp.

Soft, tinted shadows. A shadow shouldn't be gray — tint it with your background color. Real-world version: a shadow on a pink wall isn't gray, it's a deeper pink. Gray shadows on colored backgrounds are the single most common thing that makes hobby apps look off.

Layer texture. One subtle paper grain or dot-grid background image beneath everything. Flat solid color reads cheap; texture reads intentional.

Color

Build a 5-color palette per theme and don't exceed it:

1 background (cream/off-white)
1 surface (slightly lighter or a soft tint, for widget cards)
1 text (warm dark brown)
1 accent (the theme's personality color)
1 muted (for borders and secondary text)

Then give each life sector its own accent — school is lavender, health is mint, work is soft blue. This is doing real work beyond looking nice: you'll recognize which sector a task belongs to before you read it, the way you find a book on your shelf by spine color rather than reading every title.

Keep pastels readable. Pastel text on pastel backgrounds is genuinely unreadable. Rule of thumb: pastels for backgrounds and fills, dark warm brown for text. Always.

Type
Rounded sans for UI. Quicksand, Nunito, Baloo 2, or Fredoka. All free on Google Fonts. Rounded letter terminals do the same job as rounded corners.
One handwritten font, used sparingly. For headers and empty-state messages only — never body text. Caveat or Patrick Hand.
Max two fonts. Three is where it starts looking like a middle-school PowerPoint.
Motion

This is the most underrated part of feeling cute, and it's cheap to add.

Standard UI animation moves in a straight line and stops. Cute UI overshoots slightly and settles — like a rubber ball landing instead of a book being set down. In code this is called a spring or bounce easing, and the library framer-motion does it in about one line.

Where to spend it:

Checkbox: little squish + bounce on check
Widget pickup: scale up ~3% and lift the shadow (it feels like you actually grabbed it)
Tab switch: content slides in from the direction you came from
Task completion: 3–5 confetti particles, not 200
Avatar: a slow idle breathing loop so it's never fully still
Voice

Copy carries as much cuteness as visuals. Empty states are your best opportunity — instead of "No tasks," try "Nothing here yet! Your bunny is taking a nap. 🌙"

The one rule: be warm about failure. Overdue tasks say "Let's try again today" not "3 DAYS OVERDUE." Your app is looking at someone's real unfinished life, and cute aesthetics with punitive language feels worse than neutral aesthetics with neutral language.

Optional but high-impact
Sound. A soft "pop" on checkoff and a page-turn on tab switch. Muted by default with an easy toggle — unexpected sound makes people close apps.
Time-of-day tinting. Warmer palette after 8pm. Makes the app feel like it's living alongside you.
What to avoid

Neon saturated brights (energetic, not cute), hard drop shadows, gradient buttons, glassmorphism blur, and emoji as functional icons — emoji render differently on every device and will break your visual consistency.