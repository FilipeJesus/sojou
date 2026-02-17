/**
 * Fetches Unsplash photos for Paris activities and updates the data file.
 *
 * Usage:
 *   UNSPLASH_ACCESS_KEY=your_key npx ts-node scripts/fetch-unsplash-photos.ts
 *   npx ts-node scripts/fetch-unsplash-photos.ts --dry   # preview without API calls
 *
 * The Unsplash free tier allows 50 requests/hour.
 * With 63 activities, this script will:
 *   - Fetch the first 50, write a partial update
 *   - Tell you to wait and re-run for the remaining 13
 *
 * Re-running is safe — it skips activities that already have Unsplash URLs.
 */

import * as fs from "fs";
import * as path from "path";

const DRY_RUN = process.argv.includes("--dry") || process.argv.includes("--dry-run");

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY && !DRY_RUN) {
  console.error("Set UNSPLASH_ACCESS_KEY env variable");
  process.exit(1);
}

const DATA_FILE = path.resolve(__dirname, "../src/data/activities.paris.ts");
const RATE_LIMIT = 48; // leave 2 req headroom

type UnsplashResult = {
  urls: { regular: string; small: string; raw: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
};

type ActivityEntry = {
  id: string;
  name: string;
  searchQuery: string;
};

// Build search queries from activity names — add "Paris" for context
function buildSearchQuery(name: string, category: string): string {
  const base = name.replace(/['']/g, "'");
  // For food/night categories, the name alone is often enough
  if (category === "food" || category === "night") {
    return `${base} Paris`;
  }
  return `${base} Paris France`;
}

async function searchUnsplash(query: string): Promise<UnsplashResult | null> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=portrait&per_page=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });

  if (res.status === 403) {
    console.error("Rate limit hit. Wait an hour and re-run.");
    return null;
  }
  if (!res.ok) {
    console.error(`Unsplash API error ${res.status}: ${await res.text()}`);
    return null;
  }

  const data = await res.json();
  const remaining = res.headers.get("x-ratelimit-remaining");
  console.log(`  Rate limit remaining: ${remaining}`);

  if (!data.results || data.results.length === 0) return null;
  return data.results[0] as UnsplashResult;
}

// Trigger Unsplash download endpoint (required by API guidelines)
async function triggerDownload(downloadLocation: string): Promise<void> {
  await fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  }).catch(() => {});
}

async function main() {
  const fileContent = fs.readFileSync(DATA_FILE, "utf-8");

  // Extract all activities with their IDs, names, and categories
  const idRegex = /id:\s*"([^"]+)"/g;
  const nameRegex = /name:\s*"([^"]+)"/g;
  const categoryRegex = /category:\s*"([^"]+)"/g;
  const photoRegex = /photoUrl:\s*"([^"]+)"/g;

  const ids: string[] = [];
  const names: string[] = [];
  const categories: string[] = [];
  const photos: string[] = [];

  let m;
  while ((m = idRegex.exec(fileContent))) ids.push(m[1]);
  while ((m = nameRegex.exec(fileContent))) names.push(m[1]);
  while ((m = categoryRegex.exec(fileContent))) categories.push(m[1]);
  while ((m = photoRegex.exec(fileContent))) photos.push(m[1]);

  console.log(`Found ${ids.length} activities`);

  if (DRY_RUN) {
    console.log("\n--- DRY RUN (no API calls, no file writes) ---\n");
    let alreadyFetched = 0;
    let wouldFetch = 0;

    for (let i = 0; i < ids.length; i++) {
      if (photos[i].includes("unsplash.com")) {
        console.log(`  ✓ ${names[i]} — already has Unsplash URL`);
        alreadyFetched++;
      } else {
        const query = buildSearchQuery(names[i], categories[i]);
        console.log(`  ○ ${names[i]} — would search: "${query}"`);
        wouldFetch++;
      }
    }

    const batches = Math.ceil(wouldFetch / RATE_LIMIT);
    console.log(`\nSummary:`);
    console.log(`  Total activities:  ${ids.length}`);
    console.log(`  Already fetched:   ${alreadyFetched}`);
    console.log(`  Would fetch:       ${wouldFetch}`);
    console.log(`  Rate limit batches: ${batches} (${RATE_LIMIT} per hour)`);
    return;
  }

  // Track attributions for compliance
  const attributions: Array<{ activity: string; photographer: string; profileUrl: string }> = [];

  let updated = fileContent;
  let fetchCount = 0;

  for (let i = 0; i < ids.length; i++) {
    const currentPhoto = photos[i];

    // Skip if already has an Unsplash URL
    if (currentPhoto.includes("unsplash.com")) {
      console.log(`✓ ${names[i]} — already has Unsplash URL`);
      continue;
    }

    if (fetchCount >= RATE_LIMIT) {
      console.log(`\nRate limit reached after ${fetchCount} fetches.`);
      console.log(`Re-run this script in ~1 hour to fetch the remaining ${ids.length - i} activities.`);
      break;
    }

    const query = buildSearchQuery(names[i], categories[i]);
    console.log(`Fetching: ${names[i]} (query: "${query}")`);

    const result = await searchUnsplash(query);
    if (!result) {
      console.log(`  ✗ No result for "${names[i]}", keeping placeholder`);
      continue;
    }

    // Use the "regular" size (1080w) — good for mobile at 2-3x
    const newUrl = result.urls.regular;
    updated = updated.replace(currentPhoto, newUrl);

    attributions.push({
      activity: names[i],
      photographer: result.user.name,
      profileUrl: result.user.links.html,
    });

    // Trigger download per Unsplash API guidelines
    await triggerDownload(result.links.download_location);

    fetchCount++;
    console.log(`  ✓ ${names[i]} → ${result.user.name}`);

    // Small delay to be respectful
    await new Promise((r) => setTimeout(r, 200));
  }

  // Write updated data file
  fs.writeFileSync(DATA_FILE, updated, "utf-8");
  console.log(`\nUpdated ${DATA_FILE}`);
  console.log(`Fetched ${fetchCount} new photos`);

  // Write attributions file (required by Unsplash guidelines)
  if (attributions.length > 0) {
    const attrPath = path.resolve(__dirname, "../src/data/photo-attributions.json");
    const existing = fs.existsSync(attrPath)
      ? JSON.parse(fs.readFileSync(attrPath, "utf-8"))
      : [];
    const merged = [...existing, ...attributions];
    fs.writeFileSync(attrPath, JSON.stringify(merged, null, 2), "utf-8");
    console.log(`Attributions written to ${attrPath}`);
  }
}

main().catch(console.error);
