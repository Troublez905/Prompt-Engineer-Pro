const promptTypes = {
  assistant: {
    label: "Assistant Prompt",
    angle: "clear instruction following with structured, dependable outputs",
    outputShape: "response sections, bullets, and explicit acceptance criteria",
    priorities: ["clarity", "specificity", "outputControl"],
  },
  marketing: {
    label: "Marketing Prompt",
    angle: "persuasive messaging, audience awareness, and campaign clarity",
    outputShape: "headline, message pillars, call to action, and variants",
    priorities: ["specificity", "creativity", "outputControl"],
  },
  coding: {
    label: "Coding Prompt",
    angle: "implementation detail, constraints, verification, and edge cases",
    outputShape: "solution plan, code expectations, tests, and failure modes",
    priorities: ["specificity", "outputControl", "reuse"],
  },
  research: {
    label: "Research Prompt",
    angle: "source quality, synthesis depth, and balanced reasoning",
    outputShape: "research questions, method, evidence table, and summary",
    priorities: ["clarity", "specificity", "reuse"],
  },
  sales: {
    label: "Sales Prompt",
    angle: "objection handling, qualification, and conversion momentum",
    outputShape: "buyer context, discovery script, positioning, and next steps",
    priorities: ["specificity", "creativity", "reuse"],
  },
  education: {
    label: "Education Prompt",
    angle: "stepwise explanation, adaptation to level, and comprehension checks",
    outputShape: "lesson framing, examples, exercises, and recap",
    priorities: ["clarity", "outputControl", "reuse"],
  },
};

const modelStyles = {
  strategist: {
    label: "GPT Strategist",
    persona: "a strategy-minded assistant that frames tradeoffs and sequencing",
    tuning: [
      "Require explicit sequencing, milestones, and decision checkpoints.",
      "Ask for options with tradeoffs when the problem could be solved in more than one way.",
      "Bias toward strategic framing, prioritization, and decision support.",
    ],
    boosts: { clarity: 4, specificity: 2, reuse: 2, outputControl: 3, creativity: 0 },
  },
  builder: {
    label: "GPT Builder",
    persona: "a practical maker that optimizes for execution-ready output",
    tuning: [
      "Bias toward step-by-step deliverables that can be used immediately.",
      "Ask for concrete implementation details, constraints, and acceptance criteria.",
      "Prefer operational language over abstract framing.",
    ],
    boosts: { clarity: 2, specificity: 4, reuse: 3, outputControl: 4, creativity: 0 },
  },
  analyst: {
    label: "GPT Analyst",
    persona: "an evidence-first analyst that clarifies assumptions and metrics",
    tuning: [
      "Call for assumptions, evaluation criteria, and measurable outputs.",
      "Prefer evidence quality, analytical structure, and explicit reasoning steps.",
      "Encourage comparisons, metrics, and confidence-aware framing.",
    ],
    boosts: { clarity: 3, specificity: 4, reuse: 1, outputControl: 2, creativity: 0 },
  },
  creative: {
    label: "GPT Creative",
    persona: "an imaginative collaborator that increases originality and range",
    tuning: [
      "Increase ideation range while still preserving a usable output scaffold.",
      "Encourage stylistic variation, stronger hooks, and fresher framing.",
      "Keep the prompt inventive without becoming vague.",
    ],
    boosts: { clarity: 0, specificity: 1, reuse: 1, outputControl: 0, creativity: 5 },
  },
  operator: {
    label: "GPT Operator",
    persona: "an operations-focused assistant that reduces ambiguity and rework",
    tuning: [
      "Emphasize consistency, handoff quality, and low-ambiguity instructions.",
      "Ask for explicit formatting, guardrails, and execution checks.",
      "Bias toward repeatable prompts that teams can reuse safely.",
    ],
    boosts: { clarity: 4, specificity: 3, reuse: 4, outputControl: 4, creativity: -1 },
  },
};

