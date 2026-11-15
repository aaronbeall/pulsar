// Reads the setup wizard's free-text answers into a structured Profile, without AI.
//
// It is a small rule-based parser, not a keyword bag:
// 1. normalize(): lowercase, expand contractions, and rewrite a few phrasings that would
//    otherwise be misread ("work out" isn't a job, "m/w/f" is three days, "mon-fri" is a range).
// 2. Numbers (days a week, minutes, age, body weight) come from regexes over that text.
// 3. Everything else is matched against a lexicon of phrases (longest match wins): entities
//    (days, goals, equipment, activities, body parts, conditions) and cue words (negation,
//    preference, injury, "busy").
// 4. A polarity scan decides, for each entity, whether it was said positively or negatively.
//    A negation cue ("not", "no", "hate", "except", "any day but") flips everything after it
//    until the clause ends; a list ("no running, jumping or burpees") carries the polarity
//    along; a cue after its entity ("Thursdays don't work", "burpees are the worst") reaches
//    back over the clause. Injury cues ("bad", "hurts", "surgery") turn a nearby body part into
//    a limit instead of a focus, and "busy" cues ("I work Saturdays") rule out nearby days.
//
// Pure logic, no React — see parseAnswers.test.ts for the phrasings it handles.

import type { DayOfWeek } from '../../models/types';
import {
  Activity, Condition, Equipment, Focus, GOALS, GYM_EQUIPMENT, Goal, Level, Limit, Profile, emptyProfile,
} from './profile';

/** Which wizard question an answer belongs to (matches constants/prompts.ts order). */
export const QUESTION = { goals: 0, equipment: 1, schedule: 2, other: 3 } as const;

const WEEKDAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKEND: DayOfWeek[] = ['Saturday', 'Sunday'];
const WEEK_ORDER: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ---------------------------------------------------------------------------------------------
// Lexicon

type Item =
  | { k: 'day'; days: DayOfWeek[] }
  | { k: 'goal'; goals: Partial<Record<Goal, number>> }
  | { k: 'equip'; equip: Equipment[] | 'gym' | 'none'; ctx?: boolean } // ctx: only in the equipment answer
  | { k: 'activity'; a: Activity; goals?: Partial<Record<Goal, number>>; equip?: Equipment }
  | { k: 'part'; focus?: Focus; limit?: Limit; always?: boolean; condition?: Condition }
  | { k: 'condition'; c: Condition }
  | { k: 'level'; level: Level }
  | { k: 'neg' } | { k: 'pos' } | { k: 'injury' } | { k: 'busy' } | { k: 'boundary' } | { k: 'only' };

const ENTITY_KINDS = new Set(['day', 'goal', 'equip', 'activity', 'part', 'condition', 'level', 'injury']);

const day = (...days: DayOfWeek[]): Item => ({ k: 'day', days });
const goal = (goals: Partial<Record<Goal, number>>): Item => ({ k: 'goal', goals });
const equip = (equipment: Equipment[] | 'gym' | 'none', ctx?: boolean): Item => ({ k: 'equip', equip: equipment, ctx });
const act = (a: Activity, goals?: Partial<Record<Goal, number>>, equipment?: Equipment): Item => ({ k: 'activity', a, goals, equip: equipment });
const part = (p: { focus?: Focus; limit?: Limit; always?: boolean; condition?: Condition }): Item => ({ k: 'part', ...p });
const cond = (c: Condition): Item => ({ k: 'condition', c });
const lvl = (level: Level): Item => ({ k: 'level', level });
const NEG: Item = { k: 'neg' };
const POS: Item = { k: 'pos' };
const INJURY: Item = { k: 'injury' };
const BUSY: Item = { k: 'busy' };
const BOUNDARY: Item = { k: 'boundary' };

