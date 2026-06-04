// Agent A — Schema / Structure Authority
// Contract-only module: enums + interfaces + JSON schemas.
// No rendering logic, no diff logic, no pipeline logic.

export const CONTRACT_VERSION = "2026-06-02.a";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const GrammarVersionEnum = Object.freeze(["v2", "v3"]);

export const CategoryEnum = Object.freeze([
  "CAPACITY",
  "IDENTITY",
  "CONSISTENCY",
  "ECONOMICS",
  "BEHAVIORAL",
  "INFRASTRUCTURE",
]);

export const LegacyCategoryEnum = Object.freeze(["integrity", "health", "growth", "economics"]);

export const ScopeEnum = Object.freeze(["localized", "cross-network", "systemic"]);

export const StructureEnum = Object.freeze(["flat", "incremental", "structural"]);

export const ShiftTypeEnum = Object.freeze([
  "stable",
  "refined",
  "reclassified",
  "expanded_scope",
  "collapsed_scope",
]);

export const SeverityEnum = Object.freeze(["low", "medium", "high"]);

// ---------------------------------------------------------------------------
// Grammar Function Contract (existence + signatures only)
// ---------------------------------------------------------------------------

export const GrammarFunctionContract = Object.freeze({
  renderDelta: {
    input: "SignalLike",
    output: "string",
    required: true,
  },
  renderStability: {
    input: "SignalLike",
    output: "string",
    required: true,
  },
  renderSuppression: {
    input: "SignalLike",
    output: "{ suppressed: boolean, reason: string | null }",
    required: true,
  },
  classifyStructure: {
    input: "{ signal: SignalLike, suppressed: boolean }",
    output: "flat | incremental | structural",
    required: true,
  },
  getScope: {
    input: "{ category: CategoryEnum, interpretedRows: InterpretedSignalRow[] }",
    output: "localized | cross-network | systemic",
    required: true,
  },
});

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

export const SignalLikeSchema = Object.freeze({
  type: "object",
  required: ["type", "message", "severity", "confidence"],
  additionalProperties: true,
  properties: {
    network: { type: "string" },
    networkId: { type: "string" },
    type: { type: "string" }, // legacy category (v1)
    anomalyType: { type: "string" },
    metric: { type: "string" },
    metricKey: { type: "string" },
    value: { type: "number" },
    previous: { type: "number" },
    delta: { type: "number" },
    message: { type: "string" },
    severity: { type: "string", enum: SeverityEnum },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    timestamp: { type: "string" },
    asOf: { type: "string" },
    kind: { type: "string" },
  },
});

export const FeedNetworkSchema = Object.freeze({
  type: "object",
  required: ["network", "networkId", "status", "signals"],
  additionalProperties: true,
  properties: {
    network: { type: "string" },
    networkId: { type: "string" },
    status: { type: "string", enum: ["active", "pending"] },
    note: { type: "string" },
    signals: {
      type: "array",
      items: SignalLikeSchema,
    },
  },
});

export const ExecutionFeedSchema = Object.freeze({
  type: "object",
  required: ["schema", "cadence", "generatedAt", "networks"],
  additionalProperties: true,
  properties: {
    schema: { type: "string" },
    cadence: { type: "string", enum: ["daily", "weekly", "monthly"] },
    generatedAt: { type: "string" },
    date: { type: "string" },
    totals: { type: "object" },
    sectorSummary: { type: "array" },
    networks: {
      type: "array",
      items: FeedNetworkSchema,
    },
  },
});

export const InterpretedSignalRowSchema = Object.freeze({
  type: "object",
  required: ["network", "signalType", "v1_category", "v2_category", "shift_type"],
  additionalProperties: false,
  properties: {
    network: { type: "string" },
    signalType: { type: "string" },
    v1_category: { type: "string", enum: LegacyCategoryEnum },
    v2_category: { type: "string", enum: CategoryEnum },
    shift_type: { type: "string", enum: ShiftTypeEnum },
  },
});

// Stage B (grammar runtime) output contracts.
export const ProcessedSignalSchema = Object.freeze({
  type: "object",
  required: ["network", "category", "structure", "suppressed", "deltaPhrase", "stabilityPhrase", "severity"],
  additionalProperties: true,
  properties: {
    network: { type: "string" },
    networkId: { type: "string" },
    v1_category: { type: "string" },
    category: { type: "string", enum: CategoryEnum },
    severity: { type: "string", enum: SeverityEnum },
    structure: { type: "string", enum: StructureEnum },
    suppressed: { type: "boolean" },
    suppressionReason: { type: ["string", "null"] },
    deltaPhrase: { type: "string" },
    stabilityPhrase: { type: "string" },
    metric: { type: "string" },
    value: { type: ["number", "null"] },
    previous: { type: ["number", "null"] },
    delta: { type: "number" },
  },
});

export const ProcessedPatternSchema = Object.freeze({
  type: "object",
  required: ["category", "scope", "structure", "networks", "classificationText", "signalLines"],
  additionalProperties: false,
  properties: {
    category: { type: "string", enum: CategoryEnum },
    scope: { type: "string", enum: ScopeEnum },
    structure: { type: "string", enum: StructureEnum },
    networks: { type: "array", items: { type: "string" } },
    classificationText: { type: "string" },
    signalLines: { type: "array", items: { type: "string" } },
  },
});

export const ExecutionEngineOutputSchema = Object.freeze({
  type: "object",
  required: ["markdown", "grammarVersion", "stats"],
  additionalProperties: false,
  properties: {
    markdown: { type: "string" },
    grammarVersion: { type: "string", enum: GrammarVersionEnum },
    stats: {
      type: "object",
      required: ["signalCount", "suppressedCount", "categoryBreakdown"],
      additionalProperties: false,
      properties: {
        signalCount: { type: "number" },
        suppressedCount: { type: "number" },
        categoryBreakdown: { type: "object" },
      },
    },
  },
});

