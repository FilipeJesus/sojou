import React from "react";
import { Image, Text, View, StyleSheet, Pressable } from "react-native";
import { Activity } from "../types/activity";

function priceLabel(t: Activity["priceTier"]) {
  if (t === 0) return "Free";
  return "£".repeat(t);
}

type Props = {
  activity: Activity;
  onPass: () => void;
  onSave: () => void;
  onAdd: () => void;
};

export function SwipeCard({ activity, onPass, onSave, onAdd }: Props) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: activity.photoUrl }} style={styles.image} />
      <View style={styles.overlay} />

      <View style={styles.content}>
        <Text style={styles.title}>{activity.name}</Text>
        <Text style={styles.tags}>
          {activity.category.toUpperCase()} • {activity.neighborhood} • {priceLabel(activity.priceTier)} •{" "}
          {activity.durationMins}m
        </Text>

        <View style={{ height: 8 }} />

        <Text style={styles.sub}>
          {activity.mustBook ? "Book ahead recommended" : "Good anytime"} • {activity.tags.slice(0, 2).join(" • ")}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onPass} style={styles.actionBtn}>
          <Text style={styles.actionTxt}>✕</Text>
        </Pressable>

        <Pressable onPress={onSave} style={styles.actionBtn}>
          <Text style={styles.actionTxt}>★</Text>
        </Pressable>

        <Pressable onPress={onAdd} style={styles.actionBtn}>
          <Text style={styles.actionTxt}>♥</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },

  content: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 120,
  },
  title: { fontSize: 28, fontWeight: "800", color: "white" },
  tags: { marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.8)" },

  actions: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  actionTxt: { fontSize: 26, fontWeight: "900" },
});