const styleProfiles = {
  Precision: {
    summary: "tightens instructions and trims ambiguity",
    tuning: ["Remove vague wording and sharpen what success looks like."],
    boosts: { clarity: 6, specificity: 4, reuse: 1, outputControl: 3, creativity: -1 },
  },
  Expansion: {
    summary: "adds more context, framing, and expected outputs",
    tuning: ["Add richer context and more complete output expectations."],
    boosts: { clarity: 2, specificity: 3, reuse: 2, outputControl: 2, creativity: 1 },
  },
  Comparative: {
    summary: "asks for options and comparison criteria",
    tuning: ["Request multiple options and clear comparison criteria."],
    boosts: { clarity: 2, specificity: 3, reuse: 2, outputControl: 1, creativity: 1 },
  },
  "High-Constraint": {
    summary: "locks in constraints to reduce off-target answers",
    tuning: ["Constrain tone, format, and boundaries to reduce variance."],
    boosts: { clarity: 3, specificity: 5, reuse: 2, outputControl: 5, creativity: -2 },
  },
  "Rapid-Use": {
    summary: "keeps the prompt fast to reuse in production",
    tuning: ["Keep the prompt compact and immediately reusable."],
    boosts: { clarity: 3, specificity: 1, reuse: 5, outputControl: 2, creativity: -1 },
  },
  "Expert Mode": {
    summary: "raises specificity for advanced users",
    tuning: ["Use more advanced task framing and tighter expectations."],
    boosts: { clarity: 1, specificity: 5, reuse: 1, outputControl: 3, creativity: 0 },
  },
  "Rewrite Coach": {
    summary: "helps the user evolve weak drafts into stronger versions",
    tuning: ["Focus on diagnosing and improving weak prompt construction."],
    boosts: { clarity: 4, specificity: 3, reuse: 3, outputControl: 2, creativity: 0 },
  },
  "Creative Swing": {
    summary: "increases originality while keeping structure intact",
    tuning: ["Push for fresher language and more inventive framing."],
    boosts: { clarity: -1, specificity: 1, reuse: 0, outputControl: 0, creativity: 6 },
  },
  "Executive Summary": {
    summary: "compresses the ask into a concise, leadership-ready frame",
    tuning: ["Condense the prompt into a high-signal, decision-ready structure."],
    boosts: { clarity: 5, specificity: 2, reuse: 3, outputControl: 1, creativity: -1 },
  },
  Evaluator: {
    summary: "adds rubric thinking so outputs can be judged and improved",
    tuning: ["Include evaluation criteria and improvement loops."],
    boosts: { clarity: 2, specificity: 3, reuse: 4, outputControl: 4, creativity: 0 },
  },
};

const countToStyles = {
  3: ["Precision", "Expansion", "Comparative"],
  5: ["Precision", "Expansion", "Comparative", "High-Constraint", "Rapid-Use"],
  7: [
    "Precision",
    "Expansion",
    "Comparative",
    "High-Constraint",
    "Rapid-Use",
    "Expert Mode",
    "Rewrite Coach",
  ],
  10: [
    "Precision",
    "Expansion",
    "Comparative",
    "High-Constraint",
    "Rapid-Use",
    "Expert Mode",
    "Rewrite Coach",
    "Creative Swing",
    "Executive Summary",
    "Evaluator",
  ],
};

const scoreCategories = [
  { key: "clarity", label: "Clarity" },
  { key: "specificity", label: "Specificity" },
  { key: "reuse", label: "Reuse" },
  { key: "outputControl", label: "Output control" },
  { key: "creativity", label: "Originality" },
];

export const STARTER_IDEAS = [
  "Write a prompt that helps me create a sales outreach sequence for B2B software buyers.",
  "Turn my rough coding task into a precise implementation prompt with testing instructions.",
  "Build a research prompt for comparing competitors, pricing, and positioning.",
];

export const DEFAULT_FORM = {
  promptType: "assistant",
  targetModel: "builder",
  optionCount: 5,
  searchDepth: 7,
  iterations: 3,
  idea: "",
  constraints: "",
  references: "",
  rewriteBase: null,
};

function buildDepthLine(searchDepth, iterations) {
  const researchMode =
    searchDepth < 4
      ? "Keep research lightweight and use only essential context."
      : searchDepth < 8
        ? "Explore multiple useful angles before drafting the final answer."
        : "Search deeply, compare patterns, and prioritize highly reusable prompt structures.";

  const iterationMode =
    iterations < 2
      ? "Produce a clean first-pass answer."
      : iterations < 4
        ? "Self-improve the prompt through multiple tightening passes."
        : "Run several refinement passes and explicitly sharpen quality, scope, and output format.";

  return `${researchMode} ${iterationMode}`;
}

