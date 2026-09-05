# Connecting Google Calendar

Nook talks to Google Calendar **directly from your browser**. There is no
server in the middle, no database, and no third party holding a token — which
is why this needs ten minutes of setup once. Google will only hand calendar
access to an app it has been told about, and the thing that tells it is an
**OAuth client ID** you create in your own Google account.

The client ID is a public identifier, not a password. It ends up in the app's
JavaScript, which is normal and fine — it's useless without you approving the
sign-in, and it only works from the web addresses you list in step 5.

---

## The steps

**1. Make a project**

Go to [console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate)
and create a project. The name is only for you — *Nook* is fine.

**2. Turn on the Calendar API**

Search the console for **Google Calendar API** and press **Enable**. Without
this, every request comes back with "API has not been used in project…".

**3. Fill in the consent screen**

**APIs & Services › OAuth consent screen**:

- User type: **External**
- App name: anything; your own email as the contact

**4. Add yourself as a test user — this is the step everyone misses**

Still under **OAuth consent screen**, open the **Audience** tab. Under **Test
users**, press **Add users** and enter the *exact* Google address you will sign
in with. Save.

Skip this and sign-in fails with:

> Access blocked: … has not completed the Google verification process.
> The app is currently being tested, and can only be accessed by
> developer-approved testers. **Error 403: access_denied**

Two things catch people here:

- It must be the **account that signs in**, which isn't necessarily the account
  that owns the Cloud project. If you built the project on a work or university
  address but sign in with Gmail, it's the **Gmail** address that goes in the
  list.
- It's an exact string match. `you@gmail.com` and `you+cal@gmail.com` are
  different entries as far as Google is concerned.

Why testing mode at all? The calendar scopes are "sensitive", so a *published*
app would face Google's verification review. Staying in **Testing** with
yourself as a test user skips that entirely. The trade is that only listed
addresses can sign in — exactly right for a personal planner.

*(Alternative: **Publish app** on that same Audience tab. Sign-in then works
for any account, but everyone gets an "unverified app" warning screen they have
to click past via **Advanced → Go to … (unsafe)**. Being a test user is the
cleaner path for one person.)*

**5. Create the client ID**

**Credentials › Create credentials › OAuth client ID › Web application**.

**6. List the addresses Nook runs on**

Under **Authorised JavaScript origins**, add every address you'll open Nook
from, exactly, with no trailing slash:

```
http://localhost:5173
https://nook-omega-gules.vercel.app
```

Leave **Authorised redirect URIs** empty. This app uses the token model, which
never redirects anywhere.

> If sign-in later fails with `redirect_uri_mismatch` or `origin_mismatch`,
> it's almost always this step — a missing address, a trailing slash, or `http`
> where it should be `https`.

**7. Paste it in**

Press **Create**, copy the **Client ID**, and paste it into Nook under
**Settings › Calendars › Set up calendar sync**. Press **Connect Google
Calendar**, approve the two permissions, and pick which calendars to pull in.

Google will warn you the app isn't verified. That's expected — it's *your*
app, in testing mode, with you as the only user. Choose **Continue**.

---

## What it asks for, and why

| Scope | What it allows |
|---|---|
| `calendar.events` | Read and write events. This is what makes sync two-way. |
| `calendar.readonly` | Read your list of calendars, so Nook can offer them to you. |

Nothing here can create or delete a calendar, or touch anything outside
Calendar.

---

## How the sync behaves

**Per calendar, you choose** which Nook widget it lands in and whether it's
two-way or read-only. Calendars Google says you can't write to (a shared
holiday feed, say) are marked read-only and can't be switched.

**Pulling is incremental.** After the first read, Nook keeps Google's sync
cursor and asks only "what changed since?" — which is also how it learns about
deletions. If the cursor goes stale (Google expires them after about a week of
silence) Nook notices and re-reads the calendar from scratch.

**Pushing happens on the next sync.** An event you create or edit in a two-way
widget is marked as pending and sent up. Updates carry Google's version marker,
so if someone else edited the same event in the meantime the write is refused
rather than clobbering them.

**Google wins conflicts.** If the same event changed in both places, the remote
version stands and Nook tells you how many were overruled. Your calendar is
shared with other people; your planner isn't.

**Deleting is careful.** Deleting a synced event in Nook does delete it in
Google — but the id is parked in a queue first, and if you press ⌘Z the delete
is called off before it ever leaves. Deleting a whole **widget or tab** never
touches Google: it removes the events from Nook and unlinks the calendar.
Tidying your board should not empty your real calendar.

**Automatic while open.** With auto-sync on, Nook checks shortly after load,
every five minutes, and whenever you come back to the tab. It never opens a
sign-in window on its own — if access has lapsed it waits for you to press
**Sync now**.

---

## Things worth knowing

- **Access lasts about an hour.** With no backend there's no refresh token, so
  Google is asked again when it expires — silently, as long as you're still
  signed in to Google in that browser. The token is held in memory only and is
  never written to storage.
- **Repeating events** arrive already expanded into individual occurrences,
  which is what you want to look at. Editing one occurrence in Nook changes
  that occurrence, not the series.
- **The first read goes back 60 days** and then forward indefinitely. That
  window is fixed per calendar when you link it, because Google requires the
  parameters to stay identical for incremental sync to work. To change it,
  unlink and relink.
- **Each browser is separate.** Nook's own data lives in `localStorage`, so
  your laptop and your phone each hold their own copy. The calendar is the one
  thing that *does* follow you, because it lives in Google.

## If something goes wrong

| What you see | What it means |
|---|---|
| **403 `access_denied`** · "has not completed the Google verification process" | The signing-in address isn't in **Test users** (step 4). Add it exactly, wait a minute, retry. |
| "The browser blocked the sign-in popup" | Allow popups for this site, then retry. |
| `origin_mismatch` / `redirect_uri_mismatch` | The address you're on isn't in step 5. |
| "API has not been used in project…" | Step 2 was skipped. |
| "No permission to write to *X*" | Google only gave you read access; Nook has marked it read-only. |
| Sync badge shows **Sync issue** | Hover it for the reason, or open the panel — the last error is shown there. |

**Re-read** on a calendar throws away the cursor and reads everything again.
It's the right button for "Nook and Google have drifted apart".
