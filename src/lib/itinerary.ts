import { Activity } from "../types/activity";

export type DayBlock = "morning" | "afternoon" | "evening";

export type ScheduledItem = {
  activity: Activity;
  block: DayBlock;
};

export type ItineraryDay = {
  dayIndex: number;
  anchorNeighborhood: string | null;
  blocks: Record<DayBlock, ScheduledItem[]>;
  remainingMins: Record<DayBlock, number>;
};

const BLOCK_CAPACITY: Record<DayBlock, number> = {
  morning: 180,
  afternoon: 240,
  evening: 180,
};

function preferredBlocks(a: Activity): DayBlock[] {
  if (a.openWindows && a.openWindows.length > 0) return a.openWindows;

  switch (a.category) {
    case "food":
      return ["evening", "afternoon", "morning"];
    case "culture":
      return ["morning", "afternoon", "evening"];
    case "nature":
      return ["afternoon", "morning", "evening"];
    case "night":
      return ["evening", "afternoon", "morning"];
    default:
      return ["afternoon", "morning", "evening"];
  }
}

function topNeighborhoodAnchors(activities: Activity[], days: number): string[] {
  const counts = new Map<string, number>();
  for (const a of activities) counts.set(a.neighborhood, (counts.get(a.neighborhood) ?? 0) + 1);
  return [...counts.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, days)
    .map(([n]) => n);
}

function canFit(day: ItineraryDay, a: Activity): boolean {
  const prefs = preferredBlocks(a);
  return prefs.some((b) => day.remainingMins[b] >= a.durationMins);
}

function dayScore(day: ItineraryDay, a: Activity): number {
  let score = 0;

  if (day.anchorNeighborhood && day.anchorNeighborhood === a.neighborhood) score += 3;

  const sameCategoryCount =
    day.blocks.morning.filter((x) => x.activity.category === a.category).length +
    day.blocks.afternoon.filter((x) => x.activity.category === a.category).length +
    day.blocks.evening.filter((x) => x.activity.category === a.category).length;

  if (sameCategoryCount > 0) score += 1;

  if (!canFit(day, a)) score -= 100;

  const used =
    (BLOCK_CAPACITY.morning - day.remainingMins.morning) +
    (BLOCK_CAPACITY.afternoon - day.remainingMins.afternoon) +
    (BLOCK_CAPACITY.evening - day.remainingMins.evening);

  score += Math.max(0, 10 - used / 60);

  return score;
}

function placeIntoDay(day: ItineraryDay, a: Activity): boolean {
  const prefs = preferredBlocks(a);

  for (const b of prefs) {
    if (day.remainingMins[b] >= a.durationMins) {
      day.blocks[b].push({ activity: a, block: b });
      day.remainingMins[b] -= a.durationMins;
      return true;
    }
  }
  return false;
}

export function buildItinerary(selected: Activity[], daysCount: number): {
  days: ItineraryDay[];
  overflow: Activity[];
} {
  const anchors = topNeighborhoodAnchors(selected, daysCount);

  const days: ItineraryDay[] = Array.from({ length: daysCount }).map((_, i) => ({
    dayIndex: i,
    anchorNeighborhood: anchors[i] ?? null,
    blocks: { morning: [], afternoon: [], evening: [] },
    remainingMins: { ...BLOCK_CAPACITY },
  }));

  const sorted = [...selected].sort((a, b) => {
    const ap = (a.popularity ?? 50) + (a.mustBook ? 15 : 0) + a.durationMins / 10;
    const bp = (b.popularity ?? 50) + (b.mustBook ? 15 : 0) + b.durationMins / 10;
    return bp - ap;
  });

  const overflow: Activity[] = [];

  for (const a of sorted) {
    let bestDay = days[0];
    let best = -Infinity;

    for (const d of days) {
      const s = dayScore(d, a);
      if (s > best) {
        best = s;
        bestDay = d;
      }
    }

    const placed = placeIntoDay(bestDay, a);
    if (!placed) overflow.push(a);
  }

  return { days, overflow };
}