function buildModelSpecificTuning(promptType, targetModel, styleName) {
  const typeConfig = promptTypes[promptType];
  const modelConfig = modelStyles[targetModel];
  const styleConfig = styleProfiles[styleName];
  const typePriorityLine = `Prioritize ${typeConfig.priorities.join(", ")} over generic output.`;

  return [
    ...modelConfig.tuning,
    ...styleConfig.tuning,
    typePriorityLine,
  ];
}

function buildVariantPrompt({
  idea,
  promptType,
  targetModel,
  styleName,
  searchDepth,
  iterations,
  constraints,
  references,
  rewriteBase,
}) {
  const typeConfig = promptTypes[promptType];
  const modelConfig = modelStyles[targetModel];
  const refinementBlock = buildDepthLine(searchDepth, iterations);
  const modelSpecificTuning = buildModelSpecificTuning(promptType, targetModel, styleName);
  const referenceBlock = references
    ? `Reference examples or inspiration:\n${references}`
    : "Reference examples or inspiration:\nUse established prompt patterns when they strengthen clarity and outcomes.";
  const constraintBlock = constraints
    ? `Constraints:\n${constraints}`
    : "Constraints:\nKeep the result practical, specific, and easy to reuse.";
  const rewriteBlock = rewriteBase?.text
    ? `Prompt to improve:\n${rewriteBase.text}\n\nUpgrade the selected prompt while preserving its core intent and making it more complete.`
    : `User idea:\n${idea}`;

  return `You are ${modelConfig.persona}.

Task:
Create a ${styleName.toLowerCase()} ${typeConfig.label.toLowerCase()} from the user's rough direction.

Goal:
Transform the input into a professional prompt optimized for ${typeConfig.angle}.

Input:
${rewriteBlock}

Generation rules:
- Strengthen weak wording into crisp instructions.
- Ask the model to think through the task in a disciplined way without exposing internal reasoning.
- Optimize for ${typeConfig.outputShape}.
- ${refinementBlock}
- Make the prompt directly usable with minimal editing.

Model-specific tuning:
${modelSpecificTuning.map((line) => `- ${line}`).join("\n")}

${constraintBlock}

${referenceBlock}

Return format:
1. Prompt title
2. Best-use case
3. Final prompt
4. Why this version is strong
5. Optional tweak ideas`;
}

function clampScore(value) {
  return Math.max(70, Math.min(99, value));
}

function computeCategoryScores({ styleName, promptType, targetModel, searchDepth, iterations, hasConstraints, hasReferences, isRewrite }) {
  const typeConfig = promptTypes[promptType];
  const modelBoosts = modelStyles[targetModel].boosts;
  const styleBoosts = styleProfiles[styleName].boosts;

  const base = {
    clarity: 74,
    specificity: 74,
    reuse: 72,
    outputControl: 73,
    creativity: 70,
  };

  const categoryScores = {};
  for (const category of scoreCategories) {
    const key = category.key;
    let score = base[key] + modelBoosts[key] + styleBoosts[key];
    score += Math.round(searchDepth / 2);
    score += iterations;
    if (hasConstraints && (key === "specificity" || key === "outputControl")) score += 4;
    if (hasReferences && (key === "reuse" || key === "clarity")) score += 3;
    if (isRewrite && (key === "clarity" || key === "specificity")) score += 2;
    if (typeConfig.priorities.includes(key)) score += 4;
    categoryScores[key] = clampScore(score);
  }

  return categoryScores;
}

function buildEvaluation(styleName, categoryScores, searchDepth, iterations) {
  const sorted = [...scoreCategories]
    .map((category) => ({ ...category, score: categoryScores[category.key] }))
    .sort((left, right) => right.score - left.score);

  const strongest = sorted.slice(0, 2).map((item) => item.label.toLowerCase());
  const lowest = sorted[sorted.length - 1];
  const reasons = [
    `${styleProfiles[styleName].summary}.`,
    `Strongest on ${strongest.join(" and ")}.`,
  ];

  if (searchDepth >= 8) reasons.push("Depth setting improves pattern coverage.");
  if (iterations >= 4) reasons.push("Extra refinement rounds improve final sharpness.");
  if (lowest.score <= 76) reasons.push(`${lowest.label} is the main tradeoff in this variant.`);

  return {
    rationale: reasons.join(" "),
    strongest,
    weakest: lowest.label,
  };
}

