import React from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Activity } from "../types/activity";

const { height: H } = Dimensions.get("window");
const SHEET_HEIGHT = H * 0.55;
const DISMISS_THRESHOLD = 80;

function priceLabel(t: Activity["priceTier"]) {
  if (t === 0) return "Free";
  return "€".repeat(t);
}

type Props = {
  activity: Activity;
  visible: boolean;
  onDismiss: () => void;
};

export function ActivityDetail({ activity, visible, onDismiss }: Props) {
  const translateY = useSharedValue(SHEET_HEIGHT);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
    }
  }, [visible, translateY]);

  const dismissSheet = () => {
    onDismiss();
  };

  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          // Only allow dragging down
          if (e.translationY > 0) {
            translateY.value = e.translationY;
          }
        })
        .onEnd((e) => {
          if (e.translationY > DISMISS_THRESHOLD) {
            translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
            runOnJS(dismissSheet)();
          } else {
            translateY.value = withTiming(0, { duration: 200 });
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDismiss],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: visible ? 1 : 0,
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onDismiss}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.name}>{activity.name}</Text>

            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {activity.category.toUpperCase()}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activity.neighborhood}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activity.durationMins}m</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {priceLabel(activity.priceTier)}
                </Text>
              </View>
            </View>

            {activity.description ? (
              <Text style={styles.description}>{activity.description}</Text>
            ) : (
              <Text style={styles.noDescription}>
                No description available yet.
              </Text>
            )}

            {activity.highlights && activity.highlights.length > 0 && (
              <View style={styles.highlights}>
                <Text style={styles.highlightsTitle}>Highlights</Text>
                {activity.highlights.map((h, i) => (
                  <View key={i} style={styles.highlightRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
            )}

            {activity.mustBook && (
              <View style={styles.bookingNote}>
                <Text style={styles.bookingText}>
                  Booking recommended in advance
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  name: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111",
    marginBottom: 10,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.07)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#222",
    marginBottom: 16,
  },
  noDescription: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 16,
  },
  highlights: {
    marginBottom: 16,
  },
  highlightsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },
  highlightRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingRight: 16,
  },
  bullet: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
    lineHeight: 20,
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
    flex: 1,
  },
  bookingNote: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,165,0,0.1)",
  },
  bookingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B8860B",
  },
});
