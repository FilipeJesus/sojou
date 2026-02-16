# AGENT.md — Travel Tinder Prototype (Expo + React Native + Reanimated)

You are a coding agent working inside an Expo React Native project. Your job is to ship a swipe-based travel-planning prototype quickly, with clean code and predictable behavior.

## Project goal (MVP)
Build a mobile-first prototype where:
- Users swipe **left/right** on activity cards to **pass/add**
- Users **tap ⭐** to **save**
- The app builds a simple multi-day itinerary from added items using a heuristic
- Users can view/remove items and regenerate the itinerary

No backend. No external APIs. No auth.

## Tech constraints
- Expo (managed)
- TypeScript
- expo-router
- react-native-gesture-handler
- react-native-reanimated
- Zustand for local state
- AsyncStorage for simple persistence
- Local curated data in `src/data/`

## Key folders & files
- `app/` — screens via expo-router
  - `app/_layout.tsx` — must wrap in `GestureHandlerRootView`
  - `app/index.tsx` — trip setup
  - `app/swipe.tsx` — swipe deck
  - `app/itinerary.tsx` — itinerary view
- `src/components/SwipeDeck.tsx` — Reanimated swipe engine
- `src/components/SwipeCard.tsx` — card UI + tap actions (✕, ★, ♥)
- `src/store/tripStore.ts` — Zustand store, persistence, regenerate
- `src/lib/itinerary.ts` — itinerary heuristic
- `src/data/activities.paris.ts` — local dataset (expand to 60–80 items)
- `babel.config.js` — ensure `react-native-reanimated/plugin` is last

## Ground rules
1. **Prioritize shipping the prototype.** Avoid architecture gold-plating.
2. **No new dependencies** unless absolutely necessary for core UX. If you add one, explain why in the PR/notes.
3. **Keep UI responsive** at 60fps on modern phones. Don’t block the JS thread with heavy computations.
4. **Predictable behavior > cleverness.** Heuristics can be simple; users must understand outcomes.
5. **Don’t break existing flows.** If you refactor, keep screens working end-to-end.

## Definition of done (prototype complete)
- Swipe flow works on iOS + Android simulators (or Expo Go):
  - Swipe left → passes (card animates out)
  - Swipe right → adds (card animates out + added count updates)
  - Tap star → saves (card “bookmarks” with a small animation and advances)
- Itinerary updates after each add and is visible in `/itinerary`
- Remove item from itinerary works and reflows schedule
- State persists across reload (AsyncStorage) for added/saved/passed + config
- App boots cleanly with `npx expo start -c`

## Immediate next tasks (in priority order)
1. **Expand dataset** to ~60–80 activities for 1 city (keep Paris or switch).
   - Each activity must include: id, name, photoUrl, category, durationMins, priceTier, neighborhood, lat/lng.
2. **Add UX feedback**:
   - Toast/snackbar: “Added”, “Saved”, “Passed”
   - Optional: show “Added to Day X” when adding
3. **Add filters (lightweight)** on swipe screen:
   - Category chips (food/culture/nature/night/shopping)
   - Budget tier (0–3)
   - Filtering must be local and fast
4. **Polish itinerary screen**:
   - Clear day headers, block separation, empty states
   - Optional: show “Didn’t fit” items and allow “Try add day” (increase daysCount)

## Itinerary heuristic rules (do not overcomplicate)
- Days have 3 blocks: morning/afternoon/evening with fixed capacities
- Place activities based on:
  - Preferred blocks by category/openWindows
  - Neighborhood anchoring (top neighborhoods across selections)
  - Basic fit/capacity
- Overflow items go to a “Didn’t fit” section
- Keep algorithm deterministic (same input → same output)

## Reanimated & Gesture Handler requirements
- `GestureHandlerRootView` must wrap the app
- `react-native-reanimated/plugin` must be last in Babel plugins
- After changing babel config, restart Metro with cache clear: `npx expo start -c`

## Style & code quality
- TypeScript strictness: avoid `any`
- Keep components small and readable
- Prefer pure functions for business logic (itinerary builder)
- No inline mega-styles; use `StyleSheet.create`
- Add short comments only where logic is non-obvious

## Testing checklist (manual)
- Swipe gestures feel natural; card returns smoothly when below threshold
- Buttons (✕, ★, ♥) trigger the same commit behavior as gestures
- Navigating between screens does not reset state unexpectedly
- Removing items updates itinerary without crashes
- Reload app: state hydrates and itinerary regenerates correctly

## Agent workflow
When you implement changes:
1. Make the smallest change that achieves the goal
2. Run the app and verify the manual checklist
3. Update/extend types if data changes
4. If you add a feature, ensure it’s wired end-to-end in the UI

## Out of scope (do NOT implement now)
- Auth/accounts
- Social/group planning
- Booking integrations
- Maps routing/transit
- Weather APIs
- Multi-city trips
- ML personalization

## Notes
This project’s success metric this week:
> “Swiping is fun and the itinerary feels usable after 5 minutes.”

Optimize for that.
