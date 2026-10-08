# Shepherd's Desk

Shepherd's Desk is a free, open-source Bible study workspace for reading,
original-language word study, and sermon preparation. It's MIT-licensed (see
`LICENSE`).

There are no accounts. Everything personal (margin notes, highlights,
sermons, journal, prayer list, memory verses, reading plan) is saved in the
visitor's own browser. The **Backup** page downloads and restores that data
as a JSON file.

## Features

- Reader with public-domain translations, a page-turn view, and Strong's
  word studies
- Public-domain Bible dictionaries (Easton's, Smith's) with search
- Sermon builder: big idea, introduction, outline points with sub-points,
  illustrations and supporting verses, application, conclusion, a
  preaching view with a timer, and Word / Markdown / PDF export
- Journal, prayer list, memory verses, reading plan, and review list
- Installable as an app (PWA) with an offline page

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in a Supabase project URL and
anon key. Supabase only serves public study data (Bible text, dictionaries,
Strong's), read-only. Without it, the reader falls back to the bundled
Psalm 23 fixture.

To load the study data into your own Supabase project, apply the migrations in
`supabase/migrations`, then run the ingest scripts (these need
`SUPABASE_SERVICE_ROLE_KEY`, which must never be exposed to the browser):

```bash
npm run ingest:public-bible
npm run ingest:dictionaries
npm run ingest:stepbible
```

## Content licensing

The code is MIT, but every text the app serves must also be redistributable.
See `OPEN_SOURCE.md` for the sources and their licenses.
