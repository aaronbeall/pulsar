// Keyword search over the built-in routine templates. This is the no-AI path for the setup
// wizard: with no AI provider configured, the wizard's free-text answers are matched against
// each template's name, description, keywords, day templates and exercise names, and the
// best matches are offered to the user to pick from. Pure logic, no React — see
// templateSearch.test.ts.

import { RoutineTemplate } from './routineTemplates';
import { dailyWorkoutTemplates } from './dailyWorkoutTemplates';

// Common filler words in wizard answers ("I want to get stronger and lose a bit of weight")
// that would otherwise match nearly every template's text and drown out the real signal.
const STOPWORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'bit', 'but', 'by', 'can', 'do', 'for',
  'from', 'get', 'have', 'i', 'im', 'in', 'into', 'is', 'it', 'just', 'like', 'me', 'more',
  'much', 'my', 'need', 'no', 'not', 'of', 'on', 'or', 'so', 'some', 'that', 'the', 'to',
  'too', 'up', 'use', 'want', 'was', 'what', 'whatever', 'will', 'with', 'would', 'you', 'hate',
  'your', 'day', 'days', 'week', 'weeks', 'min', 'mins', 'minute', 'minutes', 'time', 'times',
  'also', 'really', 'very', 'all', 'about', 'should', 'know', 'anything', 'else', 'nothing',
  'lot', 'little', 'able', 'try', 'make', 'out', 'work', 'workout', 'workouts', 'been',
]);

// Everyday phrasings mapped onto the vocabulary the templates are tagged with, so "lose
// weight" finds fat-loss routines instead of matching "weights" on every lifting template.
const PHRASES: Array<[RegExp, string]> = [
  [/\b(lose|losing|lost|drop|dropping|shed)\s+(some\s+|a\s+bit\s+of\s+)?(weight|pounds|lbs|fat)\b/g, 'fat loss burn'],
  [/\bweight\s+loss\b/g, 'fat loss'],
  [/\b(get|getting)\s+(stronger|strong)\b|\bstronger\b/g, 'strength'],
  [/\b(running|runner|run|jogging|marathon|5k|10k)\b/g, 'running endurance'],
  [/\b(healthier|healthy|health)\b/g, 'general fitness'],
  [/\b(flexible|stretching|stretchy)\b/g, 'flexibility stretch'],
  [/\b(toned|tone up|toning)\b/g, 'tone'],
  [/\b(no equipment|nothing|none)\b/g, 'bodyweight'],
];

/** Lowercase, map common phrasings, strip punctuation, drop stopwords/short words/numbers, and singularize a trailing "s". */
export function tokenize(text: string): string[] {
  let normalized = text.toLowerCase();
  for (const [pattern, replacement] of PHRASES) normalized = normalized.replace(pattern, ` ${replacement} `);
  return normalized
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .map(w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

const templateTokenCache = new WeakMap<RoutineTemplate, Map<string, number>>();

/** Weighted bag of words for a template: name and keywords count more than incidental text. */
function getTemplateTokens(template: RoutineTemplate): Map<string, number> {
  const cached = templateTokenCache.get(template);
  if (cached) return cached;

  const weighted: Array<[string, number]> = [
    [template.name, 4],
    [(template.keywords || []).join(' '), 4],
    [template.description || '', 2],
    [(template.nicknames || []).join(' '), 1],
  ];
  for (const dayName of Object.values(template.days)) {
    if (!dayName) continue;
    weighted.push([dayName, 2]);
    const dayTmpl = dailyWorkoutTemplates.find(dt => dt.day.toLowerCase() === dayName.toLowerCase());
    if (dayTmpl) weighted.push([dayTmpl.exercises.map(e => e.name).join(' '), 1]);
  }

  const tokens = new Map<string, number>();
  for (const [text, weight] of weighted) {
    for (const token of tokenize(text)) {
      tokens.set(token, (tokens.get(token) || 0) + weight);
    }
  }
  templateTokenCache.set(template, tokens);
  return tokens;
}

/** Score one template against query words: exact token hits score fully, prefix hits ("strength" ~ "strong") half. */
export function scoreTemplate(template: RoutineTemplate, queryWords: string[]): number {
  const tokens = getTemplateTokens(template);
  let score = 0;
  for (const word of new Set(queryWords)) {
    const exact = tokens.get(word);
    if (exact) {
      score += exact;
      continue;
    }
    if (word.length < 4) continue;
    const stem = word.slice(0, Math.max(4, word.length - 3));
    let best = 0;
    for (const [token, weight] of tokens) {
      if (token.startsWith(stem) || (token.length >= 4 && word.startsWith(token))) best = Math.max(best, weight);
    }
    score += best / 2;
  }
  return score;
}

export interface RankedTemplate {
  template: RoutineTemplate;
  score: number;
}

/** All templates ranked best-first for free-text input (ties broken by name, so order is stable). */
export function rankTemplates(templates: RoutineTemplate[], input: string): RankedTemplate[] {
  const words = tokenize(input);
  return templates
    .map(template => ({ template, score: scoreTemplate(template, words) }))
    .sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name));
}
