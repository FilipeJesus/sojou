import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTripStore } from "../src/store/tripStore";
import { ItineraryMap } from "../src/components/ItineraryMap";

export default function ItineraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { itinerary, overflow, addedIds, savedIds, deck, regenerate, removeFromTrip, swipeAdd } = useTripStore();

  const savedActivities = deck.filter((a) => savedIds.has(a.id));

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const isEmpty = addedIds.size === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.link}>← Back</Text>
        </Pressable>
        <Pressable onPress={regenerate} accessibilityRole="button" accessibilityLabel="Regenerate itinerary">
          <Text style={styles.link}>Regenerate</Text>
        </Pressable>
      </View>

      {!isEmpty && (
        <View style={styles.toggleBar}>
          <Pressable
            style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
            onPress={() => setViewMode("list")}
            accessibilityRole="button"
          >
            <Text style={[styles.toggleText, viewMode === "list" && styles.toggleTextActive]}>List</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]}
            onPress={() => setViewMode("map")}
            accessibilityRole="button"
          >
            <Text style={[styles.toggleText, viewMode === "map" && styles.toggleTextActive]}>Map</Text>
          </Pressable>
        </View>
      )}

      {viewMode === "map" && !isEmpty ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayChips}
          >
            <Pressable
              style={[styles.chip, selectedDay == null && styles.chipActive]}
              onPress={() => setSelectedDay(null)}
            >
              <Text style={[styles.chipText, selectedDay == null && styles.chipTextActive]}>All</Text>
            </Pressable>
            {itinerary.map((d) => (
              <Pressable
                key={d.dayIndex}
                style={[styles.chip, selectedDay === d.dayIndex && styles.chipActive]}
                onPress={() => setSelectedDay(d.dayIndex)}
              >
                <Text style={[styles.chipText, selectedDay === d.dayIndex && styles.chipTextActive]}>
                  Day {d.dayIndex + 1}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ flex: 1, marginHorizontal: 16, marginBottom: 16 }}>
            <ItineraryMap
              itinerary={itinerary}
              selectedDay={selectedDay}
            />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          <Text style={styles.h1}>Your Itinerary</Text>

          {isEmpty ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No activities yet</Text>
              <Text style={styles.emptyText}>Swipe right on activities you like to build your itinerary.</Text>
              <Pressable style={styles.emptyCta} onPress={() => router.back()} accessibilityRole="button">
                <Text style={styles.emptyCtaTxt}>Start swiping</Text>
              </Pressable>
            </View>
          ) : (
            itinerary.map((d) => (
              <View key={d.dayIndex} style={styles.day}>
                <Text style={styles.dayTitle}>
                  Day {d.dayIndex + 1} {d.anchorNeighborhood ? `• ${d.anchorNeighborhood}` : ""}
                </Text>

                {(["morning", "afternoon", "evening"] as const).map((b) => (
                  <View key={b} style={styles.block}>
                    <Text style={styles.blockTitle}>{b.toUpperCase()}</Text>
                    {d.blocks[b].length === 0 ? (
                      <Text style={styles.emptyBlock}>—</Text>
                    ) : (
                      d.blocks[b].map((it) => (
                        <View key={it.activity.id} style={styles.item}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{it.activity.name}</Text>
                            <Text style={styles.meta}>
                              {it.activity.neighborhood} • {it.activity.durationMins}m
                            </Text>
                          </View>
                          <Pressable onPress={() => removeFromTrip(it.activity.id)} accessibilityRole="button" accessibilityLabel={`Remove ${it.activity.name}`}>
                            <Text style={styles.remove}>Remove</Text>
                          </Pressable>
                        </View>
                      ))
                    )}
                  </View>
                ))}
              </View>
            ))
          )}

          {overflow.length > 0 ? (
            <View style={styles.overflow}>
              <Text style={styles.dayTitle}>Didn't fit ({overflow.length})</Text>
              {overflow.map((a) => (
                <View key={a.id} style={styles.overflowItem}>
                  <Text style={styles.meta}>• {a.name}</Text>
                  <Pressable onPress={() => removeFromTrip(a.id)} accessibilityRole="button" accessibilityLabel={`Remove ${a.name}`}>
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {savedActivities.length > 0 ? (
            <View style={styles.savedSection}>
              <Text style={styles.dayTitle}>Saved ({savedActivities.length})</Text>
              <Text style={styles.savedHint}>Tap to add to your trip</Text>
              {savedActivities.map((a) => (
                <Pressable
                  key={a.id}
                  style={styles.savedItem}
                  onPress={() => swipeAdd(a)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${a.name} to trip`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{a.name}</Text>
                    <Text style={styles.meta}>
                      {a.category.toUpperCase()} • {a.neighborhood} • {a.durationMins}m
                    </Text>
                  </View>
                  <Text style={styles.addBtn}>+ Add</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
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
  link: { fontSize: 16, fontWeight: "800", opacity: 0.8 },
  toggleBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  toggleTextActive: {
    color: "#111",
  },
  dayChips: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  chipActive: {
    backgroundColor: "#111",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },
  chipTextActive: {
    color: "#fff",
  },
  h1: { fontSize: 28, fontWeight: "900", marginBottom: 12 },
  day: { marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.06)" },
  dayTitle: { fontSize: 18, fontWeight: "900" },
  block: { marginTop: 12 },
  blockTitle: { fontSize: 12, fontWeight: "900", opacity: 0.7 },
  emptyBlock: { marginTop: 6, opacity: 0.5 },
  item: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemName: { fontSize: 14, fontWeight: "900" },
  meta: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  remove: { fontSize: 12, fontWeight: "900", opacity: 0.7 },
  overflow: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: "rgba(255,0,0,0.06)" },
  overflowItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  emptyState: { marginTop: 40, alignItems: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "900", opacity: 0.6 },
  emptyText: { fontSize: 14, opacity: 0.5, marginTop: 8, textAlign: "center" },
  emptyCta: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: "#111" },
  emptyCtaTxt: { color: "white", fontSize: 14, fontWeight: "800" },
  savedSection: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: "rgba(255,200,0,0.08)" },
  savedHint: { fontSize: 12, opacity: 0.5, marginTop: 2, marginBottom: 8 },
  savedItem: {
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addBtn: { fontSize: 12, fontWeight: "900", color: "#111" },
});
