/**
 * Fetches Pexels photos for Paris activities and updates the data file.
 *
 * Searches twice per activity: first for the place name (e.g. "Sacre-Coeur"),
 * then for the full activity name (e.g. "Sacre-Coeur Hill Climb & View").
 * Stores both results in the photoUrls array alongside existing URLs.
 *
 * Usage:
 *   PEXELS_API_KEY=your_key npx ts-node scripts/fetch-pexels-photos.ts
 *   npx ts-node scripts/fetch-pexels-photos.ts --dry          # preview without API calls
 *   npx ts-node scripts/fetch-pexels-photos.ts --count 3      # fetch 3 photos per search (default: 1)
 *
 * The Pexels free tier allows 200 requests/hour (up to 2 requests per activity).
 *
 * Re-running is safe — it skips activities that already have Pexels URLs.
 */

import * as fs from "fs";
import * as path from "path";

const DRY_RUN =
  process.argv.includes("--dry") || process.argv.includes("--dry-run");

function parseIntFlag(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  const val = parseInt(process.argv[idx + 1], 10);
  return Number.isNaN(val) || val < 1 ? fallback : val;
}

const PHOTOS_PER_SEARCH = parseIntFlag("--count", 1);

const API_KEY = process.env.PEXELS_API_KEY;
if (!API_KEY && !DRY_RUN) {
  console.error("Set PEXELS_API_KEY env variable");
  process.exit(1);
}

const DATA_FILE = path.resolve(__dirname, "../src/data/activities.paris.ts");
// 2 requests per activity, so effective limit is halved
const MAX_REQUESTS = 190;

type PexelsPhoto = {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
  };
  photographer: string;
  photographer_url: string;
};

type PexelsSearchResponse = {
  photos: PexelsPhoto[];
  total_results: number;
};