const LEXICON: Array<[string, Item]> = [
  // Days
  ['monday|mon', day('Monday')],
  ['tuesday|tue|tues', day('Tuesday')],
  ['wednesday|wed|weds', day('Wednesday')],
  ['thursday|thu|thur|thurs', day('Thursday')],
  ['friday|fri', day('Friday')],
  ['saturday|sat', day('Saturday')],
  ['sunday|sun', day('Sunday')],
  ['weekday|week day|work day|workday|week night|weeknight', day(...WEEKDAYS)],
  ['weekend', day(...WEEKEND)],

  // Goals
  ['strength|strong|stronger|strongest|powerlifting|powerlifter|powerlift|lift heavy|heavy lifting|heavier|heavy weight|power|pr|1rm|max out|bench press', goal({ strength: 1 })],
  ['muscle|muscular|bulk|bulky|bulk up|mass|hypertrophy|bigger|size|jacked|swole|gains|bodybuilding|bodybuilder|buff|beefy|huge|build muscle|gain muscle|put on muscle', goal({ muscle: 1 })],
  ['tone|toned|toning|tone up|definition|defined|sculpt|sculpted', goal({ muscle: 0.5, fatLoss: 0.6 })],
  ['ripped|shredded|aesthetic', goal({ muscle: 0.6, fatLoss: 0.8 })],
  ['lose|losing|lose weight|losing weight|weight loss|lose fat|fat loss|burn fat|fat burning|belly fat|drop weight|drop pound|shed|slim|slimmer|slim down|lean|leaner|lean out|cut|cutting|trim|trimmer|skinny|skinnier|get thin|thinner|fat|calorie', goal({ fatLoss: 1 })],
  ['endurance|stamina|aerobic|marathon|half marathon|5k|10k|triathlon|race|conditioning|out of breath|wind|cardiovascular|heart health|lung', goal({ endurance: 1 })],
  ['flexible|flexibility|mobility|mobile|stretch|stretching|stretchy|limber|posture|stiff|stiffness|balance|range of motion|loosen up', goal({ mobility: 1 })],
  ['athletic|athlete|sport|speed|faster|quicker|agility|agile|explosive|explosiveness|jump higher|vertical|sprint|sprinting|basketball|soccer|football|tennis|volleyball|hockey|baseball|rugby|pickleball|martial art|mma|climbing|skiing|golf', goal({ athletic: 1 })],
  ['health|healthy|healthier|fit|fitter|fitness|in shape|into shape|shape|feel better|feel good|energy|energetic|longevity|live longer|active|more active|maintain|maintenance|wellness|well being|overall|general|consistent|consistency|habit', goal({ general: 1 })],

  // Activities (liked or avoided). Some imply a goal or a piece of equipment when liked.
  ['run|running|runner|jog|jogging|jogger', act('running', { endurance: 0.6 })],
  ['jump|jumping|jumping jack|plyo|plyometric|high impact|impact|hop|hopping|box jump|jump squat', act('jumping')],
  ['burpee', act('burpees')],
  ['cardio', act('cardio', { endurance: 0.5, fatLoss: 0.3 })],
  ['swim|swimming|swimmer|lap', act('swimming', { endurance: 0.5 }, 'pool')],
  ['bike|biking|cycling|cycle|cyclist|spin|spinning|spin class|peloton', act('cycling', { endurance: 0.5 }, 'bike')],
  ['rowing|erg', act('rowing', { endurance: 0.4 }, 'rower')],
  ['walk|walking|hike|hiking|step', act('walking', { general: 0.3 })],
  ['yoga|pilates', act('yoga', { mobility: 0.6 })],
  ['boxing|kickboxing|punching|boxer', act('boxing', { fatLoss: 0.3 })],
  ['hiit|interval|tabata|crossfit|circuit|bootcamp|boot camp', act('hiit', { fatLoss: 0.4 })],
  ['lunge', act('lunges')],
  ['squat', act('squats')],
  ['push up|pushup|press up', act('pushups')],
  ['pull up|pullup|chin up|chinup', act('pullups')],
  ['deadlift', act('deadlifts')],
  ['crunch|sit up|situp', act('crunches')],
  ['plank', act('planks')],
  ['floor|floor work|the floor|getting down|get down|getting up off the floor|kneeling|kneel', act('floor')],
  ['stair|stairs|stair climber|stairmaster', act('stairs')],

  // Equipment
  ['dumbbell|dumbell|dumbel|dumbbel|db|dumb bell|hand weight|free weight', equip(['dumbbell'])],
  ['weight|weights|some weights', equip(['dumbbell'], true)],
  ['barbell|bar bell|squat rack|power rack|rack|olympic bar|plate|weight plate', equip(['barbell', 'bench'])],
  ['kettlebell|kettle bell|kb', equip(['kettlebell'])],
  ['band|resistance band|tube|resistance tube|trx|suspension trainer|loop band', equip(['band'])],
  ['pull up bar|pullup bar|chin up bar|chinup bar|door bar|doorway bar|bar', equip(['pullupBar'])],
  ['bench|weight bench', equip(['bench'])],
  ['machine|smith machine|leg press|nautilus|cable machine', equip(['machine', 'cable'])],
  ['cable', equip(['cable'])],
  ['treadmill', equip(['treadmill'])],
  ['stationary bike|exercise bike|spin bike|air bike|assault bike|recumbent bike', equip(['bike'])],
  ['rower|rowing machine|concept2|concept 2', equip(['rower'])],
  ['elliptical|cross trainer', equip(['elliptical'])],
  ['jump rope|skipping rope|skip rope|rope', equip(['jumpRope'])],
  ['pool', equip(['pool'])],
  ['home gym|garage gym|basement gym', equip(['dumbbell', 'barbell', 'bench', 'pullupBar'])],
  ['gym|full gym|the gym|commercial gym|planet fitness|ymca|gym membership|fitness center|la fitness|anytime fitness|24 hour fitness|equinox|fully equipped|all the equipment|full equipment|whatever i need|whatever is needed|whatever you need|whatever it take', equip('gym')],
  ['anything|everything|whatever|all of it', equip('gym', true)],
  ['bodyweight|body weight|no equipment|calisthenics|just me|my body|just my body|my own body|own body weight|mat|yoga mat', equip('none')],
  ['nothing|none|nada|zero', equip('none', true)],
  ['equipment|gear', equip('none')], // "no equipment" / "don't have any equipment"; positive mentions are ignored

  // Body parts: a focus, or a limit when an injury cue is near (some are always a limit).
  ['chest|pec|pecs|pectoral|boob', part({ focus: 'chest' })],
  ['back|lat|lats|upper back', part({ focus: 'back', limit: 'back' })],
  ['lower back|low back|spine|spinal|disc|disk|lumbar|tailbone', part({ limit: 'back', focus: 'back' })],
  ['herniated disc|herniated disk|bulging disc|slipped disc|sciatica|back surgery|back injury|back pain|backache', part({ limit: 'back', always: true })],
  ['shoulder|delt|delts|deltoid', part({ focus: 'shoulders', limit: 'shoulder' })],
  ['rotator cuff|frozen shoulder|shoulder impingement|impingement|labrum', part({ limit: 'shoulder', always: true })],
  ['arm|bicep|tricep|gun|forearm', part({ focus: 'arms' })],
  ['wrist', part({ limit: 'wrist' })],
  ['carpal tunnel', part({ limit: 'wrist', always: true })],
  ['elbow', part({ limit: 'elbow' })],
  ['tennis elbow|golfer elbow', part({ limit: 'elbow', always: true })],
  ['abs|ab|core|stomach|belly|six pack|sixpack|midsection|tummy|oblique|waist|love handle', part({ focus: 'core' })],
  ['glute|butt|booty|backside|peach|hip', part({ focus: 'glutes', limit: 'hip' })],
  ['hip replacement|hip surgery|hip bursitis', part({ limit: 'hip', always: true })],
  ['leg|thigh|quad|quads|hamstring|calf|calve|leg day|lower half', part({ focus: 'legs' })],
  ['knee|kneecap', part({ limit: 'knee' })],
  ['acl|mcl|meniscus|knee replacement|knee surgery|patellar|runner knee|jumper knee', part({ limit: 'knee', always: true })],
  ['ankle|achilles|foot|feet|heel', part({ limit: 'ankle' })],
  ['plantar fasciitis|shin splint|sprained ankle|ankle sprain', part({ limit: 'ankle', always: true })],
  ['neck', part({ limit: 'neck' })],
  ['joint', part({ condition: 'arthritis' })],
  ['upper body|upper|top half', part({ focus: 'upper' })],
  ['lower body|lower|bottom half', part({ focus: 'lower' })],

  // Conditions
  ['asthma|asthmatic|inhaler|copd', cond('asthma')],
  ['pregnant|pregnancy|expecting|trimester|postpartum|post partum|just had a baby|gave birth', cond('pregnant')],
  ['overweight|obese|obesity|plus size|very heavy|big guy|big girl|heavyset', cond('overweight')],
  ['senior|elderly|older|older adult|retired|retiree|grandma|grandpa|grandparent|my age|getting older|i am old', cond('senior')],
  ['heart condition|heart problem|heart disease|heart issue|heart attack|high blood pressure|blood pressure|hypertension|pacemaker|cardiac|stent', cond('heart')],
  ['arthritis|osteoarthritis|rheumatoid|fibromyalgia|osteoporosis', cond('arthritis')],

  // Experience
  ['beginner|newbie|novice|new to this|new to it|new to working out|new to training|new to the gym|brand new|first time|starting out|just starting|just started|returning|out of shape|unfit|rusty|couch potato|sedentary|deconditioned|desk job', lvl('beginner')],
  ['intermediate|some experience|decent shape|good shape|in decent shape|in good shape|been training a while', lvl('intermediate')],
  ['advanced|experienced|veteran|competitive|seasoned|lifting for years|training for years|years of lifting|years of training|been lifting|very fit|elite', lvl('advanced')],

  // Cues
  ['not|no|never|without|except|excluding|besides|avoid|avoiding|hate|hates|hated|dislike|dislikes|detest|loathe|skip|skipping|other than|apart from|instead of|rather than|rather not|less|fewer|worst|suck|sucks|awful|terrible|boring|evil|nope|none of|refuse|not a fan|no more|stay away from|can not|cannot|unable|nor|off limits|off limit|out of the question', NEG],
  ['like|love|enjoy|prefer|want|have|has|got|own|okwith|can|fan|into|favorite|favourite|only|just|focus|more|use|access|need|plus|great|best|fun', POS],
  ['bad|hurt|hurts|hurting|injury|injured|injure|pain|painful|ache|aches|achy|sore|soreness|torn|tear|surgery|operation|replaced|replacement|issue|issues|problem|problems|trouble|weak|busted|dodgy|tweaked|pulled|strained|strain|sprain|sprained|broken|broke|fractured|fracture|tendinitis|tendonitis|bursitis|recovering|rehab|careful|sensitive|bum|arthritic|creaky|cranky|messed up|blown|limited mobility', INJURY],
  ['busy|booked|work|working|job|shift|on call|travel|traveling|travelling|kid|kids|class|classes|church|commitment', BUSY],
  ['but|however|though|although|whereas|yet', BOUNDARY],
];

