# Routine building, learning and adjustment

How Pulsar builds a routine from free-text answers, learns from how the user trains, and
offers to adjust a routine when workouts keep feeling off. Three ways to get a routine, in
the order the app promotes them:

1. **Pulsar AI**: the main path. The user's own OpenAI key or hosted Pulsar AI (see
   `PLAN-ai-features.md`). Every AI action goes through `requireAI` in `hooks/useAIGate.tsx`.
2. **The Pulsar Planner**: the free, no-AI alternative. Rule-based, runs entirely on the phone.
   Offered as the secondary button in setup and as the alternative in the AI access dialog.
3. **Ready-made routines**: the fixed template library (`services/routineTemplates.ts`,
   keyword search in `services/templateSearch.ts`). Kept, but only linked from inside the
   Planner.

Nothing here sends workout data to the server. The only thing that leaves the phone is a
hosted Pulsar AI request, which the Worker builds a prompt from and doesn't store.

## The Pulsar Planner (`src/services/routinePlanner/`)

```
answers ──parseAnswers──▶ Profile ──applyLearned──▶ Profile ──planRoutine──▶ RoutinePlan
                              ▲                                                  │
                     "Your plan" chips edit it                        planNicknames ▼
                                                                          name ideas
```

### `parseAnswers.ts`: free text to a Profile

The setup wizard asks four open questions. `parseAnswers` reads them into a `Profile`
(`profile.ts`): weighted goals, equipment, days per week, preferred and blocked weekdays,
minutes, focus areas, areas to skip, injury limits, liked and avoided activities, conditions
(pregnant, senior, asthma...) and level.

It is not keyword matching:

- **Lexicon, longest match first.** About 700 phrases map to typed items (day, goal,
  equipment, activity, body part, condition, level, plus negation, affirmation, injury and
  "busy" cues). "Pull-up bar" wins over "pull-up"; equipment words only count in the
  equipment answer.
