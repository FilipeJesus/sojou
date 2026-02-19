/**
 * Scores photo quality and relevance using GPT-4o mini vision via OpenRouter.
 *
 * Usage:
 *   OPENROUTER_API_KEY=xxx npx ts-node scripts/score-photos.ts
 *   npx ts-node scripts/score-photos.ts --dry              # preview only, no API calls
 *   npx ts-node scripts/score-photos.ts --threshold 8      # flag photos scoring below 8
 *   npx ts-node scripts/score-photos.ts --force            # re-score already cached photos
 *
 * Results are cached in src/data/photo-scores.json — re-runs skip already-scored URLs.
 */

import * as fs from "fs";
import * as path from "path";

const DRY_RUN =
  process.argv.includes("--dry") || process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

function parseIntFlag(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  const val = parseInt(process.argv[idx + 1], 10);
  return Number.isNaN(val) || val < 1 ? fallback : val;
}

const THRESHOLD = parseIntFlag("--threshold", 6);

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY && !DRY_RUN) {
  console.error("Set OPENROUTER_API_KEY env variable");
  process.exit(1);
}

const DATA_FILE = path.resolve(__dirname, "../src/data/activities.paris.ts");
const SCORES_FILE = path.resolve(__dirname, "../src/data/photo-scores.json");

type PhotoScore = {
  activityId: string;
  activityName: string;
  photoUrl: string;
  relevanceScore: number;
  qualityScore: number;
  score: number;
  reasoning: string;
  pass: boolean;
  scoredAt: string;
};

type ActivityBlock = {
  id: string;
  name: string;
  category: string;
  photoUrls: string[];
};

function parseActivities(content: string): ActivityBlock[] {
  const results: ActivityBlock[] = [];
  const blockRegex = /\{[^{}]*(?:\[[^\]]*\][^{}]*)*\}/gs;
  let block;
  while ((block = blockRegex.exec(content))) {
    const text = block[0];
    const idMatch = text.match(/id:\s*"([^"]+)"/);
    const nameMatch = text.match(/name:\s*"([^"]+)"/);
    const categoryMatch = text.match(/category:\s*"([^"]+)"/);
    const photoUrlsMatch = text.match(/photoUrls:\s*\[([\s\S]*?)\]/);

    if (!idMatch || !nameMatch || !categoryMatch || !photoUrlsMatch) continue;

    const urlMatches = photoUrlsMatch[1].match(/"([^"]+)"/g);
    const photoUrls = urlMatches ? urlMatches.map((u) => u.slice(1, -1)) : [];

    results.push({
      id: idMatch[1],
      name: nameMatch[1],
      category: categoryMatch[1],
      photoUrls,
    });
  }
  return results;
}

