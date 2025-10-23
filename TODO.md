# Todo

## MVP
- [ ] Create routine
  - [ ] AI generation
  - [ ] AI key prompt setting
  - [x] Create from templates
- [ ] Edit routine
  - [x] Manual editing
  - [ ] AI chat suggestions
  - [ ] Add/edit day from templates
- [x] Exercise How-To link
- [x] Exercise image/wiki
- [x] Workout session
  - [x] Wake lock
  - [x] Completion
  - [x] Streak animation
  - [x] Skip/Finish
  - [x] Image/how-to link
- [x] Streak calendar
  - [ ] Expanded streak calendar with details, stats
- [x] Archive/delete routine
- [x] Switch routine
- [ ] Handle multiple routines
  - [ ] Allow multiple active routines, switch between routines
  - [ ] Streak calendar for specific routines, including inactive ones
  - [ ] Routines should have activity (start, end) for use with streak calendar
- [ ] Import/export data
- [ ] Stats view

## MMP
- [ ] Progress sharing
- [ ] Scores/points/ranks
- [ ] Achievements
- [ ] Rate this app
- [ ] Support/Report a Bug
- [ ] ToS/Privacy Notice
- [ ] Monetization (Buy Me a Coffee, premium, ads)
- [ ] AI-free routine library (generated with LLM) with semantic search
- [ ] Onboarding/Help
- [ ] PWA + Hosting
- [ ] Publish to app stores
- [ ] Testing/feedback

## Bells and whistles
- [ ] Like/dislike routine/workout/exercise
- [ ] Favorite routine/exercise
- [ ] Add weight to workouts
- [ ] Add notes to workouts
- [ ] Notifications
- [ ] JSONBin to transfer data
- [ ] Best Streak / All Streaks
- [ ] Favorite/best workouts
- [ ] Preserve streak history even if workout routine is changed
- [ ] Optional days (not required for streaks)
- [ ] Optional exercises (not required for completion)
- [ ] Leaderboards
- [ ] Graphs and charts
- [ ] Weight tracking
- [ ] Diet tracking
- [ ] Print/Export PDF support
- [ ] Timeline
- [ ] Exercise library
- [ ] Warn when deleting a routine that has workouts
- [ ] Ad hoc workouts (not routine based)
- [ ] Activity log - view any past workout, repeat
- [ ] Change exercise images and links
- [x] Copy/Paste workout days

## Issues
- [ ] Inactive routines are impacting the TimeToWorkoutAlert
- [ ] Routine view banner gets mixed up with multiple started days
- [ ] Editor optimization is bad, need to split up and memoize components, and not use clone()
- [ ] On timeline, only show "in progress" state if at least 1 exercise is started/completed
- [ ] Need to add Vitests
- [ ] Wake lock isn't working
- [ ] Upgrade to Chakra v3: https://www.chakra-ui.com/docs/get-started/migration
- [ ] Copy/Paste and add day from template is putting reps on duration based exercises