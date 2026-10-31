// תוכן התוכנית המקצועי. כל הטקסטים והכמויות מגיעים מהתוכנית המקורית.

export const VIDEOS = {
  technique: { url: 'https://www.youtube.com/watch?v=TPO_3iSPb20', label: 'טכניקת הבעיטה' },
  pivot: { url: 'https://www.youtube.com/watch?v=BwCzgBtvs6o' },
  chairKick: { url: 'https://www.youtube.com/watch?v=Iq-1U8M5GUs' },
  singleLeg: { url: 'https://www.youtube.com/watch?v=IIotJo-71Rc' },
  wallHold: { url: 'https://www.youtube.com/watch?v=SxNvrpRPgKY' },
  copenhagen: { url: 'https://www.youtube.com/watch?v=nhGK-DxiGBE' },
  deadlift: { url: 'https://www.youtube.com/watch?v=uMlKNyFFOLI' },
  quad: { url: 'https://www.youtube.com/watch?v=ClVNYSpVEow' },
  transitions: { url: 'https://www.instagram.com/reel/DbgwU6Ot1IP/', note: 'בשניות 3–6' },
  split: { url: 'https://www.instagram.com/reel/DbgwU6Ot1IP/', note: 'בשניות 7–14' },
  swings: { url: 'https://www.facebook.com/share/v/18gNXA7AVd/', note: 'בשנייה 15' },
  pancake: { url: 'https://www.facebook.com/share/v/18gNXA7AVd/', note: 'בשניות 19–28' },
  extra: { url: 'https://www.instagram.com/reel/DfCfkw2Nldw/', label: 'הדגמה נוספת' },
};

const SIDE_NAMES = {
  leg: { R: 'רגל ימין', L: 'רגל שמאל' },
  side: { R: 'צד ימין', L: 'צד שמאל' },
};

// בניית סבבים: כל תרגיל הוא רשימת סבבים, וכל סבב הוא חזרות או זמן.
function perSide(kind, target, { sets = 1, word = 'leg' } = {}) {
  const rounds = [];
  for (let s = 1; s <= sets; s++) {
    for (const side of ['R', 'L']) {
      const setLabel = sets > 1 ? ` · סט ${s}/${sets}` : '';
      rounds.push({ kind, target, side, label: SIDE_NAMES[word][side] + setLabel });
    }
  }
  return rounds;
}

function plain(kind, target, { sets = 1 } = {}) {
  const rounds = [];
  for (let s = 1; s <= sets; s++) {
    rounds.push({ kind, target, label: sets > 1 ? `סט ${s}/${sets}` : '' });
  }
  return rounds;
}

const FREE = [{ kind: 'free', label: '' }];

export const TYPE_TITLES = {
  A: 'צד הירך ושיווי משקל',
  B: 'אחורי הירך והירך הקדמית',
  SAT: 'מנוחה פעילה',
};

// הדרגה בכמות הבעיטות לפי שבוע אימון
export function kicksForWeek(tw) {
  if (tw <= 2) return 10;
  if (tw <= 4) return 15;
  if (tw <= 6) return 20;
  if (tw <= 8) return 25;
  return 30;
}

export function tierNote(tw) {
  if (tw <= 2) return 'חצי מהירות, גובה בטן';
  if (tw <= 4) return 'חצי מהירות';
  if (tw <= 8) return '70–80%, רק אחרי חימום מלא';
  return 'פעמיים בשבוע סבב מהיר (שלישי ושישי)';
}

export const TEXT = {
  painQuestion: 'כואב לך היום בירך הקדמית, במפשעה או בברך של רגל העמידה?',
  bagYes: 'בעט בשק עד פס הסימון. בהתחלה בכוח נמוך, כדי שהשוק תתרגל.',
  bagNo: 'בעט באוויר דרך מטרה תלויה (גרב מגולגלת או מגבת על חוט מהמשקוף בגובה הבעיטה). מהירות של 50–70%, בלי לנעול את הברך בסוף, להחזיר את הרגל בשליטה.',
  noBagFast: 'בלי שק לא בועטים במהירות מלאה, כדי לא להעמיס על הברך.',
  fastRound: 'סבב מהיר: 10 הבעיטות האחרונות מכל רגל במהירות של 90–100%, וכל השאר ב־70–80%.',
  painDay: 'היום כואב: כל הבעיטות במהירות של 50% לכל היותר, בלי סבב מהיר.',
  pressRelease: 'לחץ את כפות הרגליים לרצפה 5 שניות, שחרר, היכנס קצת יותר עמוק. 3 פעמים.',
  physio: 'פנה לפיזיותרפיסט לפני שמתחילים',
  stall: 'הגובה לא זז 8 שבועות. כדאי לעצור ולבדוק מחדש את התוכנית.',
  goal: 'מידל קיק נקי תוך 2–3 חודשים, בעיטה לגובה ראש תוך 9–15 חודשים.',
};

