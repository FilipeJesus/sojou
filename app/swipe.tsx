import React, { useEffect, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SwipeDeck } from "../src/components/SwipeDeck";
import { useTripStore } from "../src/store/tripStore";
import { ACTIVITIES_PARIS } from "../src/data/activities.paris";

export default function SwipeScreen() {
  const router = useRouter();
  const { setDeck, deck, addedIds, savedIds, passedIds, swipeAdd, swipeSave, swipePass } = useTripStore();

  useEffect(() => {
    setDeck(ACTIVITIES_PARIS);
  }, [setDeck]);

  const remaining = useMemo(() => {
    const swiped = new Set<string>([...addedIds, ...savedIds, ...passedIds]);
    return deck.filter((a) => !swiped.has(a.id));
  }, [deck, addedIds, savedIds, passedIds]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Swipe</Text>
        <Pressable onPress={() => router.push("/itinerary")}>
          <Text style={styles.link}>Itinerary ({addedIds.size})</Text>
        </Pressable>
      </View>

      <SwipeDeck activities={remaining} onPass={swipePass} onSave={swipeSave} onAdd={swipeAdd} />
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
  title: { fontSize: 20, fontWeight: "900" },
  link: { fontSize: 16, fontWeight: "800", opacity: 0.8 },
});
