import React, { useEffect, useMemo, useState } from "react";
import {
  buildPromptWorkspaceResult,
  DEFAULT_FORM,
  getModelOptions,
  getPromptTypeOptions,
  STARTER_IDEAS,
} from "../../shared/promptEngine";

const promptTypeOptions = getPromptTypeOptions();
const modelOptions = getModelOptions();
const countOptions = [3, 5, 7, 10];
const scoreSortOptions = [
  { value: "overall", label: "Overall score" },
  { value: "clarity", label: "Clarity" },
  { value: "specificity", label: "Specificity" },
  { value: "reuse", label: "Reuse" },
  { value: "outputControl", label: "Output control" },
  { value: "creativity", label: "Originality" },
];

function OptionGrid({ options, value, onChange, type = "default" }) {
  return (
    <div className={`option-grid option-grid-${type}`}>
      {options.map((option) => (
        <button
          key={option.value}
          className={`option-card ${option.value === value ? "is-active" : ""}`}
          type="button"
          onClick={() => onChange(option.value)}
        >
          <span className="option-title">{option.label}</span>
          {"description" in option && option.description ? (
            <span className="option-description">{option.description}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {hint ? <span className="field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}

function MetricCard({ value, label }) {
  return (
    <div className="metric-card">
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

function DialCard({ label, value, hint, children }) {
  return (
    <div className="dial-card">
      <div className="dial-copy">
        <span className="field-label">{label}</span>
        <strong className="dial-value">{value}</strong>
        <span className="field-hint">{hint}</span>
      </div>
      {children}
    </div>
  );
}

function ScoreBars({ scores }) {
  return (
    <div className="score-bars">
      {scores.map((item) => (
        <div className="score-row" key={item.key}>
          <div className="score-row-top">
            <span>{item.label}</span>
            <strong>{item.score}</strong>
          </div>
          <div className="score-track">
            <span className="score-fill" style={{ width: `${item.score}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function readHostToolOutput() {
  if (typeof window === "undefined") return null;
  return window.openai?.toolOutput ?? null;
}

function getInitialWorkspace() {
  const hostOutput = readHostToolOutput();
  if (hostOutput?.formSnapshot) {
    return hostOutput;
  }
  return buildPromptWorkspaceResult(DEFAULT_FORM);
}

function getFocusedScore(variant, scoreFocus) {
  if (scoreFocus === "overall") return variant.score;
  return variant.categoryScores.find((item) => item.key === scoreFocus)?.score ?? variant.score;
}

export default function App() {
  const initialWorkspace = useMemo(() => getInitialWorkspace(), []);
  const [form, setForm] = useState(initialWorkspace.formSnapshot);
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selectedId, setSelectedId] = useState(initialWorkspace.variants[0]?.id ?? null);
  const [history, setHistory] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [scoreFocus, setScoreFocus] = useState("overall");

  const rankedVariants = useMemo(() => {
    return [...workspace.variants].sort((left, right) => {
      const diff = getFocusedScore(right, scoreFocus) - getFocusedScore(left, scoreFocus);
      if (diff !== 0) return diff;
      return right.score - left.score;
    });
  }, [workspace.variants, scoreFocus]);

  const selectedVariant =
    rankedVariants.find((item) => item.id === selectedId) ?? rankedVariants[0] ?? null;
  const statusLabel = workspace.variants.length
    ? `${workspace.variants.length} variants ready`
    : "Waiting for your brief";
  const scoreFocusLabel =
    scoreSortOptions.find((option) => option.value === scoreFocus)?.label ?? "Overall score";

  useEffect(() => {
    const nextOutput = readHostToolOutput();
    if (nextOutput?.formSnapshot) {
      setWorkspace(nextOutput);
      setForm(nextOutput.formSnapshot);
      setSelectedId(nextOutput.variants[0]?.id ?? null);
    }
  }, []);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function copyPrompt(variant) {
    try {
      await navigator.clipboard.writeText(variant.text);
      setCopiedId(variant.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Unable to copy prompt.");
    }
  }

  async function runTool(nextInput) {
    setIsBusy(true);
    setError("");
    try {
      let nextWorkspace;
      if (window.openai?.callTool) {
        const result = await window.openai.callTool("generate_prompts", nextInput);
        nextWorkspace = result?.structuredContent ?? buildPromptWorkspaceResult(nextInput);
      } else {
        nextWorkspace = buildPromptWorkspaceResult(nextInput);
      }

      setWorkspace(nextWorkspace);
      setForm(nextWorkspace.formSnapshot);
      setSelectedId(nextWorkspace.variants[0]?.id ?? null);
      setHistory((current) => [
        {
          id: `history-${Date.now()}`,
          idea: nextWorkspace.formSnapshot.idea || "Prompt rewrite",
          count: nextWorkspace.variants.length,
          promptType: nextWorkspace.formSnapshot.promptType,
        },
        ...current,
      ].slice(0, 6));

      if (window.openai?.setWidgetState) {
        window.openai.setWidgetState({
          modelContent: {
            lastIdea: nextWorkspace.formSnapshot.idea,
            selectedTitle: nextWorkspace.variants[0]?.title ?? "",
          },
          privateContent: {
            formSnapshot: nextWorkspace.formSnapshot,
          },
        });
      }
    } catch (toolError) {
      setError(toolError instanceof Error ? toolError.message : "Unable to generate prompts.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleGenerate(event) {
    event.preventDefault();
    runTool(form);
  }

  function handleRewriteFromSelected() {
    if (!selectedVariant) return;
    runTool({
      ...form,
      rewriteBase: {
        title: selectedVariant.title,
        text: selectedVariant.text,
      },
    });
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero">
        <div className="hero-copy">
          <div className="hero-topline">
            <p className="eyebrow">Prompt Engineering Workspace</p>
            <span className="hero-status">{statusLabel}</span>
          </div>
          <h1>Shape rough intent into production-ready prompts.</h1>
          <p className="hero-text">
            Build a reusable brief, tune how hard the engine searches and refines,
            then compare several prompt directions before committing to a rewrite.
          </p>
          <div className="metrics">
            <MetricCard value={`${form.optionCount}`} label="Prompt options" />
            <MetricCard value={`${form.searchDepth}/10`} label="Search depth" />
            <MetricCard value={`${form.iterations}x`} label="Refinement passes" />
          </div>
        </div>

        <aside className="hero-panel">
          <div className="hero-panel-header">
            <span className="pill">ChatGPT app</span>
            <span className="pill muted">{workspace.summary.mode === "rewrite" ? "Rewrite mode" : "Generate mode"}</span>
          </div>
          <div className="hero-stack">
            <div className="stack-card">
              <span className="stack-label">Current lens</span>
              <strong>{promptTypeOptions.find((option) => option.value === form.promptType)?.label}</strong>
            </div>
            <div className="stack-card">
              <span className="stack-label">Target GPT</span>
              <strong>{modelOptions.find((option) => option.value === form.targetModel)?.label}</strong>
            </div>
            <div className="stack-card">
              <span className="stack-label">Best next action</span>
              <strong>{selectedVariant ? "Rewrite from the selected winner" : "Seed an idea and generate variants"}</strong>
            </div>
            {selectedVariant ? (
              <>
                <div className="stack-card">
                  <span className="stack-label">Evaluator signal</span>
                  <strong>{selectedVariant.strongestCategories.join(" and ")} are leading this variant.</strong>
                </div>
                <div className="stack-card">
                  <span className="stack-label">Ranking focus</span>
                  <strong>{scoreFocusLabel}</strong>
                </div>
              </>
            ) : null}
          </div>
        </aside>
      </header>

      <main className="workspace workspace-grid">
        <section className="panel form-panel composer-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Composer</p>
              <h2>Design your prompt brief</h2>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={handleRewriteFromSelected}
              disabled={!selectedVariant || isBusy}
            >
              Rewrite from selected
            </button>
          </div>

          <div className="starter-row">
            {STARTER_IDEAS.map((starter) => (
              <button
                key={starter}
                className="starter-chip"
                type="button"
                onClick={() => updateField("idea", starter)}
              >
                {starter}
              </button>
            ))}
          </div>

          <form className="builder-form" onSubmit={handleGenerate}>
            <Field
              label="Prompt type"
              hint="Choose the style of prompt architecture you want the generator to optimize for."
            >
              <OptionGrid
                type="compact"
                options={[
                  { value: "assistant", label: "Assistant", description: "Structured general-purpose instructions" },
                  { value: "marketing", label: "Marketing", description: "Persuasion, audience, and CTA focus" },
                  { value: "coding", label: "Coding", description: "Implementation, tests, and edge cases" },
                  { value: "research", label: "Research", description: "Evidence gathering and synthesis" },
                  { value: "sales", label: "Sales", description: "Qualification and objection handling" },
                  { value: "education", label: "Education", description: "Teaching, examples, and exercises" },
                ]}
                value={form.promptType}
                onChange={(nextValue) => updateField("promptType", nextValue)}
              />
            </Field>

            <Field
              label="Target GPT style"
              hint="Aim the final prompt at the kind of assistant behavior you want back."
            >
              <OptionGrid
                options={[
                  { value: "strategist", label: "Strategist", description: "Tradeoffs and sequencing" },
                  { value: "builder", label: "Builder", description: "Execution-ready output" },
                  { value: "analyst", label: "Analyst", description: "Metrics and assumptions" },
                  { value: "creative", label: "Creative", description: "Range and originality" },
                  { value: "operator", label: "Operator", description: "Clarity and process control" },
                ]}
                value={form.targetModel}
                onChange={(nextValue) => updateField("targetModel", nextValue)}
              />
            </Field>

            <Field
              label="Core idea"
              hint="Give the app a rough goal. It will strengthen the wording and structure."
            >
              <textarea
                rows="7"
                placeholder="Example: I need a prompt that helps me turn a vague product idea into a launch-ready messaging brief."
                value={form.idea}
                onChange={(event) => updateField("idea", event.target.value)}
              />
            </Field>

            <div className="grid tuning-grid">
              <DialCard
                label="Prompt count"
                value={`${form.optionCount} outputs`}
                hint="How many directions should the app generate?"
              >
                <div className="segmented-control">
                  {countOptions.map((count) => (
                    <button
                      key={count}
                      className={count === form.optionCount ? "is-active" : ""}
                      type="button"
                      onClick={() => updateField("optionCount", count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </DialCard>

              <DialCard
                label="Search depth"
                value={`${form.searchDepth}/10`}
                hint="How widely should it explore patterns before settling?"
              >
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={form.searchDepth}
                  onChange={(event) => updateField("searchDepth", Number(event.target.value))}
                />
              </DialCard>

              <DialCard
                label="Iteration rounds"
                value={`${form.iterations} passes`}
                hint="How aggressively should it tighten the prompt?"
              >
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={form.iterations}
                  onChange={(event) => updateField("iterations", Number(event.target.value))}
                />
              </DialCard>
            </div>

            <div className="grid two-up">
              <Field label="Constraints">
                <textarea
                  rows="4"
                  placeholder="Keep it concise, business-ready, and no jargon."
                  value={form.constraints}
                  onChange={(event) => updateField("constraints", event.target.value)}
                />
              </Field>

              <Field
                label="References and examples"
                hint="Paste benchmarks, inspiration, or snippets you want the generator to echo or improve."
              >
                <textarea
                  rows="4"
                  placeholder="Paste strong examples, style references, or benchmark prompts."
                  value={form.references}
                  onChange={(event) => updateField("references", event.target.value)}
                />
              </Field>
            </div>

            <button className="primary-button" type="submit" disabled={isBusy}>
              {isBusy ? "Generating..." : "Generate engineered prompts"}
            </button>
          </form>

          {error ? <p className="status error">{error}</p> : null}
        </section>

        <section className="panel results-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Output Stage</p>
              <h2>Choose the strongest prompt path</h2>
            </div>
            <div className="results-actions">
              {workspace.variants.length ? (
                <label className="sort-control">
                  <span>Rank by</span>
                  <select value={scoreFocus} onChange={(event) => setScoreFocus(event.target.value)}>
                    {scoreSortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {selectedVariant ? <span className="hero-status subtle">{selectedVariant.score}/100 score</span> : null}
            </div>
          </div>

          {workspace.variants.length ? (
            <div className="results-layout">
              <div className="variant-list">
                {rankedVariants.map((variant, index) => (
                  <button
                    key={variant.id}
                    className={`variant-card ${variant.id === selectedVariant?.id ? "is-selected" : ""}`}
                    type="button"
                    onClick={() => setSelectedId(variant.id)}
                  >
                    <div className="variant-topline">
                      <span>#{index + 1} {variant.styleName}</span>
                      <span>{getFocusedScore(variant, scoreFocus)}/100</span>
                    </div>
                    <h3>{variant.title}</h3>
                    <p>{variant.evaluatorRationale}</p>
                    <div className="variant-chip-row">
                      <span className="mini-chip emphasis">Focus: {scoreFocusLabel}</span>
                      {variant.strongestCategories.map((category) => (
                        <span className="mini-chip" key={`${variant.id}-${category}`}>
                          {category}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <article className="selected-variant">
                <div className="selected-header">
                  <div>
                    <p className="panel-kicker">Selected Prompt</p>
                    <h3>{selectedVariant?.title}</h3>
                    <div className="selected-meta">
                      <span className="pill muted">{workspace.summary.promptTypeLabel}</span>
                      <span className="pill muted">{workspace.summary.targetModelLabel}</span>
                      <span className="pill muted">Ranked by {scoreFocusLabel}</span>
                    </div>
                  </div>
                  {selectedVariant ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => copyPrompt(selectedVariant)}
                    >
                      {copiedId === selectedVariant.id ? "Copied" : "Copy prompt"}
                    </button>
                  ) : null}
                </div>
                <p className="selected-summary">{selectedVariant?.summary}</p>
                {selectedVariant ? (
                  <>
                    <div className="analysis-grid">
                      <section className="analysis-card">
                        <p className="panel-kicker">Score breakdown</p>
                        <ScoreBars scores={selectedVariant.categoryScores} />
                      </section>
                      <section className="analysis-card">
                        <p className="panel-kicker">Model-specific tuning</p>
                        <ul className="analysis-list">
                          {selectedVariant.tuningNotes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      </section>
                    </div>
                    <div className="evaluator-note">
                      <strong>Evaluator read:</strong> {selectedVariant.evaluatorRationale}
                    </div>
                  </>
                ) : null}
                <pre>{selectedVariant?.text}</pre>
              </article>
            </div>
          ) : (
            <div className="empty-state">
              <strong>Nothing generated yet.</strong>
              <p>Seed a rough idea, set your search depth and number of options, then generate a ranked prompt spread.</p>
              <div className="empty-steps">
                <span>1. Pick a prompt type</span>
                <span>2. Describe the job to be done</span>
                <span>3. Generate and compare</span>
              </div>
            </div>
          )}
        </section>

        <section className="panel history-panel workspace-span">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Recent Sessions</p>
              <h2>Keep your strongest directions nearby</h2>
            </div>
          </div>

          <div className="history-list">
            {history.length ? (
              history.map((entry) => (
                <div className="history-card" key={entry.id}>
                  <span className="history-type">{entry.promptType}</span>
                  <p>{entry.idea}</p>
                  <span className="history-meta">{entry.count} prompts generated</span>
                </div>
              ))
            ) : (
              <div className="history-empty">
                Generate prompts to start building a reusable history.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