/** Light stemming shared by tokens and lexicon phrases: drop a plural "s". */
function stem(word: string): string {
  return word.length > 3 && word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') ? word.slice(0, -1) : word;
}

type LexEntry = { tokens: string[]; item: Item };
const LEX_INDEX: Map<string, LexEntry[]> = (() => {
  const index = new Map<string, LexEntry[]>();
  for (const [phrases, item] of LEXICON) {
    for (const phrase of phrases.split('|')) {
      const tokens = phrase.split(' ').map(stem);
      const list = index.get(tokens[0]) ?? [];
      list.push({ tokens, item });
      index.set(tokens[0], list);
    }
  }
  for (const list of index.values()) list.sort((a, b) => b.tokens.length - a.tokens.length);
  return index;
})();

// Words that can sit between list items or between a cue and its entity without breaking the link.
const GLUE = new Set([
  'and', 'or', 'nor', 'any', 'the', 'a', 'an', 'also', 'either', 'neither', 'even', 'my', 'of', 'on', 'at', 'in',
  'really', 'much', 'too', 'very', 'some', '&', '/', '+', 'with', 'to', 'do', 'doing', 'for', 'more', 'other',
]);

// ---------------------------------------------------------------------------------------------
// Normalization

const DAY_WORD = '(monday|mon|tuesday|tues|tue|wednesday|weds|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat|sunday|sun)s?';
const DAY_LOOKUP: Record<string, DayOfWeek> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const dayFromWord = (word: string): DayOfWeek => DAY_LOOKUP[word.slice(0, 3)];