export const SAFETY = [
  'עוצמת מתיחה 6–7 מתוך 10. משיכה חזקה זה בסדר. כאב חד, דוקר או צובט: עוצרים.',
  'אף פעם לא בועטים עם משקולות על הקרסול.',
  'בלי משקולות במתיחות ב־3 החודשים הראשונים.',
  'לא מוסיפים יותר מ־20% בשבוע.',
  'בימים של אימון מואי תאי, התוכנית אחרי האימון, לא לפני.',
  'לא בודקים ולא בועטים מהר בגוף קר.',
];

export const BASELINE_RESULTS = {
  jaw: { label: 'השוק מגיעה לגובה הלסת', effect: 'התוכנית רגילה.' },
  ribs: { label: 'נעצר בגובה הצלעות', effect: 'חלק הכוח מתקצר לדקה פחות, והסיום מתארך לדקה יותר (3 דקות ספליט ופרפר).' },
  pinch: { label: 'יש צביטה בקדמת הירך', effect: 'פנה לפיזיותרפיסט לפני שמתחילים.' },
};

// חלק 1: חימום, זהה ב־A וב־B
function warmup() {
  return {
    title: 'חימום', minutes: 4,
    exercises: [
      { name: 'קפיצות קלות במקום', presc: '45 שניות', rounds: plain('secs', 45) },
      { name: 'הנפות רגל קדימה ואחורה', desc: 'מתחילים נמוך ועולים.', presc: '10 לכל רגל', videos: ['swings'], rounds: perSide('reps', 10) },
      { name: 'הנפות רגל לצד', desc: 'מתחילים נמוך ועולים.', presc: '10 לכל רגל', videos: ['swings'], rounds: perSide('reps', 10) },
      { name: 'מעברי 90/90', desc: 'ישיבה, ברכיים כפופות ב־90 מעלות, מעבירים את הברכיים מצד לצד.', presc: '10 חזרות', videos: ['transitions'], rounds: plain('reps', 10) },
      { name: 'מעברי קוסאק', desc: 'עמידה רחבה, מעבירים משקל מצד לצד עם כיפוף ברך אחת.', presc: '5 לכל צד', videos: ['transitions'], rounds: perSide('reps', 5, { word: 'side' }) },
    ],
  };
}

// בעיטות למטרה: הכמות, המהירות וההודעות נקבעות לפי היום
function targetKicks(plan) {
  const { kicks, bag, pain, fastRound, fastDay, tw } = plan;
  const notes = [];
  let rounds;
  if (pain) {
    notes.push({ tone: 'warn', text: TEXT.painDay });
  } else {
    notes.push({ tone: 'info', text: tierNote(tw) });
  }
  if (!bag && !pain) {
    if (tw >= 5) notes.push({ tone: 'info', text: 'בלי שק: כל הבעיטות במהירות של 70% לכל היותר.' });
    if (fastDay) notes.push({ tone: 'warn', text: TEXT.noBagFast });
  }
  if (fastRound) {
    notes.push({ tone: 'accent', text: TEXT.fastRound });
    rounds = [];
    for (const side of ['R', 'L']) {
      rounds.push({ kind: 'reps', target: kicks - 10, side, label: `${SIDE_NAMES.leg[side]} · 70–80%` });
      rounds.push({ kind: 'reps', target: 10, side, label: `${SIDE_NAMES.leg[side]} · סבב מהיר 90–100%` });
    }
  } else {
    rounds = perSide('reps', kicks);
  }
  return {
    name: 'בעיטות למטרה',
    desc: bag ? TEXT.bagYes : TEXT.bagNo,
    presc: `${kicks} לכל רגל`,
    notes,
    videos: ['technique'],
    rounds,
  };
}

function kicksSection(plan) {
  return {
    title: 'בעיטות', minutes: 5,
    exercises: [
      { name: 'תרגיל פיבוט', desc: 'מסובבים את כף רגל העמידה עד שהעקב פונה למטרה ומסובבים את האגן, בלי לבעוט.', presc: '5 לכל צד', videos: ['pivot'], rounds: perSide('reps', 5, { word: 'side' }) },
      { name: 'בעיטה איטית בהחזקת כיסא', presc: '5 לכל רגל', videos: ['chairKick'], rounds: perSide('reps', 5) },
      targetKicks(plan),
    ],
  };
}