function loadCache(): PhotoScore[] {
  if (!fs.existsSync(SCORES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SCORES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveCache(scores: PhotoScore[]): void {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), "utf-8");
}

async function scorePhoto(
  activityName: string,
  category: string,
  photoUrl: string,
): Promise<{ relevance: number; quality: number; reasoning: string }> {
  const prompt = `You are evaluating a photo for a travel app activity card.

Activity: "${activityName}" (category: ${category}, location: Paris, France)

Score this photo on two dimensions (1-10 each):
1. **Relevance**: How well does this photo represent the activity? A photo of the Eiffel Tower for an "Eiffel Tower Visit" activity scores 10. A generic cityscape scores 3-4.
2. **Quality**: Visual appeal, composition, lighting, resolution. Professional photography scores 8-10. Blurry or poorly composed scores 1-4.

Respond with ONLY valid JSON, no markdown:
{"relevance": <number>, "quality": <number>, "reasoning": "<1 sentence>"}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: photoUrl } },
          ],
        },
      ],
      max_tokens: 150,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";

  try {
    const parsed = JSON.parse(text);
    return {
      relevance: Math.min(10, Math.max(1, Math.round(parsed.relevance))),
      quality: Math.min(10, Math.max(1, Math.round(parsed.quality))),
      reasoning: String(parsed.reasoning || ""),
    };
  } catch {
    throw new Error(`Failed to parse LLM response: ${text}`);
  }
}

async function main() {
  const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
  const activities = parseActivities(fileContent);
  const cache = loadCache();
  const cachedUrls = new Set(cache.map((s) => s.photoUrl));

  // Build list of photos to score
  const toScore: Array<{
    activityId: string;
    activityName: string;
    category: string;
    photoUrl: string;
  }> = [];

  for (const act of activities) {
    for (const url of act.photoUrls) {
      if (!FORCE && cachedUrls.has(url)) continue;
      toScore.push({
        activityId: act.id,
        activityName: act.name,
        category: act.category,
        photoUrl: url,
      });
    }
  }

  const totalPhotos = activities.reduce((n, a) => n + a.photoUrls.length, 0);

  console.log(`Found ${activities.length} activities with ${totalPhotos} total photos`);
  console.log(`Already scored: ${cachedUrls.size}`);
  console.log(`Photos to score: ${toScore.length}`);
  console.log(`Threshold: ${THRESHOLD}/10\n`);

  if (DRY_RUN) {
    console.log("--- DRY RUN (no API calls) ---\n");
    for (const item of toScore) {
      console.log(`  ○ ${item.activityName}`);
      console.log(`    ${item.photoUrl.slice(0, 80)}...`);
    }
    if (toScore.length === 0) {
      console.log("  All photos already scored. Use --force to re-score.");
    }
    console.log(`\nWould make ${toScore.length} API calls`);
    return;
  }

  if (toScore.length === 0) {
    console.log("All photos already scored. Use --force to re-score.\n");
  }

  // Score sequentially with delay
  const newScores: PhotoScore[] = [];
  let errors = 0;

  for (let i = 0; i < toScore.length; i++) {
    const item = toScore[i];
    process.stdout.write(
      `[${i + 1}/${toScore.length}] ${item.activityName}... `,
    );

    try {
      const result = await scorePhoto(
        item.activityName,
        item.category,
        item.photoUrl,
      );
      const compositeScore = (result.relevance + result.quality) / 2;
      const entry: PhotoScore = {
        activityId: item.activityId,
        activityName: item.activityName,
        photoUrl: item.photoUrl,
        relevanceScore: result.relevance,
        qualityScore: result.quality,
        score: Math.round(compositeScore * 10) / 10,
        reasoning: result.reasoning,
        pass: compositeScore >= THRESHOLD,
        scoredAt: new Date().toISOString(),
      };
      newScores.push(entry);
      const status = entry.pass ? "✓" : "⚠";
      console.log(
        `${status} ${result.relevance}r/${result.quality}q = ${entry.score} — ${result.reasoning}`,
      );
    } catch (err) {
      errors++;
      console.log(`✗ Error: ${err instanceof Error ? err.message : err}`);
    }

    // 200ms delay between requests
    if (i < toScore.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Merge with cache (replace existing entries for same URL if --force)
  let allScores: PhotoScore[];
  if (FORCE) {
    const newUrlSet = new Set(newScores.map((s) => s.photoUrl));
    allScores = [
      ...cache.filter((s) => !newUrlSet.has(s.photoUrl)),
      ...newScores,
    ];
  } else {
    allScores = [...cache, ...newScores];
  }

  saveCache(allScores);
  console.log(`\nSaved ${allScores.length} scores to ${SCORES_FILE}`);

  // Print report
  const passing = allScores.filter((s) => s.pass);
  const flagged = allScores.filter((s) => !s.pass);

  console.log(`\n--- REPORT (threshold: ${THRESHOLD}/10) ---`);
  console.log(`Passing: ${passing.length}`);
  console.log(`Flagged: ${flagged.length}`);

  if (flagged.length > 0) {
    console.log(`\nFlagged photos:`);
    for (const s of flagged) {
      console.log(
        `  ⚠ ${s.activityName} — ${s.relevanceScore}r/${s.qualityScore}q = ${s.score}`,
      );
      console.log(`    ${s.reasoning}`);
      console.log(`    ${s.photoUrl.slice(0, 80)}...`);
    }
  }

  if (errors > 0) {
    console.log(`\n${errors} error(s) during scoring`);
  }
}

main().catch(console.error);
