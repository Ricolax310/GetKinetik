// Network-specific taxonomy v2 sensitivity — all reviewed DePIN networks.

import type { SignalCategory } from "./taxonomy.ts";

export type Sensitivity = "high" | "medium" | "low";

export type NetworkId =
  | "geodnet"
  | "weatherxm"
  | "hivemapper"
  | "natix"
  | "nodle"
  | "dawn"
  | "grass"
  | "dimo";

const SENSITIVITY_WEIGHT: Record<Sensitivity, number> = {
  high: 1.0,
  medium: 0.85,
  low: 0.65,
};

export const NETWORK_CATEGORY_SENSITIVITY: Record<
  NetworkId,
  Partial<Record<SignalCategory, Sensitivity>>
> = {
  weatherxm: {
    CAPACITY: "high",
    INFRASTRUCTURE: "medium",
    IDENTITY: "low",
    CONSISTENCY: "medium",
    BEHAVIORAL: "low",
  },
  geodnet: {
    IDENTITY: "high",
    INFRASTRUCTURE: "medium",
    CONSISTENCY: "medium",
    CAPACITY: "low",
  },
  natix: {
    INFRASTRUCTURE: "high",
    BEHAVIORAL: "high",
    CONSISTENCY: "high",
    ECONOMICS: "medium",
  },
  hivemapper: {
    ECONOMICS: "high",
    INFRASTRUCTURE: "medium",
    CONSISTENCY: "low",
  },
  nodle: {
    INFRASTRUCTURE: "high",
    IDENTITY: "medium",
    BEHAVIORAL: "medium",
  },
  dawn: {
    INFRASTRUCTURE: "high",
    BEHAVIORAL: "medium",
    IDENTITY: "medium",
  },
  grass: {
    BEHAVIORAL: "high",
    INFRASTRUCTURE: "medium",
    IDENTITY: "medium",
  },
  dimo: {
    INFRASTRUCTURE: "medium",
    BEHAVIORAL: "medium",
    CONSISTENCY: "medium",
    IDENTITY: "low",
  },
};

const ALIASES: Record<string, NetworkId> = {
  geodnet: "geodnet",
  geod: "geodnet",
  weatherxm: "weatherxm",
  weather: "weatherxm",
  hivemapper: "hivemapper",
  honey: "hivemapper",
  natix: "natix",
  natixnetwork: "natix",
  nodle: "nodle",
  dawn: "dawn",
  dawnnetwork: "dawn",
  grass: "grass",
  titan: "grass",
  grasstitan: "grass",
  dimo: "dimo",
};

export function normalizeNetworkId(name: string): NetworkId | null {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ALIASES[key]) return ALIASES[key];
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) return id;
  }
  return null;
}

export function sensitivityFor(network: string, category: SignalCategory): Sensitivity {
  const id = normalizeNetworkId(network);
  if (!id) return "medium";
  return NETWORK_CATEGORY_SENSITIVITY[id][category] ?? "medium";
}

export function categoryWeight(network: string, category: SignalCategory): number {
  return SENSITIVITY_WEIGHT[sensitivityFor(network, category)];
}
