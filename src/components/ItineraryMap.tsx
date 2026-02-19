import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { ItineraryDay } from "../lib/itinerary";
import { Activity } from "../types/activity";
import { DayMarker } from "./DayMarker";

const PARIS_CENTER = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const EDGE_PADDING = { top: 60, right: 40, bottom: 60, left: 40 };

type Props = {
  itinerary: ItineraryDay[];
  selectedDay: number | null; // null = all days
};

type MarkerData = {
  activity: Activity;
  dayIndex: number;
};

export function ItineraryMap({ itinerary, selectedDay }: Props) {
  const mapRef = useRef<MapView>(null);

  const markers: MarkerData[] = [];

  for (const day of itinerary) {
    if (selectedDay != null && day.dayIndex !== selectedDay) continue;

    for (const block of ["morning", "afternoon", "evening"] as const) {
      for (const item of day.blocks[block]) {
        markers.push({ activity: item.activity, dayIndex: day.dayIndex });
      }
    }
  }


  useEffect(() => {
    if (markers.length === 0 || !mapRef.current) return;

    const coords = markers.map((m) => ({
      latitude: m.activity.lat,
      longitude: m.activity.lng,
    }));

    // Small timeout to let the map render first
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: EDGE_PADDING,
        animated: true,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [markers.length, selectedDay]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={PARIS_CENTER}
        showsUserLocation={false}
        showsPointsOfInterest={false}
      >
        {markers.map((m) => (
          <Marker
            key={`${m.activity.id}-${m.dayIndex}`}
            coordinate={{
              latitude: m.activity.lat,
              longitude: m.activity.lng,
            }}
            title={m.activity.name}
            description={`${m.activity.neighborhood} • ${m.activity.durationMins}m`}
          >
            <DayMarker dayIndex={m.dayIndex} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
});
