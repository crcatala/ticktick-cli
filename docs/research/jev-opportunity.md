# Research: Jev and its potential for `crcatala/ticktick-cli`

**Report date:** Session date (local repository snapshot carries changes dated **2026-07-15**; the exact calendar date could not be independently confirmed — see Limitations).
**Repository:** `crcatala/ticktick-cli` — "Unofficial CLI for TickTick," described in its own README as "optimized for AI agents."
**Local checkout inspected:** `/tmp/jev-research.1FrXpC/ticktick-cli` (v0.1.3, MIT, © 2025 Christian Catalan).

---

## 0. Critical research limitation (read first)

**This subagent run had no web access.** The tools available to me were file read/write and supervisor coordination only; no `web_search`, `web_fetch`, or `source_check` was registered. As a result:

- **None of the four seed sources could be fetched, quoted, or validated:**
  - `https://typesafe.ai`
  - `https://typesafe.ai/blog/introducing-system-one-models-and-jev`
  - `https://evals.typesafe.ai`
  - `https://archerhume.com/posts/jevs-architecture-unmasked`
- Therefore **every claim about what Jev *is*, its capabilities, architecture, evaluations, access model, pricing/cost, performance, and safety/privacy posture is UNVERIFIED** and is **not** asserted anywhere in this report as fact.
- What *is* verified here is the **repository analysis** (sections 3–5), which is grounded in files I read directly. Those recommendations are framed so they remain actionable, but their final prioritization depends on Jev's verified capability profile.
- Per the research brief's own instruction ("Never invent dates, quotations, citations, or unsupported precision"), I have deliberately **not fabricated** Jev specifications. Reconciling this gap is the first roadmap item.

**Bottom line:** This report is a *decision-ready framework plus a verified repo opportunity map*, not a verified account of Jev. A follow-up run with web access (or supervisor-supplied source text) is required before any Jev-specific commitment is made.

---

## 1. Executive summary and bottom-line potential impact

`ticktick-cli` is a small, well-engineered TypeScript/Bun CLI that wraps TickTick's **unofficial v2 web API** with Zod-validated responses, JSON-first output, and explicit "optimized for AI agents" positioning. It already exposes a broad, agent-friendly surface (tasks, notes, projects, folders, tags, checklists, sync/backup, user stats) and machine-readable `--json` on essentially every command.

Because I could not verify what Jev actually is, the honest bottom line is **conditional**:

- **If Jev is a capable, tool-using code/reasoning model** (the most likely reading of a vendor "models" announcement plus an "evals" site plus a third-party "architecture" analysis), then the highest-value opportunity is **not** to swap the CLI's "brains" but to make `ticktick-cli` a **first-class tool-calling target and automation substrate**: structured, idempotent, safe-by-default task operations that an agent (Jev or otherwise) can invoke, plus evaluation harnesses that score agent behavior on real productivity workflows.
- **If Jev is narrower** (e.g., a domain-specialised model), the value shifts toward **offline/back-end batch analytics** over exported TickTick state (`tt sync --json`) rather than interactive CLI control.
- Either way, the repo is unusually well placed because it is already JSON-native, schema-validated, and explicitly designed for agents.

**Predicted impact (conditional): Medium-to-Huge.** The biggest upside is product differentiation ("agent-native task management"), but it is currently gated on unverified assumptions about Jev.

---

## 2. Technical explanation of Jev and its capabilities — **UNVERIFIED**

I cannot responsibly describe Jev's internals, because I could not retrieve or verify a single source. Instead of guessing, this section records **what can be inferred from the source *titles/paths only*** (clearly labeled) and provides a verification checklist.

### 2.1 Inference from source titles/URLs only (researcher inference — LOW confidence, requires verification)

- `typesafe.ai` — appears to be the **vendor** ("TypeSafe AI") homepage. *(inference from domain)*
- `.../blog/introducing-system-one-models-and-jev` — appears to be a **vendor announcement** introducing a model family ("System One models") and a model named **"Jev."** *(inference from URL slug)*
- `evals.typesafe.ai` — appears to be a **vendor-run evaluation surface** for those models. *(inference from subdomain)*
- `archerhume.com/posts/jevs-architecture-unmasked` — appears to be a **third-party analysis/critique** of Jev's architecture. *(inference from title/domain)*

