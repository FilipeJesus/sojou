import React from "react";
import { StyleSheet, Text, View } from "react-native";

const DAY_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"];

type Props = {
  dayIndex: number;
};

export function DayMarker({ dayIndex }: Props) {
  const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
  const label = String(dayIndex + 1);

  return (
    <View style={[styles.marker, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: "900",
    color: "white",
  },
});
