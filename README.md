# Fretwise — your guitar teacher

A practice app built for iPad (works on any browser) that turns "I have 30 minutes" into a structured lesson,
and tracks your progress through a curriculum from strumming songs to soloing with the pentatonic scale.

**Live app:** https://haarismian.github.io/guitar-teacher-app/

Tip: on iPad, open it in Safari → Share → **Add to Home Screen** for a full-screen app.

## What's inside

- **Practice sessions** — pick 10–60 minutes and a focus (balanced / songs / soloing). The app builds a timed plan:
  warm-up → your next curriculum lesson → strum-along song → lick of the day → improvisation, with a timer, chime, and
  a wrap-up where you tick off lesson goals and rate licks/songs.
- **Curriculum** — 6 levels, 37 lessons: Rhythm Foundations → Playing Songs → Pentatonic Foundations → Lead Techniques →
  Building Solos → Expanding the Neck. Each lesson has steps, interactive tools, and a checklist that defines "done".
- **Songs** — built-in chord charts with a generated backing track (drums, bass, strummed guitar; mute any part),
  tempo control, section looping, "now / next" chord display, chord diagrams and capo support. Each song shows which
  pentatonic scale to solo with, and the fretboard lights up the current chord's tones.
- **Chordify workflow** — search Chordify from the app, then add the song's chords (`Verse: | G | D | Em | C |`).
  The app detects the key, builds the backing track and tells you what to solo with.
- **Jam** — backing tracks in any key (12-bar blues, minor blues, rock, pop, Dorian, Mixolydian…), with all five
  pentatonic boxes, blues/major/minor scales and chord-tone highlighting.
- **Licks** — 15 licks in tab with audio (bends, slides, vibrato), transposable to any key, plus a **solo builder**
  (opener → build → resolve over a 12-bar blues).
- **Tools** — tuner (microphone), metronome with tap tempo, key finder, chord library.
- **Progress** — streak, weekly goal, practice calendar, curriculum progress, BPM / chord-change charts, session log,
  and backup export/import. Everything is stored locally on the device.

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests (music theory, charts, session planner)
npm run build    # production build to dist/
```

Pushing to `main` (or a `claude/*` branch) builds and publishes to the `gh-pages` branch via GitHub Actions.