These are inferences about *what the sources appear to be*, not claims about Jev. **Do not treat any of the above as established.**

### 2.2 Verification checklist (what the follow-up must establish)

For each item, capture a direct quote + URL + access date, and mark whether it is a vendor claim or independent evidence:

1. **What Jev is** — modality (text/code/multimodal), size/class, base vs. tuned, open weights vs. API-only.
2. **"System One"** — relationship between the family and Jev; whether "Jev" is flagship, sibling, or agent layer.
3. **Capabilities** — tool/function calling, structured output, code execution, long-context, latency/cost per token.
4. **Architecture** — as claimed by vendor and as *independently* analysed by the third-party source; record contradictions verbatim.
5. **Evaluations** — benchmarks on `evals.typesafe.ai`, methodology, whether vendor-run (conflict of interest), reproducibility.
6. **Access model** — free/paid, API, licensing, rate limits, data-retention/ToS.
7. **Cost/performance** — pricing, throughput, latency vs. incumbents.
8. **Safety/privacy** — training-data provenance, PII handling, guardrails; any security discourse.
9. **Discourse** — independent reviews, criticism, benchmark disputes, adoption signals.

---

## 3. Repo-specific opportunities

> These are grounded in the repository as read. They are opportunities to *build on* the existing strengths, **not** "replace the existing model." Where a recommendation assumes something about Jev, that assumption is flagged.

### 3.1 Verified repository architecture (direct evidence)

- **Runtime/stack:** TypeScript (ESM), Node ≥22.12, built with Bun (`package.json`). Dependencies are minimal: `commander`, `keytar`, `zod`. Dev: `msw`, `oxlint`, `release-it`, `typescript`.
- **Command surface:** command groups for `auth`, `task`, `note`, `project`, `group`/`folder`, `tag`, `checklist`, `user`, `sync`, `trash` (see `src/index.ts`, `src/commands/*`).
- **API layer:** `src/api/client.ts` wraps TickTick v2 (`https://api.ticktick.com/api/v2`) with browser-shaped headers, a stable `X-Device` fingerprint, session-cookie auth, and 429 exponential backoff (`src/utils/backoff.ts`).
- **Validation:** Zod schemas with `.passthrough()` and a `strict | warn | off` strategy (`src/schemas/v2.ts`, `src/schemas/validate.ts`).
- **Agent-friendliness:** `--json` on all major commands; unambiguous reference resolution by ID/prefix/title (`src/commands/task-filters.ts`); batch operations (`completeTasks`, `deleteTasksBatch`, etc.); `tt sync` returns a full state snapshot.
- **Auth/secret handling:** session token stored in OS keyring by default; explicit plaintext fallback `--use-config` (0600) for headless/SSH (`README.md`, `src/config/config.ts`).
- **Testing:** unit tests plus **live** integration tests gated by `RUN_LIVE_TESTS=1` + `TICKTICK_TOKEN`, with a throttled client and orphan-resource cleanup (`tests/integration/live-api.test.ts`, `tests/helpers/live-test.ts`).
- **Schema capture tooling:** `scripts/schema-capture.ts` snapshots API response shapes to `schemas/snapshots/*`.
- **Governance:** personally maintained; **not accepting PRs/feature requests** (`CONTRIBUTING.md`). This materially constrains "ship it upstream" plans.

### 3.2 New customer-facing features (agent-native)

- **`tt agent` subcommand / MCP-style tool adapter:** expose the existing client as a typed tool schema (name, params, `--json` contract, side-effect class) so an external agent (e.g., Jev) can call TickTick safely. *Assumes Jev can call tools; verify first.*
- **Natural-language "plan my day" batch:** an agent turns a free-text goal into a batch of `tt task add/edit` calls; the CLI already supports batch create/complete/delete.
- **Conflict-safe bulk edit:** dry-run + diff + `--yes` confirmation, extending the existing confirmation pattern in `task done/delete/abandon`.

