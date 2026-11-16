# Mushroom agent instructions

## Scope and context

- Follow the user's current request. Do not start implementation when they asked only for guidance or agent configuration.
- Work directly from the request and current code. Do not enter Spec Kit, read or update `plan/` or `specs/`, claim roadmap tasks, or create planning artifacts unless explicitly requested.
- Before editing, inspect `git status --short`, applicable nested `AGENTS.md` files, and the relevant source. Preserve unrelated local changes.
- Keep changes focused; reuse existing patterns and dependencies. Do not commit, push, deploy, or run destructive data operations without authorization.
- Communicate concisely in Persian; distinguish completed work from recommendations and unverified behavior.

## Load only what the task needs

- Use scoped `rg` searches and bounded file reads. Do not dump repository trees, generated clients, logs, or the Markdown corpus into context.
- If useful, query the existing `graphify-out/` graph with a small output budget; verify findings in current source. Do not rebuild the graph for unrelated edits.
- Read a skill's `SKILL.md` only when its workflow applies. Choose one primary skill and add complementary guidance only for the layer being changed; do not load overlapping skill collections.
- For UI work: `frontend-ui-engineering` and `mobile-responsive`; preserve Persian RTL and existing components.
- For backend work: `nestjs-best-practices`; add the relevant Prisma skill only when touching persistence. For failures: `debugging-and-error-recovery`. For browser verification: the available browser-testing skill.
- Read installed framework documentation for the specific API being changed; use Context7 or official documentation when local guidance is insufficient. Avoid broad documentation fetches.
- Use subagents only when independent parallel investigation
  or verification provides clear value.
  Avoid delegation for small tasks and overlapping work.
  Never allow concurrent edits to the same files.

## Programs and service catalog

- Only when working on dashboard programs, service import, or related APIs, read `docs/agents/programs.md`. It applies across the dashboard, API, client, and raw-data layers of that feature.

## Verification

- Use existing package scripts and targeted checks for the changed behavior. Add regression coverage for meaningful logic changes; documentation-only edits need link/content checks, not application builds.
- Packages: `@sabz/dashboard`, `@sabz-zendegi/api`, `@sabz-zendegi/api-client`. Run commands with `corepack pnpm --filter <package> ...`.
- Regenerate the OpenAPI client with `corepack pnpm generate:api-client` when API contracts change; do not hand-edit generated types.
- Report the outcome, checks actually run, and remaining limitations. Never weaken checks to make a change pass.
