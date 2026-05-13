export interface ReportAbTestConfig {
  method: "bayesian";
  armDimension: string | null;
  controlValue: any;
  variantValue: any;
  trialsMetric: string | null;
  successMetric: string | null;
  targetProbability: number;
  step: number;
  draws: number;
  maxExtraTrials: number;
}

export interface ReportAbTestArmSummary {
  value: any;
  matchedRows: number;
  trials: number;
  successes: number;
  rate: number;
}

export interface ReportAbTestResult {
  method: "bayesian";
  control: ReportAbTestArmSummary;
  variant: ReportAbTestArmSummary;
  probabilityVariantBetter: number;
  credibleIntervalLower: number;
  credibleIntervalUpper: number;
  observedAbsoluteLift: number;
  observedRelativeLift: number | null;
  additionalTrialsPerArm: number | null;
  additionalTrialsProbability: number | null;
  additionalTrialsReason: string | null;
  rowsConsidered: number;
  rowsMatched: number;
  skippedRollupRows: number;
  skippedInvalidRows: number;
  draws: number;
  targetProbability: number;
}

const DEFAULT_TARGET_PROBABILITY = 0.95;
const DEFAULT_STEP = 500;
const DEFAULT_DRAWS = 20000;
const DEFAULT_MAX_EXTRA_TRIALS = 1_000_000;

export function defaultReportAbTestConfig(): ReportAbTestConfig {
  return {
    method: "bayesian",
    armDimension: null,
    controlValue: null,
    variantValue: null,
    trialsMetric: null,
    successMetric: null,
    targetProbability: DEFAULT_TARGET_PROBABILITY,
    step: DEFAULT_STEP,
    draws: DEFAULT_DRAWS,
    maxExtraTrials: DEFAULT_MAX_EXTRA_TRIALS,
  };
}

export function normalizeReportAbTestConfig(rawConfig: any = null): ReportAbTestConfig {
  const defaults = defaultReportAbTestConfig();
  const config = Object.assign({}, defaults, rawConfig || {});

  return {
    method: "bayesian",
    armDimension: config.armDimension || null,
    controlValue: readStoredValue(rawConfig, "controlValue"),
    variantValue: readStoredValue(rawConfig, "variantValue"),
    trialsMetric: config.trialsMetric || null,
    successMetric: config.successMetric || null,
    targetProbability: clampProbability(config.targetProbability, defaults.targetProbability),
    step: coercePositiveInteger(config.step, defaults.step),
    draws: Math.max(1000, coercePositiveInteger(config.draws, defaults.draws)),
    maxExtraTrials: Math.max(
      coercePositiveInteger(config.step, defaults.step),
      coercePositiveInteger(config.maxExtraTrials, defaults.maxExtraTrials)
    ),
  };
}

export function serializeReportAbTestConfig(config: ReportAbTestConfig | null): ReportAbTestConfig | null {
  const normalized = normalizeReportAbTestConfig(config || {});
  const hasSelections =
    !!normalized.armDimension ||
    !!normalized.trialsMetric ||
    !!normalized.successMetric ||
    normalized.controlValue !== null ||
    normalized.variantValue !== null;

  if (!hasSelections) {
    return null;
  }

  return normalized;
}

