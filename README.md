# Travel Tinder Prototype (Expo + Reanimated)

This zip contains the key source files for the swipe-based travel planning prototype.

## Quick start (recommended)
1. Create a new Expo app:
   ```bash
   npx create-expo-app travel-tinder --template
   cd travel-tinder
   ```

2. Install dependencies:
   ```bash
   npx expo install expo-router react-native-screens react-native-safe-area-context
   npx expo install react-native-gesture-handler react-native-reanimated
   npm i zustand
   npx expo install @react-native-async-storage/async-storage
   ```

3. Copy the `app/`, `src/`, and `babel.config.js` from this zip into your project (overwrite when prompted).

4. Ensure `app.json` contains:
   ```json
   {
     "expo": {
       "scheme": "travel-tinder",
       "plugins": ["expo-router"]
     }
   }
   ```

5. Start:
   ```bash
   npx expo start -c
   ```

## Notes
- Data is local in `src/data/activities.paris.ts` (placeholder images).
- Swipe left/right to pass/add; tap ⭐ to save.
- Itinerary is heuristic-based in `src/lib/itinerary.ts`.
