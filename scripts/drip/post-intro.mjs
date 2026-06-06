#!/usr/bin/env node
// One-shot @kinetiksignal intro post — image + intro-x-post.txt caption.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishXThread } from "../../drip-engine/publishers/x-publisher.ts";
import { loadEnvQuiet } from "../bureau/lib.mjs";

loadEnvQuiet();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const captionPath = path.join(root, "landing/public/drip/intro-x-post.txt");
const imagePath = path.join(root, "landing/public/drip/daily-card.png");

const caption = fs.readFileSync(captionPath, "utf8").trim();
const imagePng = fs.readFileSync(imagePath);

if (process.env.DRIP_DRY_RUN === "true") {
  console.log(`[intro:x] DRY_RUN caption (${caption.length} chars) + image (${imagePng.length} bytes)`);
  console.log(caption);
  process.exit(0);
}

const result = await publishXThread("", { caption, imagePng });
console.log(`[intro:x] ${result.message}`);
if (!result.ok) process.exit(1);
