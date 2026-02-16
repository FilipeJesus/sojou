import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTripStore } from "../src/store/tripStore";

export default function ItineraryScreen() {
  const router = useRouter();
  const { itinerary, overflow, regenerate, removeFromTrip } = useTripStore();

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>← Back</Text>
        </Pressable>
        <Pressable onPress={regenerate}>
          <Text style={styles.link}>Regenerate</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={styles.h1}>Your Itinerary</Text>

        {itinerary.map((d) => (
          <View key={d.dayIndex} style={styles.day}>
            <Text style={styles.dayTitle}>
              Day {d.dayIndex + 1} {d.anchorNeighborhood ? `• ${d.anchorNeighborhood}` : ""}
            </Text>

            {(["morning", "afternoon", "evening"] as const).map((b) => (
              <View key={b} style={styles.block}>
                <Text style={styles.blockTitle}>{b.toUpperCase()}</Text>
                {d.blocks[b].length === 0 ? (
                  <Text style={styles.empty}>—</Text>
                ) : (
                  d.blocks[b].map((it) => (
                    <View key={it.activity.id} style={styles.item}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{it.activity.name}</Text>
                        <Text style={styles.meta}>
                          {it.activity.neighborhood} • {it.activity.durationMins}m
                        </Text>
                      </View>
                      <Pressable onPress={() => removeFromTrip(it.activity.id)}>
                        <Text style={styles.remove}>Remove</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            ))}
          </View>
        ))}

        {overflow.length > 0 ? (
          <View style={styles.overflow}>
            <Text style={styles.dayTitle}>Didn’t fit ({overflow.length})</Text>
            {overflow.map((a) => (
              <Text key={a.id} style={styles.meta}>
                • {a.name}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  topBar: {
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: { fontSize: 16, fontWeight: "800", opacity: 0.8 },
  h1: { fontSize: 28, fontWeight: "900", marginBottom: 12 },
  day: { marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.06)" },
  dayTitle: { fontSize: 18, fontWeight: "900" },
  block: { marginTop: 12 },
  blockTitle: { fontSize: 12, fontWeight: "900", opacity: 0.7 },
  empty: { marginTop: 6, opacity: 0.5 },
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
});