function buildQuery(term: string, category: string): string {
  const base = term.replace(/['\u2019]/g, "'");
  if (category === "food" || category === "night") {
    return `${base} Paris`;
  }
  return `${base} Paris France`;
}

async function searchPexels(query: string, count: number = PHOTOS_PER_SEARCH): Promise<PexelsPhoto[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=${count}`;
  const res = await fetch(url, {
    headers: { Authorization: API_KEY! },
  });

  if (res.status === 429) {
    console.error("Rate limit hit. Wait an hour and re-run.");
    return [];
  }
  if (!res.ok) {
    console.error(`Pexels API error ${res.status}: ${await res.text()}`);
    return [];
  }

  const data: PexelsSearchResponse = await res.json();
  const remaining = res.headers.get("x-ratelimit-remaining");
  console.log(`    Rate limit remaining: ${remaining}`);

  return data.photos ?? [];
}

type ActivityBlock = {
  fullMatch: string;
  id: string;
  name: string;
  category: string;
  place?: string;
  photoUrls: string[];
  index: number;
};

function parseActivities(content: string): ActivityBlock[] {
  const results: ActivityBlock[] = [];
  // Match each activity object block (handles nested arrays like photoUrls)
  const blockRegex = /\{[^{}]*(?:\[[^\]]*\][^{}]*)*\}/gs;
  let block;
  while ((block = blockRegex.exec(content))) {
    const text = block[0];
    const idMatch = text.match(/id:\s*"([^"]+)"/);
    const nameMatch = text.match(/name:\s*"([^"]+)"/);
    const categoryMatch = text.match(/category:\s*"([^"]+)"/);
    const placeMatch = text.match(/place:\s*"([^"]+)"/);
    const photoUrlsMatch = text.match(/photoUrls:\s*\[([\s\S]*?)\]/);

    if (!idMatch || !nameMatch || !categoryMatch || !photoUrlsMatch) continue;

    // Parse URLs from the array
    const urlMatches = photoUrlsMatch[1].match(/"([^"]+)"/g);
    const photoUrls = urlMatches ? urlMatches.map((u) => u.slice(1, -1)) : [];

    results.push({
      fullMatch: text,
      id: idMatch[1],
      name: nameMatch[1],
      category: categoryMatch[1],
      place: placeMatch ? placeMatch[1] : undefined,
      photoUrls,
      index: block.index,
    });
  }
  return results;
}

async function main() {
  const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
  const activities = parseActivities(fileContent);

  console.log(`Found ${activities.length} activities`);

  if (DRY_RUN) {
    console.log("\n--- DRY RUN (no API calls, no file writes) ---");
    console.log(`Photos per search: ${PHOTOS_PER_SEARCH}\n`);
    let alreadyFetched = 0;
    let wouldFetch = 0;
    let requestsNeeded = 0;

    // Target: PHOTOS_PER_SEARCH from place search + PHOTOS_PER_SEARCH from activity search
    const targetPexels = PHOTOS_PER_SEARCH * 2;
    let totalPhotosNeeded = 0;

    for (const act of activities) {
      const existingPexels = act.photoUrls.filter((u) => u.includes("pexels.com")).length;
      const needed = targetPexels - existingPexels;

      if (needed <= 0) {
        console.log(`  \u2713 ${act.name} \u2014 has ${existingPexels} Pexels photo(s), target met`);
        alreadyFetched++;
      } else {
        const placeQuery = act.place
          ? buildQuery(act.place, act.category)
          : undefined;
        const activityQuery = buildQuery(act.name, act.category);

        console.log(`  \u25CB ${act.name} (has ${existingPexels}, needs ${needed} more)`);
        if (placeQuery) {
          console.log(`      place search:    "${placeQuery}" (${PHOTOS_PER_SEARCH} photos)`);
          console.log(`      activity search: "${activityQuery}" (${PHOTOS_PER_SEARCH} photos)`);
          requestsNeeded += 2;
        } else {
          console.log(`      activity search: "${activityQuery}" (${PHOTOS_PER_SEARCH} photos)`);
          requestsNeeded += 1;
        }
        totalPhotosNeeded += needed;
        wouldFetch++;
      }
    }

    const maxPhotos = totalPhotosNeeded;
    const batches = Math.ceil(requestsNeeded / MAX_REQUESTS);
    console.log(`\nSummary:`);
    console.log(`  Total activities:  ${activities.length}`);
    console.log(`  Already fetched:   ${alreadyFetched}`);
    console.log(`  Would fetch:       ${wouldFetch}`);
    console.log(`  Photos per search: ${PHOTOS_PER_SEARCH}`);
    console.log(`  Max photos added:  up to ${maxPhotos}`);
    console.log(`  API requests needed: ${requestsNeeded}`);
    console.log(
      `  Rate limit batches: ${batches} (${MAX_REQUESTS} requests/hour)`,
    );
    return;
  }

  // Track attributions for compliance
  const attributions: Array<{
    activity: string;
    photographer: string;
    profileUrl: string;
    searchUsed: string;
  }> = [];

  let updated = fileContent;
  let requestCount = 0;

  // Target: PHOTOS_PER_SEARCH from place search + PHOTOS_PER_SEARCH from activity search
  const targetPexels = PHOTOS_PER_SEARCH * 2;

  for (const act of activities) {
    const existingPexels = act.photoUrls.filter((u) => u.includes("pexels.com")).length;
    const needed = targetPexels - existingPexels;

    if (needed <= 0) {
      console.log(`\u2713 ${act.name} \u2014 has ${existingPexels} Pexels photo(s), target met`);
      continue;
    }

    if (requestCount >= MAX_REQUESTS) {
      console.log(`\nRate limit reached after ${requestCount} requests.`);
      console.log(
        `Re-run this script in ~1 hour to fetch the remaining activities.`,
      );
      break;
    }

    const newUrls: string[] = [];
    const seenPhotoIds = new Set<number>();
    // Avoid fetching duplicates of existing Pexels URLs
    const existingUrls = new Set(act.photoUrls);
    console.log(`Fetching: ${act.name} (has ${existingPexels}, needs ${needed} more)`);

    // Search for place photos
    if (act.place && requestCount < MAX_REQUESTS) {
      const placeQuery = buildQuery(act.place, act.category);
      console.log(`  \u2192 place search: "${placeQuery}" (${PHOTOS_PER_SEARCH})`);
      const placeResults = await searchPexels(placeQuery);
      requestCount++;
      for (const photo of placeResults) {
        if (newUrls.length >= needed) break;
        if (seenPhotoIds.has(photo.id)) continue;
        if (existingUrls.has(photo.src.large)) continue;
        seenPhotoIds.add(photo.id);
        newUrls.push(photo.src.large);
        attributions.push({
          activity: act.name,
          photographer: photo.photographer,
          profileUrl: photo.photographer_url,
          searchUsed: `place: ${placeQuery}`,
        });
        console.log(`  \u2713 place photo \u2192 ${photo.photographer}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    // Search for activity photos
    if (requestCount < MAX_REQUESTS) {
      const activityQuery = buildQuery(act.name, act.category);
      console.log(`  \u2192 activity search: "${activityQuery}" (${PHOTOS_PER_SEARCH})`);
      const actResults = await searchPexels(activityQuery);
      requestCount++;
      for (const photo of actResults) {
        if (newUrls.length >= needed) break;
        if (seenPhotoIds.has(photo.id)) continue;
        if (existingUrls.has(photo.src.large)) continue;
        seenPhotoIds.add(photo.id);
        newUrls.push(photo.src.large);
        attributions.push({
          activity: act.name,
          photographer: photo.photographer,
          profileUrl: photo.photographer_url,
          searchUsed: `activity: ${activityQuery}`,
        });
        console.log(`  \u2713 activity photo \u2192 ${photo.photographer}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    if (newUrls.length === 0) {
      console.log(`  \u2717 No results for "${act.name}", keeping existing`);
      continue;
    }

    // Build new photoUrls array: existing URLs + new Pexels URLs
    const allUrls = [...act.photoUrls, ...newUrls];
    const urlsString = allUrls.map((u) => `"${u}"`).join(", ");
    const newArrayLiteral = `photoUrls: [${urlsString}]`;

    // Replace the old photoUrls array in the file
    const oldArrayRegex = new RegExp(
      `photoUrls:\\s*\\[${act.photoUrls.map((u) => `\\s*"${u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*,?`).join("")}\\s*\\]`,
    );
    updated = updated.replace(oldArrayRegex, newArrayLiteral);

    console.log(
      `  \u2713 ${act.name} now has ${allUrls.length} photo(s)`,
    );
  }

  // Write updated data file
  fs.writeFileSync(DATA_FILE, updated, "utf-8");
  console.log(`\nUpdated ${DATA_FILE}`);
  console.log(`Used ${requestCount} API requests`);

  // Write attributions file (required by Pexels guidelines)
  if (attributions.length > 0) {
    const attrPath = path.resolve(
      __dirname,
      "../src/data/photo-attributions.json",
    );
    const existing = fs.existsSync(attrPath)
      ? JSON.parse(fs.readFileSync(attrPath, "utf-8"))
      : [];
    const merged = [...existing, ...attributions];
    fs.writeFileSync(attrPath, JSON.stringify(merged, null, 2), "utf-8");
    console.log(`Attributions written to ${attrPath}`);
  }
}

main().catch(console.error);
