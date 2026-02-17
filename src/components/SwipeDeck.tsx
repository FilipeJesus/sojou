import React, { useMemo } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Activity } from "../types/activity";
import { SwipeCard } from "./SwipeCard";

const { width: W, height: H } = Dimensions.get("window");
const SWIPE_X_THRESHOLD = W * 0.28;

type Props = {
  activities: Activity[];
  onPass: (a: Activity) => void;
  onSave: (a: Activity) => void;
  onAdd: (a: Activity) => void;
};

export function SwipeDeck({ activities, onPass, onSave, onAdd }: Props) {
  const top = activities[0];
  const next = activities[1];

  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const commit = (action: "left" | "right" | "save") => {
    if (!top) return;

    if (action === "left") onPass(top);
    if (action === "right") onAdd(top);
    if (action === "save") onSave(top);

    // Reset position for the next card (activities will re-filter)
    x.value = 0;
    y.value = 0;
  };

  const flingOut = (action: "left" | "right" | "save") => {
    "worklet";

    if (action === "save") {
      y.value = withTiming(-18, { duration: 120 });
      x.value = withTiming(0, { duration: 120 });

      y.value = withTiming(40, { duration: 140 }, () => {
        runOnJS(commit)("save");
      });
      return;
    }

    const targetX = action === "left" ? -W * 1.2 : W * 1.2;
    x.value = withTiming(targetX, { duration: 180 });
    y.value = withTiming(0, { duration: 180 }, () => {
      runOnJS(commit)(action);
    });
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          x.value = e.translationX;
          y.value = e.translationY * 0.3;
        })
        .onEnd(() => {
          const passedRight = x.value > SWIPE_X_THRESHOLD;
          const passedLeft = x.value < -SWIPE_X_THRESHOLD;

          if (passedRight) return flingOut("right");
          if (passedLeft) return flingOut("left");

          x.value = withSpring(0);
          y.value = withSpring(0);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [top?.id, activities.length]
  );

  const topStyle = useAnimatedStyle(() => {
    const rotate = interpolate(x.value, [-W / 2, 0, W / 2], [-12, 0, 12]);
    const scale = interpolate(Math.min(Math.abs(x.value), SWIPE_X_THRESHOLD), [0, SWIPE_X_THRESHOLD], [1, 1.02]);

    return {
      transform: [{ translateX: x.value }, { translateY: y.value }, { rotateZ: `${rotate}deg` }, { scale }],
    };
  });

  const nextStyle = useAnimatedStyle(() => {
    const scale = interpolate(Math.min(Math.abs(x.value), SWIPE_X_THRESHOLD), [0, SWIPE_X_THRESHOLD], [0.98, 1]);
    return { transform: [{ scale }] };
  });

  if (!top) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptyText}>You've seen all available activities. Check your itinerary to review your picks.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityLabel={`Activity cards, ${activities.length} remaining`}>
      {next ? (
        <Animated.View style={[styles.card, styles.nextCard, nextStyle]}>
          <SwipeCard activity={next} onSave={() => {}} />
        </Animated.View>
      ) : null}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, topStyle]}>
          <SwipeCard
            activity={top}
            onSave={() => flingOut("save")}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    width: W * 0.92,
    height: H * 0.74,
    position: "absolute",
    borderRadius: 24,
    overflow: "hidden",
  },
  nextCard: { top: 6 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 22, fontWeight: "900", opacity: 0.6 },
  emptyText: { fontSize: 14, opacity: 0.5, marginTop: 8, textAlign: "center" },
});