export const ExecutiveSummarySchema = Object.freeze({
  type: "array",
  maxItems: 5,
  items: { type: "string" },
});

export const PatternBlockSchema = Object.freeze({
  type: "object",
  required: [
    "category",
    "observed_networks",
    "signal_summary",
    "scope_classification",
    "structural_classification",
    "unknowns",
  ],
  additionalProperties: false,
  properties: {
    category: { type: "string", enum: CategoryEnum },
    observed_networks: { type: "array", items: { type: "string" } },
    signal_summary: { type: "array", items: { type: "string" } },
    scope_classification: { type: "string", enum: ScopeEnum },
    structural_classification: { type: "string", enum: StructureEnum },
    unknowns: { type: "string" },
  },
});

export const NetworkWatchItemSchema = Object.freeze({
  type: "object",
  required: ["network", "what_changed", "signal_type", "trend", "open_question", "what_we_dont_know"],
  additionalProperties: false,
  properties: {
    network: { type: "string" },
    what_changed: { type: "array", items: { type: "string" } },
    signal_type: { type: "string", enum: CategoryEnum },
    trend: { type: "string" },
    open_question: { type: "string" },
    what_we_dont_know: { type: "string" },
  },
});

export const DataAppendixSchema = Object.freeze({
  type: "object",
  required: ["raw_deltas", "signals_to_watch", "sources_methodology"],
  additionalProperties: true,
  properties: {
    raw_deltas: {
      type: "array",
      items: {
        type: "object",
        required: ["network", "metric", "delta"],
        additionalProperties: true,
        properties: {
          network: { type: "string" },
          metric: { type: "string" },
          previous: { type: "number" },
          current: { type: "number" },
          delta: { type: "number" },
          suppressed: { type: "boolean" },
          suppression_reason: { type: ["string", "null"] },
        },
      },
    },
    signals_to_watch: { type: "array", items: { type: "string" } },
    sources_methodology: { type: "array", items: { type: "string" } },
    feed_meta: { type: "object" },
  },
});

// Output shape for all reports.
export const ReportOutputSchema = Object.freeze({
  type: "object",
  required: ["grammar_version", "executive_summary", "cross_network_patterns", "network_watch", "data_appendix"],
  additionalProperties: false,
  properties: {
    grammar_version: { type: "string", enum: GrammarVersionEnum },
    executive_summary: ExecutiveSummarySchema,
    cross_network_patterns: { type: "array", items: PatternBlockSchema },
    network_watch: { type: "array", items: NetworkWatchItemSchema },
    data_appendix: DataAppendixSchema,
  },
});

// Daily/weekly/monthly schema aliases (same contract envelope).
export const DailyReportOutputSchema = ReportOutputSchema;
export const WeeklyReportOutputSchema = ReportOutputSchema;
export const MonthlyReportOutputSchema = ReportOutputSchema;

export const SemanticDiffSummarySchema = Object.freeze({
  type: "object",
  required: ["total_signals", "stable_pct", "reclassified_pct", "refined_pct", "top_unstable_categories"],
  additionalProperties: false,
  properties: {
    total_signals: { type: "number" },
    stable_pct: { type: "number" },
    reclassified_pct: { type: "number" },
    refined_pct: { type: "number" },
    top_unstable_categories: {
      type: "array",
      items: {
        type: "object",
        required: ["category", "count"],
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          count: { type: "number" },
        },
      },
    },
  },
});

export const SemanticDiffOutputSchema = Object.freeze({
  type: "object",
  required: ["grammar_version", "records", "summary"],
  additionalProperties: false,
  properties: {
    grammar_version: { type: "string", enum: GrammarVersionEnum },
    records: { type: "array", items: InterpretedSignalRowSchema },
    summary: SemanticDiffSummarySchema,
  },
});

export const SignalExecutionSchema = Object.freeze({
  type: "object",
  required: ["contract_version", "input", "output"],
  additionalProperties: false,
  properties: {
    contract_version: { type: "string" },
    input: ExecutionFeedSchema,
    output: {
      anyOf: [DailyReportOutputSchema, WeeklyReportOutputSchema, MonthlyReportOutputSchema, SemanticDiffOutputSchema],
    },
  },
});

// ---------------------------------------------------------------------------
// Interface descriptors (documentation-first, structure only)
// ---------------------------------------------------------------------------

export const Interfaces = Object.freeze({
  SignalLike: SignalLikeSchema,
  FeedNetwork: FeedNetworkSchema,
  ExecutionFeed: ExecutionFeedSchema,
  ProcessedSignal: ProcessedSignalSchema,
  ProcessedPattern: ProcessedPatternSchema,
  ExecutionEngineOutput: ExecutionEngineOutputSchema,
  InterpretedSignalRow: InterpretedSignalRowSchema,
  ExecutiveSummary: ExecutiveSummarySchema,
  PatternBlock: PatternBlockSchema,
  NetworkWatchItem: NetworkWatchItemSchema,
  DataAppendix: DataAppendixSchema,
  ReportOutput: ReportOutputSchema,
  DailyReportOutput: DailyReportOutputSchema,
  WeeklyReportOutput: WeeklyReportOutputSchema,
  MonthlyReportOutput: MonthlyReportOutputSchema,
  SemanticDiffOutput: SemanticDiffOutputSchema,
  SignalExecution: SignalExecutionSchema,
});
