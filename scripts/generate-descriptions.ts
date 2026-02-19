/**
 * Generates activity descriptions and highlights using GPT-4o mini via OpenRouter.
 *
 * Usage:
 *   OPENROUTER_API_KEY=xxx npx ts-node scripts/generate-descriptions.ts
 *   npx ts-node scripts/generate-descriptions.ts --dry       # preview only
 *   npx ts-node scripts/generate-descriptions.ts --force     # overwrite existing descriptions
 *
 * Writes description and highlights fields directly into activities.paris.ts.
 */

import * as fs from "fs";
import * as path from "path";

const DRY_RUN =
  process.argv.includes("--dry") || process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY && !DRY_RUN) {
  console.error("Set OPENROUTER_API_KEY env variable");
  process.exit(1);
}

const DATA_FILE = path.resolve(__dirname, "../src/data/activities.paris.ts");

type ActivityBlock = {
  fullMatch: string;
  id: string;
  name: string;
  place?: string;
  category: string;
  tags: string[];
  durationMins: number;
  priceTier: number;
  neighborhood: string;
  mustBook: boolean;
  hasDescription: boolean;
  index: number;
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
    const placeMatch = text.match(/place:\s*"([^"]+)"/);
    const neighborhoodMatch = text.match(/neighborhood:\s*"([^"]+)"/);
    const durationMatch = text.match(/durationMins:\s*(\d+)/);
    const priceMatch = text.match(/priceTier:\s*(\d)/);
    const mustBookMatch = text.match(/mustBook:\s*(true|false)/);
    const tagsMatch = text.match(/tags:\s*\[([\s\S]*?)\]/);
    const descMatch = text.match(/description:\s*"/);

    if (!idMatch || !nameMatch || !categoryMatch) continue;

    const tagStrings = tagsMatch
      ? (tagsMatch[1].match(/"([^"]+)"/g) || []).map((t) => t.slice(1, -1))
      : [];

    results.push({
      fullMatch: text,
      id: idMatch[1],
      name: nameMatch[1],
      place: placeMatch ? placeMatch[1] : undefined,
      category: categoryMatch[1],
      tags: tagStrings,
      durationMins: durationMatch ? parseInt(durationMatch[1], 10) : 60,
      priceTier: priceMatch ? parseInt(priceMatch[1], 10) : 1,
      neighborhood: neighborhoodMatch ? neighborhoodMatch[1] : "Paris",
      mustBook: mustBookMatch ? mustBookMatch[1] === "true" : false,
      hasDescription: !!descMatch,
      index: block.index,
    });
  }
  return results;
}

async function generateDescription(
  act: ActivityBlock,
): Promise<{ description: string; highlights: string[] }> {
  const prompt = `Write a description for a Paris travel activity card.

Activity: "${act.name}"
${act.place ? `Place: ${act.place}` : ""}
Category: ${act.category}
Tags: ${act.tags.join(", ")}
Duration: ${act.durationMins} minutes
Price tier: ${act.priceTier}/3 (0=free, 3=expensive)
Neighborhood: ${act.neighborhood}
Must book ahead: ${act.mustBook ? "yes" : "no"}

Write:
1. A vivid, informative description (2-3 sentences, ~80-120 words). Include what makes it special, what visitors will experience, and any practical tips. Write in second person ("you'll").
2. 3-4 highlight bullet points (short phrases, not full sentences).

Respond with ONLY valid JSON, no markdown:
{"description": "...", "highlights": ["...", "...", "..."]}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
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
      description: String(parsed.description || ""),
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.map(String)
        : [],
    };
  } catch {
    throw new Error(`Failed to parse LLM response: ${text}`);
  }
}

function escapeForTS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

async function main() {
  const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
  const activities = parseActivities(fileContent);

  const toGenerate = FORCE
    ? activities
    : activities.filter((a) => !a.hasDescription);

  console.log(`Found ${activities.length} activities`);
  console.log(
    `Already have descriptions: ${activities.length - toGenerate.length}`,
  );
  console.log(`To generate: ${toGenerate.length}\n`);

  if (DRY_RUN) {
    console.log("--- DRY RUN (no API calls) ---\n");
    for (const act of toGenerate) {
      console.log(`  ○ ${act.name} (${act.category}, ${act.neighborhood})`);
    }
    if (toGenerate.length === 0) {
      console.log(
        "  All activities already have descriptions. Use --force to regenerate.",
      );
    }
    console.log(`\nWould make ${toGenerate.length} API calls`);
    return;
  }

  if (toGenerate.length === 0) {
    console.log(
      "All activities already have descriptions. Use --force to regenerate.",
    );
    return;
  }

  let updated = fileContent;
  let errors = 0;

  for (let i = 0; i < toGenerate.length; i++) {
    const act = toGenerate[i];
    process.stdout.write(`[${i + 1}/${toGenerate.length}] ${act.name}... `);

    try {
      const result = await generateDescription(act);

      // Build the fields to inject
      const descField = `description: "${escapeForTS(result.description)}"`;
      const highlightsField = `highlights: [${result.highlights.map((h) => `"${escapeForTS(h)}"`).join(", ")}]`;

      // Find the current block in the updated content and inject fields before the closing brace
      // We look for the popularity line (or mustBook if no popularity) as anchor
      const currentBlock = updated.indexOf(act.fullMatch) !== -1
        ? act.fullMatch
        : null;

      if (!currentBlock) {
        console.log("✗ Could not locate block in file");
        errors++;
        continue;
      }

      if (FORCE && act.hasDescription) {
        // Remove existing description and highlights fields first
        let cleaned = currentBlock.replace(
          /\s*description:\s*"(?:[^"\\]|\\.)*",?/g,
          "",
        );
        cleaned = cleaned.replace(
          /\s*highlights:\s*\[(?:[^\]]*)\],?/g,
          "",
        );
        updated = updated.replace(currentBlock, cleaned);
        // Update reference for insertion below
        act.fullMatch = cleaned;
      }

      // Insert before the closing brace of the activity object
      const blockInFile = FORCE && act.hasDescription ? act.fullMatch : currentBlock;
      const closingBraceIdx = blockInFile.lastIndexOf("}");
      const beforeBrace = blockInFile.slice(0, closingBraceIdx);
      const afterBrace = blockInFile.slice(closingBraceIdx);

      // Determine indentation from existing fields
      const indentMatch = beforeBrace.match(/\n(\s+)\w+:/);
      const indent = indentMatch ? indentMatch[1] : "    ";

      const injection = `\n${indent}${descField},\n${indent}${highlightsField},`;
      const newBlock = beforeBrace.trimEnd() + "," + injection + "\n" + indent.slice(2) + afterBrace.trim();

      // Actually, simpler approach: insert before closing }
      const insertionPoint = blockInFile.lastIndexOf("}");
      const before = blockInFile.slice(0, insertionPoint).trimEnd();
      // Ensure trailing comma
      const withComma = before.endsWith(",") ? before : before + ",";
      const replacement =
        withComma + `\n${indent}${descField},\n${indent}${highlightsField},\n${indent.slice(2)}}`;

      updated = updated.replace(blockInFile, replacement);

      console.log(`✓ ${result.highlights.length} highlights`);
    } catch (err) {
      errors++;
      console.log(`✗ Error: ${err instanceof Error ? err.message : err}`);
    }

    // 200ms delay between requests
    if (i < toGenerate.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  fs.writeFileSync(DATA_FILE, updated, "utf-8");
  console.log(`\nUpdated ${DATA_FILE}`);

  if (errors > 0) {
    console.log(`${errors} error(s) during generation`);
  }
}

main().catch(console.error);
