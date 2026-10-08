# Open Source Model

Shepherd's Desk is open source (MIT) and open access: every feature works
without an account.

## No accounts, no server-side user data

- The app has no sign-up, sign-in, or user sessions.
- Personal data (notes, highlights, sermons, journal, prayer, memory verses,
  reading plan, review list) is stored only in the browser's localStorage
  under the `shepherds-desk:` prefix. See `lib/local-store.ts`.
- The Backup page (`/backup`) exports and restores that data as JSON.
- Supabase is used only to read public study data with the anon key. Public
  endpoints must never require a session.

The user-owned tables created by earlier migrations (`margin_notes`,
`sermon_notes`, `journal_entries`, and so on) are no longer read or written
by the app. They're left in place so existing data isn't destroyed.

## Only redistributable content

Open-sourcing the code does not make source texts open. Every text the app
serves must have a redistribution-compatible license:

- Only translations with `license_tier = 'public_domain'` are served
  (`lib/reading-data.ts`, `app/api/passage/route.ts`).
- Copyrighted books must not be added to the repository or served by the app.

## Public-domain sources

- **Bible text:** KJV, WEB, ASV, BBE, YLT, Webster's, Douay-Rheims, Tyndale and Weymouth
  come from the [getBible API](https://getbible.net/api) (public-domain translations). The Berean
  Standard Bible comes from [BereanBible.com](https://bereanbible.com) and is dedicated to the
  public domain.
- **Dictionaries:** Easton's Bible Dictionary (1897) and Smith's Bible Dictionary (1863) are
  public domain. They were loaded from the structured
  [neuu-org/bible-dictionary-dataset](https://github.com/neuu-org/bible-dictionary-dataset),
  whose packaging is licensed CC BY 4.0, so keep this attribution.
- Entries with source "Shepherd" are Shepherd's Desk's own annotated study notes.