function buildWeightedTotal(categoryScores) {
  return Math.round(
    categoryScores.clarity * 0.24 +
      categoryScores.specificity * 0.24 +
      categoryScores.reuse * 0.18 +
      categoryScores.outputControl * 0.22 +
      categoryScores.creativity * 0.12,
  );
}

function buildVariantMetadata(config, styleName) {
  const categoryScores = computeCategoryScores({
    styleName,
    promptType: config.promptType,
    targetModel: config.targetModel,
    searchDepth: config.searchDepth,
    iterations: config.iterations,
    hasConstraints: Boolean(config.constraints),
    hasReferences: Boolean(config.references),
    isRewrite: Boolean(config.rewriteBase?.text),
  });
  const evaluation = buildEvaluation(styleName, categoryScores, config.searchDepth, config.iterations);
  const score = buildWeightedTotal(categoryScores);
  const tuningNotes = buildModelSpecificTuning(config.promptType, config.targetModel, styleName);

  return {
    score,
    categoryScores: scoreCategories.map((category) => ({
      key: category.key,
      label: category.label,
      score: categoryScores[category.key],
    })),
    evaluation,
    tuningNotes,
  };
}

export function getPromptTypeOptions() {
  return Object.entries(promptTypes).map(([value, config]) => ({
    value,
    label: config.label,
  }));
}

export function getModelOptions() {
  return Object.entries(modelStyles).map(([value, config]) => ({
    value,
    label: config.label,
  }));
}

export function normalizePromptConfig(input = {}) {
  const promptType = Object.hasOwn(promptTypes, input.promptType)
    ? input.promptType
    : DEFAULT_FORM.promptType;
  const targetModel = Object.hasOwn(modelStyles, input.targetModel)
    ? input.targetModel
    : DEFAULT_FORM.targetModel;
  const optionCount = [3, 5, 7, 10].includes(Number(input.optionCount))
    ? Number(input.optionCount)
    : DEFAULT_FORM.optionCount;
  const searchDepth = Math.min(10, Math.max(1, Number(input.searchDepth) || DEFAULT_FORM.searchDepth));
  const iterations = Math.min(5, Math.max(1, Number(input.iterations) || DEFAULT_FORM.iterations));

  return {
    promptType,
    targetModel,
    optionCount,
    searchDepth,
    iterations,
    idea: `${input.idea ?? ""}`.trim(),
    constraints: `${input.constraints ?? ""}`.trim(),
    references: `${input.references ?? ""}`.trim(),
    rewriteBase:
      input.rewriteBase && typeof input.rewriteBase === "object"
        ? {
            title: `${input.rewriteBase.title ?? ""}`.trim(),
            text: `${input.rewriteBase.text ?? ""}`.trim(),
          }
        : null,
  };
}

export function generatePromptVariants(config) {
  const styles = countToStyles[config.optionCount] ?? countToStyles[5];

  return styles.map((styleName, index) => {
    const title = `${styleName} ${promptTypes[config.promptType].label}`;
    const metadata = buildVariantMetadata(config, styleName);
    return {
      id: `${styleName}-${index}`,
      rank: index + 1,
      styleName,
      title,
      score: metadata.score,
      summary: metadata.evaluation.rationale,
      evaluatorRationale: metadata.evaluation.rationale,
      categoryScores: metadata.categoryScores,
      strongestCategories: metadata.evaluation.strongest,
      weakestCategory: metadata.evaluation.weakest,
      tuningNotes: metadata.tuningNotes,
      text: buildVariantPrompt({
        ...config,
        styleName,
      }),
    };
  });
}

export function buildPromptWorkspaceResult(input = {}) {
  const formSnapshot = normalizePromptConfig(input);
  const variants =
    formSnapshot.idea || formSnapshot.rewriteBase?.text
      ? generatePromptVariants(formSnapshot)
      : [];

  return {
    formSnapshot,
    variants,
    summary: {
      optionCount: variants.length,
      promptTypeLabel: promptTypes[formSnapshot.promptType].label,
      targetModelLabel: modelStyles[formSnapshot.targetModel].label,
      hasIdea: Boolean(formSnapshot.idea),
      mode: formSnapshot.rewriteBase?.text ? "rewrite" : "generate",
    },
    generatedAt: new Date().toISOString(),
  };
}
