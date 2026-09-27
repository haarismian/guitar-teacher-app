// The structured curriculum: levels -> lessons. Each lesson has a goal, steps,
// interactive activities, and a checklist that defines "done".

export type Activity =
  | { type: 'song'; songId: string }
  | { type: 'lick'; lickId: string }
  | { type: 'jam'; key: string; progression: string; bpm?: number; box?: number; scale?: 'minorPent' | 'majorPent' | 'blues' }
  | { type: 'metronome'; bpm: number }
  | { type: 'chords'; chords: string[] }
  | { type: 'changes'; chords: string[]; bpm: number }
  | { type: 'tuner' }
  | { type: 'addSong' };

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  focus: 'rhythm' | 'lead' | 'theory';
  steps: string[];
  activities: Activity[];
  checklist: string[];
}

export interface Level {
  id: number;
  title: string;
  goal: string;
  lessons: Lesson[];
}

export const CURRICULUM: Level[] = [
  {
    id: 1,
    title: 'Rhythm Foundations',
    goal: 'Clean open chords, smooth changes, and a steady strum.',
    lessons: [
      {
        id: 'l1-tune',
        title: 'Tune up & warm up',
        summary: 'Every session starts in tune. Learn the tuner and a quick finger warm-up.',
        minutes: 8,
        focus: 'rhythm',
        steps: [
          'Open the tuner and tune each string: E A D G B e (low to high). Pluck, let it ring, turn slowly.',
          'Warm-up "1-2-3-4": on the low E string play frets 1,2,3,4 with one finger per fret, then move to the A string. Go up all six strings and back.',
          'Set the metronome to 60 BPM and play one note per click.',
        ],
        activities: [{ type: 'tuner' }, { type: 'metronome', bpm: 60 }],
        checklist: ['I can tune my guitar with the tuner', 'I can play the 1-2-3-4 warm-up on all strings at 60 BPM'],
      },
      {
        id: 'l1-open-chords',
        title: 'Open chord check-up',
        summary: 'The eight chords behind thousands of songs: G C D Em Am E A Dm.',
        minutes: 12,
        focus: 'rhythm',
        steps: [
          'Look at each chord diagram and form the shape.',
          'Strum once slowly, then pick each string one by one. Every note should ring — fix any buzzing or muted strings.',
          'Lift your hand off, then put the shape back down. Repeat 5 times per chord.',
        ],
        activities: [{ type: 'chords', chords: ['G', 'C', 'D', 'Em', 'Am', 'E', 'A', 'Dm'] }],
        checklist: ['All 8 chords ring clearly', 'I can form each shape without looking at the diagram'],
      },
      {
        id: 'l1-changes',
        title: 'One-minute chord changes',
        summary: 'The fastest way to smooth chord changes: count how many switches you can do in a minute.',
        minutes: 12,
        focus: 'rhythm',
        steps: [
          'Pick a pair: G ↔ C, then G ↔ D, then Em ↔ C, then Am ↔ D.',
          'Strum each chord once and switch. Count how many changes you make in 60 seconds.',
          'Then try switching in time: one chord per bar with the backing track at a slow tempo.',
          'Look for "anchor" fingers that can stay put between chords (e.g. the ring finger in G → D).',
        ],
        activities: [
          { type: 'changes', chords: ['G', 'C'], bpm: 60 },
          { type: 'changes', chords: ['G', 'D'], bpm: 60 },
          { type: 'changes', chords: ['Em', 'C'], bpm: 60 },
          { type: 'changes', chords: ['Am', 'D'], bpm: 60 },
        ],
        checklist: ['30+ changes per minute for G↔C', 'I can change chords in time at 60 BPM without stopping'],
      },
      {
        id: 'l1-strum',
        title: 'Strumming: the down-up engine',
        summary: 'Keep your hand moving like a pendulum. Learn the "old faithful" pattern D - D U - U D U.',
        minutes: 12,
        focus: 'rhythm',
        steps: [
          'Mute the strings with your fretting hand and strum steady downstrokes on every click (60 BPM).',
          'Now strum down on the beat and up on the "and": 1 & 2 & 3 & 4 &.',
          'Keep that motion going but skip some strings: D - D U - U D U. The hand never stops — it just misses on the dashes.',
          'Apply it to a G chord, then play along with the backing track on G–C.',
        ],
        activities: [
          { type: 'metronome', bpm: 60 },
          { type: 'changes', chords: ['G', 'C'], bpm: 70 },
        ],
        checklist: ['My strumming hand never stops moving', 'I can play D-DU-UDU on one chord at 70 BPM'],
      },
      {
        id: 'l1-knockin',
        title: "First song: Knockin' on Heaven's Door",
        summary: 'Four chords, slow tempo. Your first complete play-along.',
        minutes: 15,
        focus: 'rhythm',
        steps: [
          'Check the four chords: G, D, Am, C.',
          'Play the backing track at 80% speed with guitar muted — you are the guitar player!',
          'First pass: one downstroke per beat. Second pass: D-DU-UDU.',
          'Watch the "next chord" box so you are ready before the change.',
        ],
        activities: [{ type: 'song', songId: 'knockin' }],
        checklist: ['I can play the whole song along with the track without stopping', 'I can do it at full speed (69 BPM)'],
      },
      {
        id: 'l1-horse',
        title: 'Two-chord groove: A Horse with No Name',
        summary: 'A faster tempo, but only two shapes. Focus on groove and consistency.',
        minutes: 10,
        focus: 'rhythm',
        steps: ['Learn the D6/9 shape (2-0-0-2-0-0).', 'Start at 70% speed and build up.', 'Accent the first beat of each bar.'],
        activities: [{ type: 'song', songId: 'horse' }],
        checklist: ['I can keep the strum going for 2 minutes at full speed'],
      },
    ],
  },
  {
    id: 2,
    title: 'Playing Songs',
    goal: 'Barre chords, new strum patterns, and learning any song from Chordify.',
    lessons: [
      {
        id: 'l2-offbeat',
        title: 'Off-beat strumming (reggae)',
        summary: 'Three Little Birds: strum only on the "ands". Great for timing.',
        minutes: 10,
        focus: 'rhythm',
        steps: ['Count "1 & 2 & 3 & 4 &" out loud.', 'Strum short, choppy downstrokes only on "&".', 'Release the pressure of your fretting hand right after each strum to cut the sound.'],
        activities: [{ type: 'song', songId: 'three-little-birds' }],
        checklist: ['I can play off-beat strums in time with the track'],
      },
      {
        id: 'l2-barre',
        title: 'Barre chords: E and A shapes',
        summary: 'Unlock every major and minor chord with two movable shapes.',
        minutes: 15,
        focus: 'rhythm',
        steps: [
          'E-shape: play an E chord with fingers 2-3-4, then slide it up and barre fret 1 with your index = F.',
          'Move it: fret 3 = G, fret 5 = A. The root is on the low E string.',
          'A-shape: barre fret 2 from the A string = B. Fret 3 = C. The root is on the A string.',
          'Don\'t squeeze harder — pull back slightly with your arm and roll the index finger onto its bony side.',
        ],
        activities: [{ type: 'chords', chords: ['F', 'F#m', 'Bm', 'Bb', 'B', 'Cm'] }, { type: 'changes', chords: ['C', 'F'], bpm: 60 }],
        checklist: ['F rings on at least 5 strings', 'I can find any major chord with the E or A shape'],
      },
      {
        id: 'l2-stand-by-me',
        title: 'Stand By Me (I–vi–IV–V)',
        summary: 'The most famous progression in pop, with your first barre chord in a song.',
        minutes: 12,
        focus: 'rhythm',
        steps: ['F#m = E-shape minor barre at fret 2.', 'Play along at 75% speed, then full speed.', 'Listen to the bass line — it tells you when the chord changes.'],
        activities: [{ type: 'song', songId: 'stand-by-me' }],
        checklist: ['I can play the full progression in time, including F#m'],
      },
      {
        id: 'l2-let-it-be',
        title: 'Let It Be',
        summary: 'Two chords in one bar ("F C") — practice faster changes.',
        minutes: 12,
        focus: 'rhythm',
        steps: ['Bars with two chords get two beats each.', 'Use Fmaj7 (xx3210) if the F barre is slowing you down.', 'Play through at 80% speed, then 100%.'],
        activities: [{ type: 'song', songId: 'let-it-be' }],
        checklist: ['I can handle the two-chords-per-bar changes'],
      },
      {
        id: 'l2-chordify',
        title: 'Learn ANY song with Chordify',
        summary: 'Look up a song on Chordify, copy its chords here, and get a backing track + solo scale.',
        minutes: 15,
        focus: 'theory',
        steps: [
          'Pick a song you love. Tap "Find on Chordify" and open it in your Chordify account.',
          'Note the key (shown in Chordify\'s song info) and the chord sequence for the verse and chorus.',
          'Tap "Add a song" here, type the chords bar by bar (e.g. "Verse: | G | D | Em | C |").',
          'The app detects the key and tells you which pentatonic scale to solo with.',
          'Use the capo field if Chordify suggests a capo — the app shows the shapes to play.',
        ],
        activities: [{ type: 'addSong' }],
        checklist: ['I added my own song to the library', 'I played it along with the generated backing track'],
      },
      {
        id: 'l2-brown-eyed',
        title: 'Brown Eyed Girl (faster changes)',
        summary: 'Upbeat tempo with quick G–C–G–D changes.',
        minutes: 12,
        focus: 'rhythm',
        steps: ['Start at 60% speed.', 'Increase 10% each time you get through cleanly.'],
        activities: [{ type: 'song', songId: 'brown-eyed-girl' }],
        checklist: ['I can play it at 80% speed or faster'],
      },
      {
        id: 'l2-capo',
        title: 'Capo & shapes: Riptide',
        summary: 'Chordify often shows chords with a capo. Learn to think in "shapes".',
        minutes: 10,
        focus: 'theory',
        steps: ['Put a capo on fret 1.', 'Play Am, G and C shapes — they sound a half-step higher.', 'The backing track plays the real (concert) pitch.'],
        activities: [{ type: 'song', songId: 'riptide' }],
        checklist: ['I understand the difference between shapes and concert pitch'],
      },
    ],
  },
  {
    id: 3,
    title: 'Pentatonic Foundations',
    goal: 'Know box 1 of the minor pentatonic in any key and start improvising.',
    lessons: [
      {
        id: 'l3-key',
        title: 'Finding the key of a song',
        summary: 'Before you solo you need the key. The key tells you where to put box 1.',
        minutes: 10,
        focus: 'theory',
        steps: [
          'Usually the song starts and ends on the key chord (the "home" chord).',
          'Open the Key Finder tool and type the chords of Zombie: Em C G D. It suggests E minor.',
          'Try a major song: G D Am C → G major.',
          'On Chordify, the key is shown in the song\'s info — compare it with the Key Finder.',
        ],
        activities: [{ type: 'song', songId: 'zombie' }],
        checklist: ['I can find the key from a list of chords'],
      },
      {
        id: 'l3-box1',
        title: 'Minor pentatonic box 1 (A minor)',
        summary: 'The single most important shape in rock and blues soloing.',
        minutes: 15,
        focus: 'lead',
        steps: [
          'The root (A) is at fret 5 on the low E string. Highlighted notes are roots.',
          'One finger per fret: index = fret 5, ring = fret 7, pinky = fret 8.',
          'Play up and down the box with the metronome at 60 BPM, one note per click.',
          'Then eighth notes (two per click). Increase by 5 BPM when it\'s clean.',
          'Say the root out loud every time you hit it.',
        ],
        activities: [
          { type: 'jam', key: 'Am', progression: 'one-chord-minor', bpm: 70, box: 1, scale: 'minorPent' },
          { type: 'metronome', bpm: 60 },
        ],
        checklist: ['I can play box 1 up and down from memory', 'Clean at 80 BPM eighth notes', 'I know where all three A roots are in the box'],
      },
      {
        id: 'l3-first-licks',
        title: 'Your first two licks',
        summary: 'Licks are vocabulary. Learn two and you can already "say" something.',
        minutes: 15,
        focus: 'lead',
        steps: ['Listen to each lick first.', 'Learn it slowly with the loop at 60% speed.', 'Play it over the A minor jam track.'],
        activities: [
          { type: 'lick', lickId: 'descending-run' },
          { type: 'lick', lickId: 'hammer-climb' },
        ],
        checklist: ['I can play both licks from memory', 'I can play them in time over a backing track'],
      },
      {
        id: 'l3-improv',
        title: 'First improvisation: 4 notes and a rest',
        summary: 'Improvising = making short phrases and leaving space. Start with tight rules.',
        minutes: 15,
        focus: 'lead',
        steps: [
          'Rule 1: play only 4 notes from box 1, then rest for a bar.',
          'Rule 2: end every phrase on the root (A).',
          'Rule 3: now use only the top 3 strings.',
          'Rule 4: mix in one of your licks every few phrases.',
        ],
        activities: [{ type: 'jam', key: 'Am', progression: 'aeolian-rock', bpm: 90, box: 1, scale: 'minorPent' }],
        checklist: ['I improvised for 3 minutes without stopping', 'My phrases end on the root'],
      },
      {
        id: 'l3-12bar',
        title: 'The 12-bar blues',
        summary: 'The form behind blues, rock & roll, and countless solos.',
        minutes: 12,
        focus: 'theory',
        steps: [
          'Listen to the track and count bars 1–12. Notice the change to the IV chord (bar 2 and 5) and the V (bar 9).',
          'Strum along with dominant 7 chords (A7 D7 E7).',
          'Then solo with A minor pentatonic box 1 — the same box works over all three chords!',
        ],
        activities: [{ type: 'song', songId: 'blues-in-a' }],
        checklist: ['I can count the 12 bars and feel when it loops', 'I can play the chords and solo over the form'],
      },
      {
        id: 'l3-transpose',
        title: 'Moving box 1 to any key',
        summary: 'Same shape, different fret. Find the root on the low E string and put your index finger there.',
        minutes: 12,
        focus: 'lead',
        steps: [
          'E minor: root at fret 12 (or 0). G minor: fret 3. B minor: fret 7. D minor: fret 10.',
          'Change the key in the jam tool and play box 1 in each key.',
          'Play your two licks in each key.',
        ],
        activities: [
          { type: 'jam', key: 'Em', progression: 'minor-pop', bpm: 90, box: 1, scale: 'minorPent' },
          { type: 'jam', key: 'Gm', progression: 'minor-vamp', bpm: 90, box: 1, scale: 'minorPent' },
        ],
        checklist: ['I can find box 1 for any minor key in under 10 seconds'],
      },
    ],
  },
  {
    id: 4,
    title: 'Lead Techniques',
    goal: 'Bends, vibrato, hammer-ons, pull-offs and slides — the expressive toolkit.',
    lessons: [
      {
        id: 'l4-bends',
        title: 'Bending in tune',
        summary: 'A bend must reach a real note. Train your ear to hit the target.',
        minutes: 15,
        focus: 'lead',
        steps: [
          'Play the target note (2 frets up), then bend up to match it.',
          'Use 3 fingers to bend: ring finger on the note, middle and index behind it.',
          'Push the G and B strings up (towards the ceiling).',
          'Learn the bend-release lick and the classic rock bend.',
        ],
        activities: [
          { type: 'lick', lickId: 'bend-release' },
          { type: 'lick', lickId: 'high-bend' },
        ],
        checklist: ['My full bends reach the target pitch', 'I can play both bend licks in time'],
      },
      {
        id: 'l4-vibrato',
        title: 'Vibrato: make notes sing',
        summary: 'Vibrato is your "voice". Small, even, in time.',
        minutes: 10,
        focus: 'lead',
        steps: [
          'Play the root on the G string (fret +2) and gently bend and release repeatedly.',
          'Aim for an even wobble — try matching eighth notes at 70 BPM.',
          'Add vibrato to the last note of every phrase you play today.',
        ],
        activities: [{ type: 'jam', key: 'Am', progression: 'minor-blues', bpm: 70, box: 1, scale: 'minorPent' }],
        checklist: ['I can hold a note with even vibrato for 2 beats'],
      },
      {
        id: 'l4-legato',
        title: 'Hammer-ons & pull-offs',
        summary: 'Smooth, fast-sounding phrases with less picking.',
        minutes: 12,
        focus: 'lead',
        steps: ['Warm up with the hammer-on climb.', 'Learn the pull-off cascade slowly — each triplet is one beat.', 'Use the loop at 60% speed until it\'s even.'],
        activities: [
          { type: 'lick', lickId: 'hammer-climb' },
          { type: 'lick', lickId: 'pull-off-cascade' },
        ],
        checklist: ['Pull-off cascade is clean at 80% speed'],
      },
      {
        id: 'l4-blues-licks',
        title: 'Blues vocabulary',
        summary: 'Three essential blues licks, including the "blue note".',
        minutes: 15,
        focus: 'lead',
        steps: ['Learn each lick.', 'Play each lick over the 12-bar blues.', 'Try starting each lick on a different beat.'],
        activities: [
          { type: 'lick', lickId: 'low-riff' },
          { type: 'lick', lickId: 'blue-note' },
          { type: 'lick', lickId: 'repeating-triplet' },
        ],
        checklist: ['I know 3 blues licks from memory'],
      },
      {
        id: 'l4-double-stops',
        title: 'Double-stops & rock and roll',
        summary: 'Chuck Berry style: two notes at once.',
        minutes: 10,
        focus: 'lead',
        steps: ['Barre one finger across the B and high e strings.', 'Play the lick over the 12-bar blues at a fast shuffle.'],
        activities: [
          { type: 'lick', lickId: 'double-stop' },
          { type: 'jam', key: 'A', progression: 'blues12', bpm: 120, box: 1, scale: 'minorPent' },
        ],
        checklist: ['I can play double-stops cleanly in time'],
      },
      {
        id: 'l4-evil-ways',
        title: 'Soloing over a groove: Evil Ways',
        summary: 'Two chords, lots of space. Apply all your techniques.',
        minutes: 15,
        focus: 'lead',
        steps: ['G minor pentatonic box 1 at fret 3.', 'Use one bend, one hammer-on, and one slide in each chorus.', 'Leave space — play in 2-bar phrases.'],
        activities: [{ type: 'song', songId: 'evil-ways' }],
        checklist: ['I soloed for 2+ minutes using bends, hammer-ons and slides'],
      },
    ],
  },
  {
    id: 5,
    title: 'Building Solos',
    goal: 'Turn licks into solos with structure, phrasing and the major pentatonic.',
    lessons: [
      {
        id: 'l5-call-response',
        title: 'Call & response',
        summary: 'Think of a solo as a conversation: a question, then an answer.',
        minutes: 12,
        focus: 'lead',
        steps: [
          'Learn the call & response lick.',
          'Invent your own: a 2-bar "question" ending on a non-root note, then a 2-bar "answer" ending on the root.',
          'Repeat over the minor blues track.',
        ],
        activities: [
          { type: 'lick', lickId: 'call-response' },
          { type: 'jam', key: 'Am', progression: 'minor-blues', bpm: 70, box: 1, scale: 'minorPent' },
        ],
        checklist: ['I can play 4 question/answer pairs in a row'],
      },
      {
        id: 'l5-compose',
        title: 'Compose a 12-bar solo from licks',
        summary: 'A solo = opener + development + ending. Assemble one from licks you know.',
        minutes: 20,
        focus: 'lead',
        steps: [
          'Bars 1–4: start with an "opener" lick (e.g. the classic rock bend).',
          'Bars 5–8: a "middle" lick that builds (repeating triplet or pull-off cascade).',
          'Bars 9–12: an "ending" lick that resolves to the root (descending run or bend-release).',
          'Use the Solo Builder in the Licks page to plan it, then play it over the 12-bar blues.',
          'Once it\'s solid, change one lick each time — that\'s the path to improvising.',
        ],
        activities: [{ type: 'jam', key: 'A', progression: 'blues12', bpm: 90, box: 1, scale: 'minorPent' }],
        checklist: ['I can play a full 12-bar solo made of 3 licks', 'I can swap one lick for another on the fly'],
      },
      {
        id: 'l5-major',
        title: 'Major pentatonic (same shapes, new home)',
        summary: 'G major pentatonic = E minor pentatonic shapes. Just land on G instead of E.',
        minutes: 15,
        focus: 'lead',
        steps: [
          'In a major key, find the relative minor (3 frets down) and use its box 1.',
          'G major → E minor box 1 at fret 12 (or open). The G roots are highlighted.',
          'Learn the sweet major ending and play it over Knockin\' on Heaven\'s Door.',
        ],
        activities: [
          { type: 'lick', lickId: 'major-sweet' },
          { type: 'song', songId: 'knockin' },
        ],
        checklist: ['I can find major pentatonic in any major key', 'My major-key solos land on the major root'],
      },
      {
        id: 'l5-southern',
        title: 'Southern rock: Sweet Home Alabama',
        summary: 'D major pentatonic over D–C–G.',
        minutes: 15,
        focus: 'lead',
        steps: ['D major pentatonic = B minor box 1 at fret 7.', 'Learn the major pentatonic climb.', 'Mix the two major licks with your own phrases.'],
        activities: [
          { type: 'lick', lickId: 'major-country' },
          { type: 'song', songId: 'sweet-home' },
        ],
        checklist: ['I improvised a major pentatonic solo over the whole loop'],
      },
      {
        id: 'l5-box2',
        title: 'Connect box 1 and box 2',
        summary: 'Break out of the box: slide up into the next shape.',
        minutes: 15,
        focus: 'lead',
        steps: ['Look at box 2 on the fretboard — it overlaps with the top of box 1.', 'Learn the slide lick.', 'Improvise moving between both boxes.'],
        activities: [
          { type: 'lick', lickId: 'slide-up' },
          { type: 'jam', key: 'Am', progression: 'aeolian-rock', bpm: 90, box: 2, scale: 'minorPent' },
        ],
        checklist: ['I can play box 2 from memory', 'I can move between box 1 and 2 while soloing'],
      },
      {
        id: 'l5-targets',
        title: 'Target the chord tones',
        summary: 'Land on notes that belong to the current chord — your solo will "follow the changes".',
        minutes: 15,
        focus: 'lead',
        steps: [
          'In the jam tool, turn on "Show chord tones" — notes of the current chord glow.',
          'Over each chord, try ending your phrase on a glowing note.',
          'Over the 12-bar blues, target C# (the 3rd of A7) and F# (the 3rd of D7).',
        ],
        activities: [{ type: 'jam', key: 'A', progression: 'blues12', bpm: 80, box: 1, scale: 'minorPent' }],
        checklist: ['I can hear the difference when I land on a chord tone'],
      },
    ],
  },
  {
    id: 6,
    title: 'Expanding the Neck',
    goal: 'All five boxes, the B.B. King box, and soloing over real songs.',
    lessons: [
      {
        id: 'l6-boxes345',
        title: 'Boxes 3, 4 and 5',
        summary: 'Complete the map so you can solo anywhere on the neck.',
        minutes: 20,
        focus: 'lead',
        steps: ['Learn one new box per session.', 'Always find the roots in each box first.', 'Play box 1 → 5 connecting them with slides.'],
        activities: [
          { type: 'jam', key: 'Am', progression: 'one-chord-minor', bpm: 70, box: 3, scale: 'minorPent' },
          { type: 'jam', key: 'Am', progression: 'one-chord-minor', bpm: 70, box: 4, scale: 'minorPent' },
          { type: 'jam', key: 'Am', progression: 'one-chord-minor', bpm: 70, box: 5, scale: 'minorPent' },
        ],
        checklist: ['I can play all 5 boxes in A minor', 'I can connect them up the neck'],
      },
      {
        id: 'l6-bb-king',
        title: 'The B.B. King box',
        summary: 'A small, magical area between boxes 1 and 2 with the root on the B string.',
        minutes: 15,
        focus: 'lead',
        steps: ['Learn the B.B. King box phrase.', 'Play over The Thrill Is Gone (B minor, fret 12 area).', 'Lots of vibrato, lots of space.'],
        activities: [
          { type: 'lick', lickId: 'bb-box' },
          { type: 'song', songId: 'thrill-is-gone' },
        ],
        checklist: ['I can solo using only the B.B. King box for a full chorus'],
      },
      {
        id: 'l6-unison',
        title: 'Unison bends & big rock moments',
        summary: 'The screaming sound of stadium rock solos.',
        minutes: 10,
        focus: 'lead',
        steps: ['Learn the unison bend lick.', 'Use it as a climax in your 12-bar solo.'],
        activities: [{ type: 'lick', lickId: 'unison-bend' }],
        checklist: ['My unison bends lock in without wobble'],
      },
      {
        id: 'l6-mix',
        title: 'Mixing major & minor pentatonic over blues',
        summary: 'The secret of B.B. King, Clapton and SRV: switch between the two.',
        minutes: 15,
        focus: 'lead',
        steps: [
          'A minor pentatonic at fret 5, A major pentatonic at fret 2 (F# minor shape).',
          'Play major pentatonic over the A7 (I chord), minor over the D7 and E7.',
          'Then just switch whenever you like and listen to the colours.',
        ],
        activities: [
          { type: 'jam', key: 'A', progression: 'blues12', bpm: 85, box: 1, scale: 'majorPent' },
          { type: 'jam', key: 'A', progression: 'blues12', bpm: 85, box: 1, scale: 'minorPent' },
        ],
        checklist: ['I can switch between major and minor pentatonic within one chorus'],
      },
      {
        id: 'l6-songs',
        title: 'Solo over real songs',
        summary: 'Bring it all together over classic solo progressions.',
        minutes: 20,
        focus: 'lead',
        steps: ['Comfortably Numb: slow, singing bends in B minor.', 'Hotel California: target the chord tones.', 'Record yourself and listen back.'],
        activities: [
          { type: 'song', songId: 'comfortably-numb-solo' },
          { type: 'song', songId: 'hotel-california-solo' },
        ],
        checklist: ['I soloed over both progressions for a full loop'],
      },
      {
        id: 'l6-perform',
        title: 'Perform: rhythm + lead in one song',
        summary: 'Strum the verses, take the solo in the break — like a real guitarist.',
        minutes: 20,
        focus: 'rhythm',
        steps: ['Pick a song from your library (or Chordify).', 'Loop: 2× verse strumming, 1× solo over the verse chords, 2× verse strumming.', 'Mute the guitar in the backing track so you cover both jobs.'],
        activities: [{ type: 'song', songId: 'wish-you-were-here' }],
        checklist: ['I performed a song switching between rhythm and lead without stopping'],
      },
    ],
  },
];

export const ALL_LESSONS: Lesson[] = CURRICULUM.flatMap((l) => l.lessons);

export function lessonLevel(lessonId: string): Level | undefined {
  return CURRICULUM.find((l) => l.lessons.some((x) => x.id === lessonId));
}

export function findLesson(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}
