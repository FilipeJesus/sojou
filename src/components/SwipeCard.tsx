import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Activity } from "../types/activity";

function priceLabel(t: Activity["priceTier"]) {
  if (t === 0) return "Free";
  return "€".repeat(t);
}

type Props = {
  activity: Activity;
  onSave: () => void;
};

export function SwipeCard({ activity, onSave }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = activity.photoUrls;

  useEffect(() => {
    setPhotoIndex(0);
  }, [activity.id]);

  const cyclePhoto = useCallback(() => {
    if (photos.length > 1) setPhotoIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const tapGesture = useMemo(
    () => Gesture.Tap().onEnd(() => { runOnJS(cyclePhoto)(); }),
    [cyclePhoto],
  );

  return (
    <View style={styles.card} accessibilityLabel={`${activity.name}, ${activity.category}, ${activity.neighborhood}, ${priceLabel(activity.priceTier)}, ${activity.durationMins} minutes`}>
      <GestureDetector gesture={tapGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Image source={photos[photoIndex]} style={styles.image} contentFit="cover" transition={200} placeholder={{ blurhash: "LGF5]+Yk^6#M@-5c,1J5@[or[Q6." }} accessibilityIgnoresInvertColors />
        </View>
      </GestureDetector>
      <View style={styles.overlay} pointerEvents="none" />

      {photos.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {photos.map((_, i) => (
            <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
          ))}
        </View>
      )}

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
        <Pressable onPress={onSave} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={`Save ${activity.name}`} hitSlop={8}>
          <Text style={styles.actionTxt}>★</Text>
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
    bottom: 100,
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
    justifyContent: "center",
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
  dots: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    backgroundColor: "white",
  },
});