export function analyzeReportAbTestRows(
  rows: any[],
  rawConfig: ReportAbTestConfig,
  displayNameMap: Record<string, string> = {},
  rollupMarker: any = null
): ReportAbTestResult {
  const config = normalizeReportAbTestConfig(rawConfig);
  validateCoreConfig(config);

  const rowsList = Array.isArray(rows) ? rows : [];
  if (!rowsList.length) {
    throw new Error("No visible report rows found. Run the report first.");
  }

  const armColumn = displayNameMap[config.armDimension!] || config.armDimension!;
  const trialsColumn = displayNameMap[config.trialsMetric!] || config.trialsMetric!;
  const successColumn = displayNameMap[config.successMetric!] || config.successMetric!;

  const control = {
    value: config.controlValue,
    matchedRows: 0,
    trials: 0,
    successes: 0,
  };
  const variant = {
    value: config.variantValue,
    matchedRows: 0,
    trials: 0,
    successes: 0,
  };

  let skippedRollupRows = 0;
  let skippedInvalidRows = 0;

  for (const row of rowsList) {
    if (!row) {
      continue;
    }
    if (row._isRollup) {
      skippedRollupRows += 1;
      continue;
    }

    const armValue = row[armColumn];
    const isControlRow = valuesEqual(armValue, config.controlValue);
    const isVariantRow = valuesEqual(armValue, config.variantValue);

    if (!isControlRow && !isVariantRow) {
      continue;
    }

    if (armValue === rollupMarker) {
      skippedRollupRows += 1;
      continue;
    }

    const trials = toFiniteNumber(row[trialsColumn]);
    const successes = toFiniteNumber(row[successColumn]);
    if (trials === null || successes === null) {
      skippedInvalidRows += 1;
      continue;
    }

    if (isControlRow) {
      control.matchedRows += 1;
      control.trials += trials;
      control.successes += successes;
    }
    if (isVariantRow) {
      variant.matchedRows += 1;
      variant.trials += trials;
      variant.successes += successes;
    }
  }

  validateArmSummary(control, "control");
  validateArmSummary(variant, "variant");

  const posterior = summarizePosterior(
    control.successes,
    control.trials,
    variant.successes,
    variant.trials,
    config.draws
  );
  const additionalTrials = estimateAdditionalTrialsNeeded(
    control.successes,
    control.trials,
    variant.successes,
    variant.trials,
    config.targetProbability,
    config.step,
    config.draws,
    config.maxExtraTrials
  );

  const controlRate = control.successes / control.trials;
  const variantRate = variant.successes / variant.trials;
  const observedAbsoluteLift = variantRate - controlRate;
  const observedRelativeLift = controlRate === 0 ? null : observedAbsoluteLift / controlRate;

  return {
    method: "bayesian",
    control: {
      value: control.value,
      matchedRows: control.matchedRows,
      trials: control.trials,
      successes: control.successes,
      rate: controlRate,
    },
    variant: {
      value: variant.value,
      matchedRows: variant.matchedRows,
      trials: variant.trials,
      successes: variant.successes,
      rate: variantRate,
    },
    probabilityVariantBetter: posterior.probabilityVariantBetter,
    credibleIntervalLower: posterior.credibleIntervalLower,
    credibleIntervalUpper: posterior.credibleIntervalUpper,
    observedAbsoluteLift,
    observedRelativeLift,
    additionalTrialsPerArm: additionalTrials.extraTrialsPerArm,
    additionalTrialsProbability: additionalTrials.finalProbability,
    additionalTrialsReason: additionalTrials.reason,
    rowsConsidered: rowsList.length,
    rowsMatched: control.matchedRows + variant.matchedRows,
    skippedRollupRows,
    skippedInvalidRows,
    draws: config.draws,
    targetProbability: config.targetProbability,
  };
}

function readStoredValue(rawConfig: any, field: string) {
  if (!rawConfig || !Object.prototype.hasOwnProperty.call(rawConfig, field)) {
    return null;
  }
  return rawConfig[field];
}

function clampProbability(value: any, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || num >= 1) {
    return fallback;
  }
  return num;
}

function coercePositiveInteger(value: any, fallback: number) {
  const num = Math.round(Number(value));
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return num;
}

function validateCoreConfig(config: ReportAbTestConfig) {
  if (!config.armDimension) {
    throw new Error("Choose the dimension that identifies the control and variant arms.");
  }
  if (config.controlValue === null || config.variantValue === null) {
    throw new Error("Choose both a control value and a variant value.");
  }
  if (valuesEqual(config.controlValue, config.variantValue)) {
    throw new Error("Control and variant values must be different.");
  }
  if (!config.trialsMetric || !config.successMetric) {
    throw new Error("Choose both a trials metric and a successes metric.");
  }
}

function validateArmSummary(arm, label: string) {
  if (!arm.matchedRows) {
    throw new Error(`No visible rows matched the selected ${label} value.`);
  }
  if (arm.trials <= 0) {
    throw new Error(`The selected trials metric produced zero trials for the ${label} arm.`);
  }
  if (arm.successes < 0) {
    throw new Error(`The selected successes metric produced negative successes for the ${label} arm.`);
  }
  if (arm.successes > arm.trials) {
    throw new Error(`The selected successes metric exceeds trials for the ${label} arm. Pick compatible metrics.`);
  }
}

