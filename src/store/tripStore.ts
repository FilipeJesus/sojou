import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Activity } from "../types/activity";
import { buildItinerary, ItineraryDay } from "../lib/itinerary";

type TripConfig = {
  city: "Paris";
  daysCount: number;
  budgetTier: 0 | 1 | 2 | 3;
  categories: Set<Activity["category"]>;
};

type TripState = {
  config: TripConfig;
  deck: Activity[];
  addedIds: Set<string>;
  savedIds: Set<string>;
  passedIds: Set<string>;
  itinerary: ItineraryDay[];
  overflow: Activity[];

  setDaysCount: (n: number) => void;

  setDeck: (deck: Activity[]) => void;

  swipeAdd: (activity: Activity) => void;
  swipeSave: (activity: Activity) => void;
  swipePass: (activity: Activity) => void;

  removeFromTrip: (activityId: string) => void;
  regenerate: () => void;

  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
};

const STORAGE_KEY = "sojou_proto_v1";

function setToArray<T>(s: Set<T>): T[] {
  return Array.from(s);
}
function arrayToSet<T>(a: T[]): Set<T> {
  return new Set(a);
}

export const useTripStore = create<TripState>((set, get) => ({
  config: {
    city: "Paris",
    daysCount: 3,
    budgetTier: 2,
    categories: new Set(["food", "culture", "nature", "night", "shopping"]),
  },

  deck: [],
  addedIds: new Set(),
  savedIds: new Set(),
  passedIds: new Set(),
  itinerary: [],
  overflow: [],

  setDaysCount: (n) => {
    set((st) => ({ config: { ...st.config, daysCount: Math.max(2, Math.min(4, n)) } }));
    get().regenerate();
    void get().persist();
  },

  setDeck: (deck) => {
    set({ deck });
    if (get().addedIds.size > 0) get().regenerate();
  },

  swipeAdd: (activity) => {
    set((st) => {
      const addedIds = new Set(st.addedIds);
      addedIds.add(activity.id);
      return { addedIds };
    });
    get().regenerate();
    void get().persist();
  },

  swipeSave: (activity) => {
    set((st) => {
      const savedIds = new Set(st.savedIds);
      savedIds.add(activity.id);
      return { savedIds };
    });
    void get().persist();
  },

  swipePass: (activity) => {
    set((st) => {
      const passedIds = new Set(st.passedIds);
      passedIds.add(activity.id);
      return { passedIds };
    });
    void get().persist();
  },

  removeFromTrip: (activityId) => {
    set((st) => {
      const addedIds = new Set(st.addedIds);
      addedIds.delete(activityId);
      return { addedIds };
    });
    get().regenerate();
    void get().persist();
  },

  regenerate: () => {
    const st = get();
    const selected = st.deck.filter((a) => st.addedIds.has(a.id));
    const { days, overflow } = buildItinerary(selected, st.config.daysCount);
    set({ itinerary: days, overflow });
  },

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as {
      config: { city: "Paris"; daysCount: number; budgetTier: 0 | 1 | 2 | 3; categories: Activity["category"][] };
      addedIds: string[];
      savedIds: string[];
      passedIds: string[];
    };

    set({
      config: {
        city: parsed.config.city,
        daysCount: parsed.config.daysCount,
        budgetTier: parsed.config.budgetTier,
        categories: arrayToSet(parsed.config.categories),
      },
      addedIds: arrayToSet(parsed.addedIds),
      savedIds: arrayToSet(parsed.savedIds),
      passedIds: arrayToSet(parsed.passedIds),
    });

    get().regenerate();
  },

  persist: async () => {
    const st = get();
    const payload = {
      config: {
        city: st.config.city,
        daysCount: st.config.daysCount,
        budgetTier: st.config.budgetTier,
        categories: setToArray(st.config.categories),
      },
      addedIds: setToArray(st.addedIds),
      savedIds: setToArray(st.savedIds),
      passedIds: setToArray(st.passedIds),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  },
}));
