// Prevents duplicate X posts when drip workflows run more than once per cadence window.

import fs from "node:fs";
import path from "node:path";
import { PATHS } from "./paths.ts";

export type XPostCadence = "daily" | "weekly" | "monthly";

export interface XPostLedger {
  daily?: string;
  weekly?: string;
  monthly?: string;
  /** Date key of the last @Kinetik_Rick amplification quote-tweet. */
  rickDaily?: string;
}

const LEDGER_PATH = path.join(PATHS.publicDrip, "x-post-ledger.json");

function readLedger(): XPostLedger {
  if (!fs.existsSync(LEDGER_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8")) as XPostLedger;
  } catch {
    return {};
  }
}

function writeLedger(ledger: XPostLedger): void {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`);
}

/** True when this cadence key was already posted and DRIP_FORCE_X_POST is not set. */
export function xPostAlreadyDone(cadence: XPostCadence, key: string): boolean {
  if (process.env.DRIP_FORCE_X_POST === "true") return false;
  const ledger = readLedger();
  return ledger[cadence] === key;
}

export function recordXPost(cadence: XPostCadence, key: string): void {
  const ledger = readLedger();
  ledger[cadence] = key;
  writeLedger(ledger);
}

export function skipXPostMessage(cadence: XPostCadence, key: string): string {
  return `Skipped X post — ${cadence} already published for ${key} (set DRIP_FORCE_X_POST=true to override)`;
}

/** True when Rick already amplified this date (and not forced). */
export function rickAlreadyDone(key: string): boolean {
  if (process.env.DRIP_FORCE_X_POST === "true") return false;
  return readLedger().rickDaily === key;
}

export function recordRick(key: string): void {
  const ledger = readLedger();
  ledger.rickDaily = key;
  writeLedger(ledger);
}