function toFiniteNumber(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function valuesEqual(left: any, right: any) {
  return left === right;
}

function summarizePosterior(successA: number, trialsA: number, successB: number, trialsB: number, draws: number) {
  const alphaA = successA + 1;
  const betaA = trialsA - successA + 1;
  const alphaB = successB + 1;
  const betaB = trialsB - successB + 1;
  const rng = createSeededRandom(hashString(JSON.stringify(["posterior", alphaA, betaA, alphaB, betaB, draws])));
  const diffs: number[] = [];
  let variantWins = 0;

  for (let i = 0; i < draws; i++) {
    const controlRate = sampleBeta(alphaA, betaA, rng);
    const variantRate = sampleBeta(alphaB, betaB, rng);
    if (variantRate > controlRate) {
      variantWins += 1;
    }
    diffs.push(variantRate - controlRate);
  }

  diffs.sort((left, right) => left - right);

  return {
    probabilityVariantBetter: variantWins / draws,
    credibleIntervalLower: quantile(diffs, 0.025),
    credibleIntervalUpper: quantile(diffs, 0.975),
  };
}

function estimateAdditionalTrialsNeeded(
  successA: number,
  trialsA: number,
  successB: number,
  trialsB: number,
  targetProbability: number,
  step: number,
  draws: number,
  maxExtraTrials: number
) {
  const currentProbability = estimateProbabilityVariantBetter(successA, trialsA, successB, trialsB, draws);
  if (currentProbability >= targetProbability) {
    return {
      extraTrialsPerArm: 0,
      finalProbability: currentProbability,
      reason: null,
    };
  }

  const controlRate = successA / trialsA;
  const variantRate = successB / trialsB;
  if (variantRate <= controlRate) {
    return {
      extraTrialsPerArm: null,
      finalProbability: null,
      reason: "The variant is not currently outperforming control, so no additional-trials estimate is shown.",
    };
  }

  const maxSteps = Math.max(1, Math.floor(maxExtraTrials / step));
  const probabilityCache = new Map<number, number>([[0, currentProbability]]);

  const probabilityForSteps = (steps: number) => {
    if (probabilityCache.has(steps)) {
      return probabilityCache.get(steps)!;
    }

    const extraTrials = steps * step;
    const projectedSuccessA = successA + Math.round(controlRate * extraTrials);
    const projectedSuccessB = successB + Math.round(variantRate * extraTrials);
    const probability = estimateProbabilityVariantBetter(
      projectedSuccessA,
      trialsA + extraTrials,
      projectedSuccessB,
      trialsB + extraTrials,
      draws
    );
    probabilityCache.set(steps, probability);
    return probability;
  };

  const maxProbability = probabilityForSteps(maxSteps);
  if (maxProbability < targetProbability) {
    return {
      extraTrialsPerArm: null,
      finalProbability: maxProbability,
      reason: `Did not reach ${(targetProbability * 100).toFixed(1)}% within the search limit.`,
    };
  }

  let low = 0;
  let high = maxSteps;
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (probabilityForSteps(mid) >= targetProbability) {
      high = mid;
    } else {
      low = mid;
    }
  }

  let finalSteps = high;
  let finalProbability = probabilityForSteps(finalSteps);
  while (finalSteps > 0 && probabilityForSteps(finalSteps - 1) >= targetProbability) {
    finalSteps -= 1;
    finalProbability = probabilityForSteps(finalSteps);
  }
  while (finalSteps < maxSteps && finalProbability < targetProbability) {
    finalSteps += 1;
    finalProbability = probabilityForSteps(finalSteps);
  }

  return {
    extraTrialsPerArm: finalSteps * step,
    finalProbability,
    reason: null,
  };
}

function estimateProbabilityVariantBetter(
  successA: number,
  trialsA: number,
  successB: number,
  trialsB: number,
  draws: number
) {
  const alphaA = successA + 1;
  const betaA = trialsA - successA + 1;
  const alphaB = successB + 1;
  const betaB = trialsB - successB + 1;
  const rng = createSeededRandom(hashString(JSON.stringify(["probability", alphaA, betaA, alphaB, betaB, draws])));
  let variantWins = 0;

  for (let i = 0; i < draws; i++) {
    const controlRate = sampleBeta(alphaA, betaA, rng);
    const variantRate = sampleBeta(alphaB, betaB, rng);
    if (variantRate > controlRate) {
      variantWins += 1;
    }
  }

  return variantWins / draws;
}

function quantile(values: number[], probability: number) {
  if (!values.length) {
    return 0;
  }
  const index = Math.max(0, Math.min(values.length - 1, Math.floor((values.length - 1) * probability)));
  return values[index];
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleBeta(alpha: number, beta: number, rng: () => number) {
  const sampleX = sampleGamma(alpha, rng);
  const sampleY = sampleGamma(beta, rng);
  return sampleX / (sampleX + sampleY);
}

function sampleGamma(shape: number, rng: () => number) {
  if (shape <= 0) {
    throw new Error("Gamma shape must be positive.");
  }

  if (shape < 1) {
    return sampleGamma(shape + 1, rng) * Math.pow(sampleUniform(rng), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let normal = sampleStandardNormal(rng);
    let candidate = 1 + c * normal;
    if (candidate <= 0) {
      continue;
    }
    candidate = candidate * candidate * candidate;
    const uniform = sampleUniform(rng);

    if (uniform < 1 - 0.0331 * Math.pow(normal, 4)) {
      return d * candidate;
    }
    if (Math.log(uniform) < 0.5 * normal * normal + d * (1 - candidate + Math.log(candidate))) {
      return d * candidate;
    }
  }
}

function sampleStandardNormal(rng: () => number) {
  let first = sampleUniform(rng);
  let second = sampleUniform(rng);
  while (first <= Number.EPSILON) {
    first = sampleUniform(rng);
  }
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function sampleUniform(rng: () => number) {
  const value = rng();
  if (value === 0) {
    return Number.EPSILON;
  }
  if (value === 1) {
    return 1 - Number.EPSILON;
  }
  return value;
}
