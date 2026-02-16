import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTripStore } from "../src/store/tripStore";

export default function Home() {
  const router = useRouter();
  const { config, setDaysCount, hydrate } = useTripStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Travel Tinder</Text>
      <Text style={styles.p}>Prototype: swipe to build a {config.daysCount}-day plan.</Text>

      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => setDaysCount(config.daysCount - 1)}>
          <Text style={styles.btnTxt}>-</Text>
        </Pressable>
        <Text style={styles.days}>{config.daysCount} days</Text>
        <Pressable style={styles.btn} onPress={() => setDaysCount(config.daysCount + 1)}>
          <Text style={styles.btnTxt}>+</Text>
        </Pressable>
      </View>

      <Pressable style={styles.cta} onPress={() => router.push("/swipe")}>
        <Text style={styles.ctaTxt}>Start swiping</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  h1: { fontSize: 36, fontWeight: "900" },
  p: { marginTop: 10, fontSize: 16, opacity: 0.8 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 24, gap: 16 },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: "white", fontSize: 24, fontWeight: "900" },
  days: { fontSize: 18, fontWeight: "800" },
  cta: { marginTop: 28, padding: 16, borderRadius: 16, backgroundColor: "#111", alignItems: "center" },
  ctaTxt: { color: "white", fontSize: 16, fontWeight: "800" },
});
