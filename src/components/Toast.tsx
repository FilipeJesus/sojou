import React, { useEffect, useRef, useCallback } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";

type ToastMessage = { text: string; key: number };

let _show: ((text: string) => void) | null = null;

export function showToast(text: string) {
  _show?.(text);
}

export function ToastProvider() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const messageRef = useRef<ToastMessage | null>(null);
  const [message, setMessage] = React.useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hide = useCallback(() => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(20, { duration: 200 });
  }, [opacity, translateY]);

  const show = useCallback((text: string) => {
    const msg = { text, key: Date.now() };
    messageRef.current = msg;
    setMessage(msg);

    opacity.value = withTiming(1, { duration: 150 });
    translateY.value = withTiming(0, { duration: 150 });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      hide();
    }, 1200);
  }, [opacity, translateY, hide]);

  useEffect(() => {
    _show = show;
    return () => { _show = null; };
  }, [show]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!message) return null;

  return (
    <Animated.View style={[styles.toast, animStyle]} pointerEvents="none">
      <Text style={styles.text}>{message.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  text: { color: "white", fontSize: 14, fontWeight: "700" },
});
