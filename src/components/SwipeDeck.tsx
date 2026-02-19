import React, { useMemo, useState } from "react";
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
import { ActivityDetail } from "./ActivityDetail";

const { width: W, height: H } = Dimensions.get("window");
const SWIPE_X_THRESHOLD = W * 0.28;
const SWIPE_UP_THRESHOLD = H * 0.15;
const DIRECTION_LOCK_DISTANCE = 10;

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
  // "none" = 0, "horizontal" = 1, "vertical" = 2
  const directionLock = useSharedValue(0);

  const [showDetail, setShowDetail] = useState(false);

  const commit = (action: "left" | "right" | "save") => {
    if (!top) return;

    if (action === "left") onPass(top);
    if (action === "right") onAdd(top);
    if (action === "save") onSave(top);

    x.value = 0;
  };

  const openDetail = () => {
    setShowDetail(true);
  };

  const flingOut = (action: "left" | "right" | "save") => {
    "worklet";

    if (action === "save") {
      x.value = withTiming(0, { duration: 140 }, () => {
        runOnJS(commit)("save");
      });
      return;
    }

    const targetX = action === "left" ? -W * 1.2 : W * 1.2;
    x.value = withTiming(targetX, { duration: 180 }, () => {
      runOnJS(commit)(action);
    });
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!showDetail)
        .onChange((e) => {
          // Lock direction on first significant movement
          if (directionLock.value === 0) {
            const absX = Math.abs(e.translationX);
            const absY = Math.abs(e.translationY);
            if (absX > DIRECTION_LOCK_DISTANCE || absY > DIRECTION_LOCK_DISTANCE) {
              directionLock.value = absX >= absY ? 1 : 2;
            }
          }

          if (directionLock.value === 1) {
            // Horizontal: existing swipe behavior
            x.value = e.translationX;
          } else if (directionLock.value === 2) {
            // Vertical: detect swipe-up but don't move the card
          }
        })
        .onEnd((e) => {
          if (directionLock.value === 1) {
            // Horizontal swipe logic
            const passedRight = x.value > SWIPE_X_THRESHOLD;
            const passedLeft = x.value < -SWIPE_X_THRESHOLD;

            directionLock.value = 0;
            if (passedRight) return flingOut("right");
            if (passedLeft) return flingOut("left");

            x.value = withSpring(0);
          } else if (directionLock.value === 2) {
            // Vertical swipe logic
            const swipedUp = e.translationY < -SWIPE_UP_THRESHOLD;
            directionLock.value = 0;

            if (swipedUp) {
              runOnJS(openDetail)();
            }
          } else {
            directionLock.value = 0;
            x.value = withSpring(0);
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [top?.id, activities.length, showDetail],
  );

  const topStyle = useAnimatedStyle(() => {
    const rotate = interpolate(x.value, [-W / 2, 0, W / 2], [-12, 0, 12]);
    const scale = interpolate(Math.min(Math.abs(x.value), SWIPE_X_THRESHOLD), [0, SWIPE_X_THRESHOLD], [1, 1.02]);

    return {
      transform: [{ translateX: x.value }, { rotateZ: `${rotate}deg` }, { scale }],
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

      {!showDetail && (
        <Text style={styles.detailHint}>Swipe up for details</Text>
      )}

      {top && (
        <ActivityDetail
          activity={top}
          visible={showDetail}
          onDismiss={() => setShowDetail(false)}
        />
      )}
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
  detailHint: {
    position: "absolute",
    bottom: (H * (1 - 0.74)) / 2 - 24,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(0,0,0,0.35)",
    letterSpacing: 0.3,
  },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 22, fontWeight: "900", opacity: 0.6 },
  emptyText: { fontSize: 14, opacity: 0.5, marginTop: 8, textAlign: "center" },
});