function strengthSection(plan) {
  const minutes = plan.ribs ? 3 : 4;
  if (plan.type === 'A') {
    return {
      title: 'כוח', minutes,
      exercises: [
        { name: 'החזקת רגל באוויר ליד הקיר', desc: 'עמדת בעיטה מעגלית, יד על הקיר, הרגל הכי גבוה שאתה שולט בה.', presc: '2 פעמים, 15–20 שניות לכל רגל', videos: ['wallHold'], rounds: perSide('secs', 20, { sets: 2 }) },
        { name: 'פלאנק קופנהגן על הברך', desc: 'פלאנק צד, הברך העליונה על ספסל.', presc: '2 פעמים, 15 שניות לכל צד', videos: ['copenhagen'], rounds: perSide('secs', 15, { sets: 2, word: 'side' }) },
        { name: 'עמידה על רגל אחת', desc: 'עם רגל הבעיטה מורמת.', presc: '10 שניות לכל צד', videos: ['singleLeg'], rounds: perSide('secs', 10, { word: 'side' }) },
      ],
    };
  }
  const quadNotes = plan.firstThreeMonths
    ? [{ tone: 'warn', text: 'כלל בטיחות: בלי משקולות במתיחות ב־3 החודשים הראשונים.' }]
    : [];
  return {
    title: 'כוח', minutes,
    exercises: [
      { name: 'דדליפט עם ברכיים ישרות', desc: 'עם משקולות. עצירה של 3 שניות למטה, גב ישר.', presc: '2 סטים של 8', videos: ['deadlift', 'extra'], rounds: plain('reps', 8, { sets: 2 }) },
      { name: 'מתיחת ירך קדמית', desc: 'ברך על הרצפה, כף הרגל האחורית על ספסל. משקולת רק כשהתנוחה נוחה.', presc: '6 חזרות לכל צד', notes: quadNotes, videos: ['quad'], rounds: perSide('reps', 6, { word: 'side' }) },
    ],
  };
}

function splitExercise(plan, name = 'ספליט צידי רגוע או ישיבת פרפר') {
  const minutes = plan.ribs ? 3 : 2;
  return {
    name,
    desc: 'ספליט צידי רגוע על הרצפה, או ישיבת פרפר.',
    presc: `${minutes} דקות`,
    videos: ['split'],
    rounds: plain('secs', minutes * 60),
  };
}

function cooldownSection(plan) {
  const exercises = [splitExercise(plan)];
  if (plan.pressRelease) {
    exercises.push({
      name: 'לחץ־שחרור',
      desc: TEXT.pressRelease,
      presc: '3 פעמים',
      notes: [{ tone: 'info', text: 'פעמיים בשבוע בלבד: שלישי ושישי.' }],
      videos: ['split'],
      rounds: plain('reps', 3),
    });
  }
  return { title: 'סיום', minutes: plan.ribs ? 3 : 2, exercises };
}

export function buildWorkout(plan) {
  if (plan.type === 'SAT') {
    return [{
      title: 'מנוחה פעילה', minutes: null,
      note: 'מתיחות קלות, בלי בעיטות.',
      exercises: [
        { name: 'פנקייק על כיסא', desc: 'ישיבה עם רגליים פשוקות, התכופפות קדימה.', videos: ['pancake'], rounds: FREE },
        { name: 'מתיחת יונה', desc: 'רגל קדמית כפופה לרוחב לפני הגוף, רגל אחורית ישרה מאחור. מתכופפים קדימה מעל השוק הקדמית. לשני הצדדים.', rounds: FREE },
        { name: 'מעבר מסקוואט עמוק למתיחת אחוריים', rounds: FREE },
        { name: 'הנפות רגל קלות', videos: ['swings'], rounds: FREE },
        { ...splitExercise(plan, 'ספליט רגוע'), desc: 'ספליט רגוע, כמו בחלק 4 (ספליט צידי על הרצפה, או ישיבת פרפר). בלי בעיטות.' },
      ],
    }];
  }
  return [warmup(), kicksSection(plan), strengthSection(plan), cooldownSection(plan)];
}

// חימום מורחב למבחן הפתיחה ולמדידה הדו־שבועית
export function extendedWarmup() {
  return [{
    title: 'חימום מורחב', minutes: '8–10',
    exercises: [
      { name: 'ריצה במקום, קפיצות או חבל', presc: '3–4 דקות', notes: [{ tone: 'info', text: 'הטיימר על 3 דקות. אפשר להמשיך עוד דקה.' }], rounds: plain('secs', 180) },
      { name: 'הנפות רגל, מעברי 90/90 ומעברי קוסאק', presc: '2–3 דקות', videos: ['swings', 'transitions'], rounds: plain('secs', 120) },
      {
        name: 'בעיטות איטיות בהחזקת כיסא', presc: '2 דקות: 5 לגובה הבטן, אחר כך 5 לגובה הצלעות', videos: ['chairKick'],
        rounds: [
          { kind: 'reps', target: 5, label: 'גובה הבטן' },
          { kind: 'reps', target: 5, label: 'גובה הצלעות' },
        ],
      },
    ],
  }];
}