- **Polarity scan** (`assignPolarity`). Negation cues ("not", "no", "hate", "can't",
  "except", "any day but") flip what follows, carry across a list ("no running, jumping or
  burpees"), and stop at boundaries. A cue after a phrase reaches back only when its own
  segment has something before it ("running is a no").
- **Cues that change meaning.** Injury words turn a body part into a limit ("bad knees",
  "my shoulder hurts"); busy words turn a day into a blocked day ("busy Thursdays").
- **Numbers by regex**: `extractDaysPerWeek` ("3 days", "three times a week", "3-4 days"),
  `extractMinutes` ("45 min", "an hour", "half an hour").
- Goals get weights by mention order, so "lose weight, get stronger" ranks fat loss first.

### `planRoutine.ts`: a Profile to a week

1. **Split** (`chooseSessions`): from the main goal, days and level, e.g. three full-body
   days, upper/lower, push/pull/legs, conditioning or cardio days for fat loss and endurance,
   mobility days for mobility goals.
2. **Days and order** (`chooseDays`, `arrangeSessions`): brute force over every combination
   of allowed days (preferred days first), scored to avoid back-to-back days and, on short
   weeks, to keep weekends free; then every order of the sessions over those days, so ones
   that work the same muscles aren't back to back.
3. **Exercises** (`sessionExercises`): each session is a list of slots (squat, hinge,
   horizontal push, pull, core, glute...), with extra slots for focus areas. Each slot is
   filled from `exerciseCatalog.ts` (114 exercises, each tagged with slots, equipment,
   level, injury limits, activity tags, seconds and priority):
   - **Filtered** by equipment, injury limits, level, low impact (knees, ankles, hips,
     overweight, senior, pregnant, arthritis), avoided activities and pregnancy (no moves
     lying on the back or front, crunches, heavy loads, hanging or impact).
   - **Scored** for the goal, level, priority, variety across the week, and the soft learned
     signals below.
4. **Dose** (`dose`): sets, reps or seconds from the goal, level and slot. Loaded compounds
   get strength 4×5 and muscle 4×8 (3×8 and 3×10 for beginners); accessories and bodyweight
   moves get higher reps; timed moves keep their seconds. Conditioning and cardio sessions
   are built in rounds of work and rest that fit the minutes.
5. **Notes** (`buildNotes`): one line per decision the user should be able to check
   ("Thursday kept free", "Easy on the knees...", "Leaves out Push-up, since you disliked
   it", "A step easier, since your recent workouts felt too hard").

A seed drives every random choice, so Shuffle gives a different but equally valid week.

### `nicknames.ts`: fun name ideas

`planNicknames(plan, profile, seed)` gives up to five names from what is actually in the
plan, most specific trait first: who it's for (pregnancy, senior), a liked exercise it
includes, the focus or activities asked for (only when the plan really has them), the gear
it uses, the exercise it leans on most, the split, weekend-only or short sessions, the goal,
the day count and the level. "More names" changes the seed.

### The "Your plan" screen (`components/RoutinePlanBuilder.tsx`)

Opened with `?plan=1`. Shows what the parser understood as chips (goal, days and each
weekday, minutes, equipment, level, focus, watch-outs) and rebuilds the week on every tap.
Learned items show as removable watch-outs ("Disliked: Push-up", "Often skipped: Lunge").
Editing a field the history filled in clears its "learned" flag, so the note goes away.
"Create routine" goes through `createRoutineFromPlan` in `services/routineBuilderService.ts`.

## Learning (`src/utils/learnedPreferences.ts`)

`learnPreferences(exercises, workouts, routines)` is recomputed from IndexedDB data every
time it's needed (`hooks/useLearnedPreferences.ts`) and never stored.

| Signal | Source | Rule |
| --- | --- | --- |
| Liked exercises | exercise like or favorite | details dialog saves on tap |
| Disliked exercises | exercise dislike | |
| Often skipped | finished workouts, last 90 days | undone (skipped or 0 sets) in ≥2 workouts and ≥50% of appearances |
| Usual days | finished workouts, last 8 weeks | weekdays with ≥2 workouts, once there are ≥4 |
| Usual length | finished workouts | median of 5-180 min lengths, once there are ≥3 |
| Liked / disliked routines | routine card thumbs | |
| Effort trend | "How was it?" effort | ≥2 of the latest 5 rated in 30 days, outnumbering the opposite, ≥ half |
| Length trend | "How was it?" length | same rule |
| Workout notes | "How was it?" note | latest 3, 200 characters each |

**Everything learned is soft. What the user asks for always wins.**

- **Planner** (`routinePlanner/learned.ts`, `applyLearned`): liked +5, disliked −12, often
  skipped −8 on the exercise score. The penalty is dropped when the answers ask for that
  activity ("a push-up routine" keeps push-ups even if disliked). Usual days and length fill
  in only when the answers don't say. An effort trend moves the level one step, and a length
  trend moves the minutes by 10 (15-90), only when the answers don't set them. Routine
  ratings and notes are not used by the Planner: disliking a routine doesn't mean disliking
  every exercise in it.
- **AI**: `describePreferences` in `services/ai/prompts.ts` adds all of it to plan and chat
  prompts as soft preferences that the user's own words override. The hosted path sends the
  preferences in the request body, and the Worker validates them (`preferencesFrom` in
  `worker/ai/request.ts`: list sizes, string lengths, known days and values).

## Feedback and adjustment

- **"How was it?"** (`components/WorkoutFeedbackCard.tsx`) on every finished workout:
  effort (too easy / just right / too hard), length (too short / just right / too long) and
  an optional note, saved on the workout as soon as they're tapped (`Workout.effort`,
  `lengthFeel`, `feedback`).
- **Detection** (`utils/routineFeedback.ts`, `detectRoutineTrend`): the same trend rule,
  over one routine's workouts finished since `routine.feedbackHandledAt`, so an offer the
  user acted on or dismissed doesn't come back for the same feedback.
- **The offer** (`components/RoutineAdjustOffer.tsx`), under the card:
  - **Adjust with Pulsar AI** (main): `requireAI({ kind: 'edit' })`, resumable after sign-in
    or checkout. It then navigates to the routine with `adjustmentRequest(trend)` in the
    navigation state, and `RoutineChat` sends it once as a chat message.
  - **Use the free Planner** (the gate's alternative and a secondary button):
    `adjustRoutine(routine, trend)` makes one `setDay` op per changed day. Easier: a set
    fewer (down to 3), then 20% fewer reps or seconds. Harder: a set more (up to 4), then
    more reps or seconds. Shorter: drop each day's last exercise (keeping 3), else a set
    fewer. Longer: a set more (up to 5).
  - **Not now**: sets `feedbackHandledAt`.
- Both paths end as a pending `RoutineChange`, reviewed day by day with the existing
  accept/reject UI. `RoutineChange.source` (`'ai'` or `'planner'`) labels the inline panel
  ("Planner suggestion") and the history entry ("Planner change").

## Tests

- Unit (Vitest): `routinePlanner/parseAnswers.test.ts`, `planRoutine.test.ts`,
  `nicknames.test.ts`, `utils/learnedPreferences.test.ts`, `utils/routineFeedback.test.ts`,
  `worker/ai/request.test.ts`.
- E2E (Playwright): `e2e/plan-builder.spec.ts` (answers to plan, chips, name ideas),
  `e2e/workout.spec.ts` (feedback card, routine thumbs), `e2e/routine-adjust.spec.ts`
  (Planner path through the gate, AI path through the chat, Not now).

## Extending

- New wording the parser misses: add phrases to the lexicon in `parseAnswers.ts` and a test,
  rather than adding special cases.
- New exercises: add rows to `exerciseCatalog.ts` with honest tags; the filters and slots
  pick them up.
- A new learned signal: add it to `LearnedPreferences`, to `describePreferences` and
  `preferencesFrom` for the AI, and to `applyLearned` only if the Planner can use it
  honestly. Keep it soft.