export function normalize(text: string): string {
  let s = ` ${text.toLowerCase().replace(/[’‘`]/g, "'")} `;
  // Contractions, so "don't" reads as "do not" and "I'm" as "i am".
  s = s
    .replace(/\bcan'?t\b/g, 'can not')
    .replace(/\bwon'?t\b/g, 'will not')
    .replace(/\b(do|does|did|is|are|was|were|have|has|had|could|would|should|must)n'?t\b/g, '$1 not')
    .replace(/\bain'?t\b/g, 'is not')
    .replace(/\bi'?m\b/g, 'i am')
    .replace(/\b(i|you|we|they)'ve\b/g, '$1 have')
    .replace(/\b(i|you|we|they)'d\b/g, '$1 would')
    .replace(/\b(it|that|there)'s\b/g, '$1 is')
    .replace(/'s\b/g, '')
    .replace(/'/g, '');
  // "work out" is training, so that a bare "work" can mean a job ("I work weekends").
  s = s.replace(/\b(work(?:ing|s|ed)?)[\s-]?outs?\b/g, ' train ');
  // "get back into it" is returning, not a back.
  s = s.replace(/\b(get|getting|got|come|coming|go|going|bounce|bouncing|ease|easing)\s+back\b(\s+(into|in|to|on))?/g, ' returning ');
  s = s.replace(/\bback\s+(into|in)\s+(it|shape|the gym|training|exercise|exercising|the swing of things)\b/g, ' returning ');
  // Neutral "don't mind" / "fine with" before negation runs over them.
  s = s.replace(/\b(do not mind|dont mind|no problem with|no problem|fine with|ok with|okay with|happy to|open to|down for)\b/g, ' okwith ');
  s = s.replace(/\bno (injuries|injury|issues|problems|limitations|restrictions|health issues)\b/g, ' ');
  s = s.replace(/\b(nothing else|that is it|that is all|thats it|thats all)\b/g, ' ');
  // Times of day and durations in words.
  s = s
    .replace(/\b(an|one|a)?\s*hour and a half\b/g, ' 90 minutes ')
    .replace(/\bhalf (an )?hour\b/g, ' 30 minutes ')
    .replace(/\b(an|one|a) hour\b/g, ' 60 minutes ')
    .replace(/\bquarter (of an )?hour\b/g, ' 15 minutes ');
  // Day shorthands: m/w/f, mwf, t/th, tth.
  s = s
    .replace(/\bm\s*\/\s*w\s*\/\s*f\b|\bmwf\b/g, ' monday wednesday friday ')
    .replace(/\bt\s*\/\s*th\b|\btth\b|\btu\s*\/\s*th\b|\btr\b/g, ' tuesday thursday ')
    .replace(/\bevery other day\b/g, ' everyotherday ')
    .replace(/\bevery\s?day\b|\beach day\b|\ball week\b|\b7 days a week\b|\bseven days a week\b/g, ' daily ');
  // Day ranges: "mon-fri", "monday through friday".
  const range = new RegExp(`\\b${DAY_WORD}\\s*(?:-|–|to|through|thru|till|until)\\s*${DAY_WORD}\\b`, 'g');
  s = s.replace(range, (_m, from: string, to: string) => {
    const a = WEEK_ORDER.indexOf(dayFromWord(from));
    const b = WEEK_ORDER.indexOf(dayFromWord(to));
    const days: DayOfWeek[] = [];
    for (let i = a; ; i = (i + 1) % 7) {
      days.push(WEEK_ORDER[i]);
      if (i === b || days.length >= 7) break;
    }
    return ` ${days.map(d => d.toLowerCase()).join(' and ')} `;
  });
  // Hyphenated words are matched as separate words ("pull-up" = "pull up"), and a slash between
  // words is a list separator.
  s = s.replace(/([a-z])-([a-z])/g, '$1 $2');
  return s.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------------------------
// Numbers

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, once: 1, twice: 2, thrice: 3,
  couple: 2, 'a couple': 2, 'a couple of': 2, few: 3, 'a few': 3, several: 4,
};
const NUM = '(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|a couple of|a couple|couple|a few|few|several)';
const toNumber = (s: string | undefined) => (s === undefined ? undefined : WORD_NUMBERS[s] ?? parseFloat(s));

/** Sessions a week stated in the text, if any. Ranges take the lower end. */
export function extractDaysPerWeek(s: string): number | undefined {
  if (/\beveryotherday\b/.test(s)) return 4;
  if (/\b(once|twice|one time|two times)\s+(a|per)\s+day\b/.test(s)) return 7;
  const unit = new RegExp(`\\b${NUM}(?:\\s*(?:-|–|to|or)\\s*${NUM})?\\s*(?:x\\b|times\\b|days?\\b|sessions?\\b|trainings?\\b|nights?\\b|mornings?\\b)`, 'g');
  for (const m of s.matchAll(unit)) {
    const n = toNumber(m[1]);
    // "30 days" or "100 times" aren't a weekly schedule.
    if (n !== undefined && n >= 1 && n <= 7) return Math.round(n);
  }
  const bare = s.match(/\b(once|twice|thrice)\s*(a|per|each|every)?\s*week/);
  if (bare) return toNumber(bare[1]);
  if (/\b(daily|everyday)\b/.test(s)) return 7;
  return undefined;
}

/** Minutes per session stated in the text, if any. Ranges take the middle. */
export function extractMinutes(s: string): number | undefined {
  const minutes = s.match(/\b(\d{1,3})\s*(?:(?:-|–|to|or)\s*(\d{1,3})\s*)?(?:minutes?|mins?|min)\b/);
  if (minutes) {
    const a = parseFloat(minutes[1]);
    const b = minutes[2] ? parseFloat(minutes[2]) : a;
    return Math.round((a + b) / 2);
  }
  const hours = s.match(/\b(\d(?:\.\d+)?)\s*(?:(?:-|–|to|or)\s*(\d(?:\.\d+)?)\s*)?(?:hours?|hrs?|h)\b/);
  if (hours) {
    const a = parseFloat(hours[1]);
    const b = hours[2] ? parseFloat(hours[2]) : a;
    return Math.round(((a + b) / 2) * 60);
  }
  return undefined;
}

function extractAge(s: string): number | undefined {
  const m = s.match(/\b(?:i am|age|aged|im)\s+(\d{2})\b(?!\s*(?:minutes?|mins?|lbs?|pounds|kg|kilos?|%|percent))/) ||
    s.match(/\b(\d{2})\s*(?:years? old|yrs? old|yo|y\/o)\b/) ||
    s.match(/\b(?:in my|over)\s+(\d)0s?\b/);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return n < 10 ? n * 10 : n;
}

/** True when a stated body weight (or amount to lose) suggests low-impact training. */
function extractHeavyBodyWeight(s: string): boolean {
  for (const m of s.matchAll(/\b(lose|losing|drop|shed)?\s*(\d{2,3})\s*(lbs?|pounds|kg|kgs|kilos?)\b/g)) {
    const n = parseInt(m[2], 10);
    const kg = /^k/.test(m[3]);
    if (m[1] ? n >= (kg ? 40 : 90) : n >= (kg ? 115 : 250)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Tokens and mentions

type Token = { word: string; stem: string; punct: boolean };

function tokenizeNormalized(s: string): Token[] {
  const out: Token[] = [];
  for (const m of s.matchAll(/[a-z0-9]+(?:\.\d+)?|[.,;!?/&+\n]/g)) {
    const word = m[0];
    const punct = !/[a-z0-9]/.test(word);
    out.push({ word, stem: punct ? word : stem(word), punct });
  }
  return out;
}

type Mention = { item: Item; start: number; end: number; neg: boolean; clause: number; segment: number };

function findMentions(tokens: Token[], question: number): Mention[] {
  const mentions: Mention[] = [];
  let i = 0;
  while (i < tokens.length) {
    const entries = tokens[i].punct ? undefined : LEX_INDEX.get(tokens[i].stem);
    let matched: LexEntry | undefined;
    for (const entry of entries ?? []) {
      if (entry.item.k === 'equip' && entry.item.ctx && question !== QUESTION.equipment) continue;
      if (entry.tokens.every((t, j) => tokens[i + j] && !tokens[i + j].punct && tokens[i + j].stem === t)) {
        matched = entry;
        break;
      }
    }
    if (matched) {
      let item = matched.item;
      // "any day but Thursday" / "anything but running": "but" means "except" here.
      if (item.k === 'boundary' && tokens[i].word === 'but' && i > 0 && /^(any|anything|all|every|everything|day|days|anyday|whenever|week|daily)$/.test(tokens[i - 1].word)) {
        item = NEG;
      }
      mentions.push({ item, start: i, end: i + matched.tokens.length, neg: false, clause: 0, segment: 0 });
      i += matched.tokens.length;
    } else {
      i++;
    }
  }
  return mentions;
}

/**
 * Sets each mention's polarity, clause and comma segment. See the file header for the rules.
 */
function assignPolarity(tokens: Token[], mentions: Mention[]) {
  const byStart = new Map(mentions.map(m => [m.start, m]));
  const isEntity = (m: Mention | undefined) => !!m && ENTITY_KINDS.has(m.item.k);
  const isListPunct = (t: Token) => t.word === '/' || t.word === '&' || t.word === '+';
  const isGlue = (t: Token) => GLUE.has(t.word) || t.word === ',' || isListPunct(t);

  // Each token's clause (split by sentence punctuation and "but") and segment (also split by commas).
  const segOf: number[] = [];
  let neg = false;
  let clause = 0;
  let segment = 0;
  let lastNegCueEnd = -10;

  for (let i = 0; i < tokens.length;) {
    const token = tokens[i];
    const mention = byStart.get(i);
    if (token.punct) {
      if (token.word === ',') {
        segment++;
        // A comma keeps the polarity only when it continues a list of entities.
        let j = i + 1;
        while (j < tokens.length && isGlue(tokens[j]) && !byStart.has(j)) j++;
        if (!isEntity(byStart.get(j))) neg = false;
      } else if (!isListPunct(token)) {
        neg = false;
        clause++;
        segment++;
      }
      segOf[i] = segment;
      i++;
      continue;
    }
    if (!mention) {
      segOf[i] = segment;
      i++;
      continue;
    }
    if (mention.item.k === 'boundary') {
      neg = false;
      clause++;
      segment++;
    }
    mention.clause = clause;
    mention.segment = segment;
    for (let t = mention.start; t < mention.end; t++) segOf[t] = segment;
    if (mention.item.k === 'neg') {
      neg = true;
      lastNegCueEnd = mention.end;
    } else if (mention.item.k === 'pos') {
      // "don't want", "not a fan of", "do not have": a preference right after a negation stays negative.
      if (mention.start - lastNegCueEnd > 2) neg = false;
    } else if (mention.item.k !== 'boundary') {
      mention.neg = neg;
    }
    i = mention.end;
  }

  // Is a segment only a list of entities ("running, jumping and")?
  const onlyList = (seg: number) => {
    const covered = new Set<number>();
    let any = false;
    for (const m of mentions) {
      if (m.segment !== seg) continue;
      if (!isEntity(m)) return false;
      any = true;
      for (let t = m.start; t < m.end; t++) covered.add(t);
    }
    return any && tokens.every((t, idx) => segOf[idx] !== seg || covered.has(idx) || isGlue(t));
  };

  // A negation cue with nothing after it in its segment reaches back over the segment, and
  // over earlier segments of the same clause that are only a list ("running, jumping and
  // burpees are the worst").
  for (const cue of mentions) {
    if (cue.item.k !== 'neg') continue;
    if (mentions.some(m => m.segment === cue.segment && m.start > cue.start && isEntity(m))) continue;
    const before = mentions.filter(m => m.segment === cue.segment && m.start < cue.start && isEntity(m));
    if (before.length === 0) continue;
    for (const m of before) m.neg = true;
    for (let seg = cue.segment - 1; seg >= 0 && onlyList(seg); seg--) {
      const inSeg = mentions.filter(m => m.segment === seg);
      if (inSeg[0].clause !== cue.clause) break;
      for (const m of inSeg) m.neg = true;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Interpretation

const addUnique = <T,>(list: T[], value: T) => {
  if (!list.includes(value)) list.push(value);
};
const remove = <T,>(list: T[], value: T) => {
  const i = list.indexOf(value);
  if (i >= 0) list.splice(i, 1);
};

function interpret(tokens: Token[], mentions: Mention[], question: number, profile: Profile, goalWeights: Record<Goal, number>) {
  const injuryCues = mentions.filter(m => m.item.k === 'injury');
  const busyCues = mentions.filter(m => m.item.k === 'busy');

  const addGoals = (goals: Partial<Record<Goal, number>>, scale = 1) => {
    for (const [g, w] of Object.entries(goals) as Array<[Goal, number]>) {
      // Ties go to the goal said first ("lose weight, get stronger" leads with weight loss).
      if (goalWeights[g] === 0) goalWeights[g] += 0.01 * Math.max(0, 10 - Object.values(goalWeights).filter(v => v > 0).length);
      goalWeights[g] += w * scale;
    }
  };

  for (const m of mentions) {
    const item = m.item;
    switch (item.k) {
      case 'day': {
        const busy = busyCues.some(c => c.segment === m.segment && !c.neg);
        for (const d of item.days) {
          if (m.neg || busy) {
            addUnique(profile.blockedDays, d);
            remove(profile.preferredDays, d);
          } else if (!profile.blockedDays.includes(d)) {
            addUnique(profile.preferredDays, d);
          }
        }
        break;
      }
      case 'goal':
        if (m.neg) for (const g of Object.keys(item.goals) as Goal[]) goalWeights[g] = Math.min(goalWeights[g], 0) - 1;
        else addGoals(item.goals);
        break;
      case 'equip': {
        if (item.equip === 'none') {
          // "no equipment" / "nothing": bodyweight, which needs nothing added. Any piece of
          // equipment named alongside ("nothing but dumbbells") still counts.
          profile.equipmentAssumed = false;
        } else if (item.equip === 'gym') {
          if (!m.neg) for (const e of GYM_EQUIPMENT) addUnique(profile.equipment, e);
          profile.equipmentAssumed = false;
        } else {
          for (const e of item.equip) {
            if (m.neg) remove(profile.equipment, e);
            else addUnique(profile.equipment, e);
          }
          profile.equipmentAssumed = false;
        }
        break;
      }
      case 'activity':
        if (m.neg) {
          addUnique(profile.avoid, item.a);
          remove(profile.likes, item.a);
        } else {
          // Naming an exercise as an injury ("squats hurt my knees") isn't a liking.
          const hurt = injuryCues.some(c => c.clause === m.clause && !c.neg);
          if (hurt) {
            addUnique(profile.avoid, item.a);
            break;
          }
          addUnique(profile.likes, item.a);
          remove(profile.avoid, item.a);
          if (item.goals) addGoals(item.goals, question === QUESTION.goals ? 1 : 0.5);
          if (item.equip) addUnique(profile.equipment, item.equip);
        }
        break;
      case 'part': {
        const injured = item.always || injuryCues.some(c => c.clause === m.clause && !c.neg && Math.abs(c.start - m.start) <= 6);
        if (injured && !m.neg) {
          if (item.limit) addUnique(profile.limits, item.limit);
          if (item.condition) addUnique(profile.conditions, item.condition);
        } else if (item.focus) {
          if (m.neg) {
            addUnique(profile.skipFocus, item.focus);
            remove(profile.focus, item.focus);
          } else {
            addUnique(profile.focus, item.focus);
          }
        }
        break;
      }
      case 'condition':
        if (!m.neg) addUnique(profile.conditions, item.c);
        break;
      case 'level':
        if (!m.neg) profile.level = item.level;
        else if (item.level === 'beginner') profile.level = 'intermediate';
        else if (item.level === 'advanced') profile.level = profile.level ?? 'beginner';
        break;
      default:
        break;
    }
  }
}

/**
 * Parse the wizard's answers (positional, in the order of constants/prompts.ts) into a
 * Profile. Every answer is read for everything (people mention days in the goals answer),
 * but a few words only mean something in their own question ("nothing" is "no equipment"
 * only in the equipment answer).
 */
export function parseAnswers(answers: string[]): Profile {
  const profile = emptyProfile();
  const goalWeights = Object.fromEntries(GOALS.map(g => [g, 0])) as Record<Goal, number>;

  answers.forEach((answer, question) => {
    if (!answer?.trim()) return;
    const s = normalize(answer);

    const days = extractDaysPerWeek(s);
    if (days !== undefined && profile.daysPerWeek === undefined) profile.daysPerWeek = days;
    const minutes = extractMinutes(s);
    if (minutes !== undefined && profile.minutes === undefined) profile.minutes = Math.max(10, Math.min(minutes, 150));
    const age = extractAge(s);
    if (age !== undefined && age >= 60) addUnique(profile.conditions, 'senior');
    if (extractHeavyBodyWeight(s)) addUnique(profile.conditions, 'overweight');

    // Experience phrasings that are easier as patterns than as lexicon entries.
    if (/\b(never|not|have not|has not|had not)\s+(really\s+|ever\s+|been\s+)*(train|trained|exercise|exercised|lifted|lift|been active|been to (a|the) gym|done this|been athletic|been fit)\b/.test(s) ||
      /\b(not|never)\s+(very\s+|really\s+)?(fit|in shape|athletic|active)\b/.test(s)) {
      profile.level = 'beginner';
    }
    if (/\b(\d+|several|many|a few|few)\s+years?\s+(of\s+)?(lifting|training|experience|in the gym)\b/.test(s)) {
      profile.level = 'advanced';
    }

    const tokens = tokenizeNormalized(s);
    const mentions = findMentions(tokens, question);
    assignPolarity(tokens, mentions);
    interpret(tokens, mentions, question, profile, goalWeights);
  });

  // Goal weights, scaled to 0..1 against the strongest; negated goals drop out.
  const max = Math.max(0, ...Object.values(goalWeights));
  if (max > 0) {
    for (const g of GOALS) {
      if (goalWeights[g] > 0) profile.goals[g] = Math.round((goalWeights[g] / max) * 100) / 100;
    }
  }

  // Named days with no count mean "those days".
  if (profile.daysPerWeek === undefined && profile.preferredDays.length > 0) profile.daysPerWeek = profile.preferredDays.length;
  profile.preferredDays = WEEK_ORDER.filter(d => profile.preferredDays.includes(d));
  profile.blockedDays = WEEK_ORDER.filter(d => profile.blockedDays.includes(d));
  if (profile.daysPerWeek !== undefined) profile.daysPerWeek = Math.min(profile.daysPerWeek, 7 - profile.blockedDays.length || 1);

  if (profile.conditions.includes('senior') && !profile.level) profile.level = 'beginner';
  profile.equipment = GYM_EQUIPMENT.concat('pool').filter(e => profile.equipment.includes(e));
  return profile;
}
