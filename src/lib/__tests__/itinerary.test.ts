import { buildItinerary } from "../itinerary";
import { Activity } from "../../types/activity";

function makeActivity(overrides: Partial<Activity> & { id: string; name: string }): Activity {
  return {
    photoUrls: ["https://picsum.photos/seed/test/400/600"],
    category: "culture",
    tags: ["test"],
    durationMins: 90,
    priceTier: 1,
    neighborhood: "1st Arr.",
    lat: 48.86,
    lng: 2.34,
    ...overrides,
  };
}

describe("buildItinerary", () => {
  it("returns empty days and no overflow when no activities selected", () => {
    const result = buildItinerary([], 3);
    expect(result.days).toHaveLength(3);
    expect(result.overflow).toHaveLength(0);
    for (const day of result.days) {
      expect(day.blocks.morning).toHaveLength(0);
      expect(day.blocks.afternoon).toHaveLength(0);
      expect(day.blocks.evening).toHaveLength(0);
    }
  });

  it("places a single activity into a day", () => {
    const activities = [makeActivity({ id: "a1", name: "Louvre" })];
    const result = buildItinerary(activities, 2);
    expect(result.days).toHaveLength(2);
    expect(result.overflow).toHaveLength(0);

    const allPlaced = result.days.flatMap((d) =>
      [...d.blocks.morning, ...d.blocks.afternoon, ...d.blocks.evening]
    );
    expect(allPlaced).toHaveLength(1);
    expect(allPlaced[0].activity.id).toBe("a1");
  });

  it("is deterministic — same input produces same output", () => {
    const activities = [
      makeActivity({ id: "a1", name: "A", neighborhood: "1st Arr." }),
      makeActivity({ id: "a2", name: "B", neighborhood: "2nd Arr." }),
      makeActivity({ id: "a3", name: "C", neighborhood: "1st Arr.", category: "food" }),
    ];
    const r1 = buildItinerary(activities, 2);
    const r2 = buildItinerary(activities, 2);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it("respects block capacities and overflows when full", () => {
    // Each day has 600 mins total (180 morning + 240 afternoon + 180 evening)
    // With 1 day and activities totaling > 600 mins, some should overflow
    const activities = [
      makeActivity({ id: "a1", name: "A", durationMins: 180, category: "culture" }),
      makeActivity({ id: "a2", name: "B", durationMins: 240, category: "nature" }),
      makeActivity({ id: "a3", name: "C", durationMins: 180, category: "night" }),
      makeActivity({ id: "a4", name: "D", durationMins: 120, category: "food" }),
    ];
    const result = buildItinerary(activities, 1);
    expect(result.days).toHaveLength(1);
    // 600 mins capacity, 720 mins of activities — at least 1 should overflow
    expect(result.overflow.length).toBeGreaterThanOrEqual(1);
  });

  it("assigns anchor neighborhoods based on frequency", () => {
    const activities = [
      makeActivity({ id: "a1", name: "A", neighborhood: "Marais" }),
      makeActivity({ id: "a2", name: "B", neighborhood: "Marais" }),
      makeActivity({ id: "a3", name: "C", neighborhood: "Marais" }),
      makeActivity({ id: "a4", name: "D", neighborhood: "Montmartre" }),
    ];
    const result = buildItinerary(activities, 2);
    // Marais should be anchor for first day (most frequent)
    expect(result.days[0].anchorNeighborhood).toBe("Marais");
    expect(result.days[1].anchorNeighborhood).toBe("Montmartre");
  });

  it("places food activities preferably in evening", () => {
    const activities = [
      makeActivity({ id: "a1", name: "Dinner", category: "food", durationMins: 90 }),
    ];
    const result = buildItinerary(activities, 1);
    const eveningItems = result.days[0].blocks.evening;
    expect(eveningItems).toHaveLength(1);
    expect(eveningItems[0].activity.id).toBe("a1");
  });

  it("places culture activities preferably in morning", () => {
    const activities = [
      makeActivity({ id: "a1", name: "Museum", category: "culture", durationMins: 90 }),
    ];
    const result = buildItinerary(activities, 1);
    const morningItems = result.days[0].blocks.morning;
    expect(morningItems).toHaveLength(1);
    expect(morningItems[0].activity.id).toBe("a1");
  });

  it("respects openWindows when provided", () => {
    const activities = [
      makeActivity({
        id: "a1",
        name: "Night Tour",
        category: "culture",
        durationMins: 90,
        openWindows: ["evening"],
      }),
    ];
    const result = buildItinerary(activities, 1);
    const eveningItems = result.days[0].blocks.evening;
    expect(eveningItems).toHaveLength(1);
  });

  it("handles more days than activities gracefully", () => {
    const activities = [makeActivity({ id: "a1", name: "A" })];
    const result = buildItinerary(activities, 4);
    expect(result.days).toHaveLength(4);
    expect(result.overflow).toHaveLength(0);
  });
});