### 3.3 Backend / automation capabilities

- **Scheduled sync + change digest:** cron `tt sync --json` → diff → summary; the snapshot already exists.
- **Inbox triage automation:** rule-based (or agent-based) project tagging, priority, and due-date assignment over `tt task list --json`.
- **Coordinated multi-step workflows** across `task`/`project`/`tag`/`checklist` using existing batch endpoints.

### 3.4 Developer tooling

- **Agent evaluation harness:** adapt the existing live-test framework (`describeLiveWithProject`, `TestProject` setup/teardown, throttling) into a **scenario scorer** that grades an agent's end-state in TickTick after a task prompt. This is arguably the single most repo-native opportunity and is largely domain-agnostic.
- **Schema-drift canary:** reuse `scripts/schema-capture.ts` + `--validation=warn` to detect when TickTick's undocumented API shifts under the agent.

### 3.5 Admin / operations

- **Audit/backup pipeline:** versioned `tt sync --json` snapshots for compliance/restore.
- **Bulk hygiene ops:** `tt trash empty`, orphan/resource cleanup (already used by test harness) generalised into an admin command.
- **Usage analytics:** `tt user stats` already returns completed/overdue/due-today counts — feed to reporting.

---

## 4. Recommendations (categorized: Huge / Medium / Low predicted impact)

> **Caveat:** Impact ratings assume an external capable agent/model (Jev) is available and can call tools. If Jev cannot do so, move the "Huge" item to Medium and de-prioritise.

### 🔴 HUGE — Agent tool adapter + evaluation harness

- **Expected value:** Turns this CLI from "a nice CLI" into a **distribution channel** for an agent product; enables measurable "does the agent actually manage tasks well?" evidence.
- **Implementation complexity:** Medium. New `tt agent/tools` schema export + a scorer that reuses the live-test `TestProject` lifecycle. No API-layer changes needed.
- **Architectural disruption:** Low. Additive; no change to existing commands or the v2 client.
- **Dependencies:** Verified Jev tool-calling + structured-output capability; a TickTick test account/token; acceptance of the repo's no-PR governance (fork-first).
- **Risks:** Undocumented TickTick API drift; agent safety (unbounded deletes) — mitigate with dry-run/`--yes` and side-effect classification; rate limits (already backoff-handled).
- **Next experiment:** Build a throwaway scorer that gives an agent one prompt ("schedule three tasks and complete one") and asserts the resulting `tt sync --json` state. Time-box to ~1–2 days. **Do this only after Jev capabilities are verified.**

### 🟠 MEDIUM — Automated daily triage / digest backend

- **Expected value:** Immediate, model-agnostic utility for existing users; monetisable as a "smart inbox" feature.
- **Complexity:** Low–Medium. Cron + diff over `tt sync --json`; optional LLM/agent summarisation step.
- **Disruption:** Low (out-of-process automation; no core changes).
- **Dependencies:** Reliable scheduling; token storage for headless (documented `--use-config` path).
- **Risks:** Secret handling in headless environments; noisy summaries.
- **Next experiment:** A script that snapshots, diffs yesterday vs. today, and prints a digest — no AI required first, then layer agent output.

### 🟠 MEDIUM — Natural-language capture/edit front-end

- **Expected value:** Lowers friction; showcases agent abilities on real data.
- **Complexity:** Low once a tool adapter exists.
- **Disruption:** Low.
- **Dependencies:** Tool adapter; prompt-to-command mapping.
- **Risks:** Ambiguous destructive actions (deletes/complete); mitigate with confirmation.
- **Next experiment:** Map 10 canned NL phrasings to existing commands and measure accuracy.

### 🟡 LOW — Schema-drift canary & admin hygiene tooling

- **Expected value:** Reliability and ops nicety; not differentiating.
- **Complexity:** Low.
- **Disruption:** None.
- **Dependencies:** Existing `schema-capture` script and live token.
- **Risks:** False positives when TickTick adds fields (schemas are `.passthrough()`, so minor).
- **Next experiment:** Run `bun run schema:capture` against a test account and diff snapshots.

