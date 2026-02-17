import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SwipeDeck } from "../src/components/SwipeDeck";
import { useTripStore } from "../src/store/tripStore";
import { ACTIVITIES_PARIS } from "../src/data/activities.paris";
import { Activity, Category } from "../src/types/activity";
import { showToast } from "../src/components/Toast";

const ALL_CATEGORIES: Category[] = ["food", "culture", "nature", "night", "shopping"];
const BUDGET_LABELS = ["Free", "€", "€€", "€€€"] as const;

export default function SwipeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setDeck, deck, config, addedIds, savedIds, passedIds, swipeAdd, swipeSave, swipePass, toggleCategory, setBudgetTier, resetSwipes } = useTripStore();
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setDeck(ACTIVITIES_PARIS);
  }, [setDeck]);

  const remaining = useMemo(() => {
    const swiped = new Set<string>([...addedIds, ...savedIds, ...passedIds]);
    return deck.filter((a) => {
      if (swiped.has(a.id)) return false;
      if (!a.photoUrls.some(url => url.includes("unsplash.com") || url.includes("pexels.com"))) return false;
      if (!config.categories.has(a.category)) return false;
      if (a.priceTier > config.budgetTier) return false;
      return true;
    });
  }, [deck, addedIds, savedIds, passedIds, config.categories, config.budgetTier]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.title}>← Swipe</Text>
        </Pressable>
        <View style={styles.topRight}>
          <Pressable onPress={() => setShowFilters(!showFilters)} accessibilityRole="button" accessibilityLabel="Toggle filters">
            <Text style={styles.link}>Filter</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/itinerary")} accessibilityRole="button" accessibilityLabel={`View itinerary, ${addedIds.size} items`}>
            <Text style={styles.link}>Itinerary ({addedIds.size})</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.resetRow}>
        <Pressable onPress={resetSwipes} style={styles.resetBtn} accessibilityRole="button" accessibilityLabel="Reset all swipes">
          <Text style={styles.resetTxt}>Reset swipes</Text>
        </Pressable>
      </View>

      {showFilters ? (
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {ALL_CATEGORIES.map((cat) => {
              const active = config.categories.has(cat);
              return (
                <Pressable
                  key={cat}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleCategory(cat)}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat} filter, ${active ? "active" : "inactive"}`}
                >
                  <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{cat}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {BUDGET_LABELS.map((label, i) => {
              const tier = i as 0 | 1 | 2 | 3;
              const active = config.budgetTier >= tier;
              return (
                <Pressable
                  key={label}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setBudgetTier(tier)}
                  accessibilityRole="button"
                  accessibilityLabel={`Budget up to ${label}`}
                >
                  <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <SwipeDeck
        activities={remaining}
        onPass={(a: Activity) => { swipePass(a); showToast("Passed"); }}
        onSave={(a: Activity) => { swipeSave(a); showToast("Saved ★"); }}
        onAdd={(a: Activity) => { swipeAdd(a); showToast("Added ♥"); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topRight: { flexDirection: "row", gap: 16 },
  title: { fontSize: 20, fontWeight: "900" },
  link: { fontSize: 16, fontWeight: "800", opacity: 0.8 },
  filterSection: { paddingVertical: 8, gap: 6 },
  chipRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  chipActive: { backgroundColor: "#111" },
  chipTxt: { fontSize: 13, fontWeight: "700", color: "#111" },
  chipTxtActive: { color: "white" },
  resetRow: { paddingHorizontal: 16, alignItems: "flex-end", paddingBottom: 4 },
  resetBtn: { paddingVertical: 4, paddingHorizontal: 10 },
  resetTxt: { fontSize: 13, fontWeight: "700", color: "#c00" },
});