### 🟡 LOW — UI/dashboard over exported state

- **Expected value:** Marginal; overlaps TickTick's own UI.
- **Complexity:** Medium–High for real value.
- **Disruption:** None to the CLI, but a new surface to maintain.
- **Risks:** Duplicating vendor functionality.
- **Next experiment:** Not recommended before the above land.

---

## 5. Prioritized roadmap, open questions, limitations

### 5.1 Roadmap

1. **(Blocker) Verify Jev.** Fetch and validate the four seed sources; produce a facts-vs-claims table with quotes and dates. *Nothing downstream should be committed before this.*
2. **(Huge) Agent tool adapter** — export a typed tool contract for existing commands.
3. **(Huge) Evaluation harness** — reuse the live-test `TestProject` lifecycle to score agent task-management end-states.
4. **(Medium) Daily triage/digest** automation over `tt sync --json`.
5. **(Medium) NL capture/edit** on top of the tool adapter.
6. **(Low) Schema-drift canary** and admin hygiene commands.

### 5.2 Open questions

- What is Jev, exactly — and is it available to third parties via API? (Unverified.)
- Can Jev reliably produce **structured tool calls**, and with what latency/cost?
- What are Jev's **safety/guardrail** behaviours around destructive actions?
- Does the third-party "architecture unmasked" analysis **contradict** the vendor's claims? (Unverified.)
- Given the repo's **no-PR, personally-maintained** governance, is the intended path **fork**, **downstream integration**, or **vendor-neutral**?
- Are there TickTick **terms-of-service** constraints on automated/agent use of the undocumented v2 API?

### 5.3 Limitations

- **No web retrieval in this run**, so no Jev fact is verified; all Jev content is either omitted or explicitly flagged as inference/checklist.
- **Exact report date** could not be independently confirmed (no network clock check); the repository snapshot shows dated changes through **2026-07-15**.
- Findings about TickTick's API are based on the **source code's own comments** (e.g., "unofficial V2 API") and may go stale if TickTick changes its web client (`TICKTICK_WEB_VERSION` escape hatch exists).
- Recommendation impact ratings are **conditional** on assumptions about Jev that remain unverified.

---

## 6. Sources

**Kept (verified — direct local evidence):**
- `crcatala/ticktick-cli` README.md — states the project is "optimized for AI agents," documents commands, keyring auth, `TICKTICK_WEB_VERSION` escape hatch. *(direct evidence)*
- `src/index.ts`, `src/commands/*` — command surface and batch operations. *(direct evidence)*
- `src/api/client.ts`, `src/api/endpoints.ts` — unofficial v2 API wrapper, headers, backoff. *(direct evidence)*
- `src/schemas/v2.ts`, `src/schemas/validate.ts` — Zod validation strategies. *(direct evidence)*
- `tests/integration/live-api.test.ts`, `tests/helpers/live-test.ts`, `scripts/schema-capture.ts` — reusable test/eval scaffolding. *(direct evidence)*
- `package.json`, `LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md`, `RELEASING.md` — stack, licence, governance, release process. *(direct evidence)*

**Provided by requester — NOT retrievable/validated in this run (UNVERIFIED):**
- TypeSafe AI — https://typesafe.ai
- "Introducing System One models and Jev" — https://typesafe.ai/blog/introducing-system-one-models-and-jev
- TypeSafe AI evals — https://evals.typesafe.ai
- "Jev's Architecture Unmasked" — https://archerhume.com/posts/jevs-architecture-unmasked

**Rejected/deprioritized:** None — no external sources were retrieved, so no source-quality filtering was possible.

---

## 7. Next steps (highest value)

1. **Re-run with web access** (or have the supervisor paste the four sources' text) and replace section 2 with a quoted, dated, claims-vs-evidence table.
2. Confirm **Jev tool-calling + structured-output** capability — this is the hinge for the "Huge" recommendations.
3. Prototype the **agent tool adapter** and **evaluation harness** against the existing live-test scaffolding (time-boxed spike).
4. Resolve the **governance path** (fork vs. downstream) given the repo's no-PR policy.
