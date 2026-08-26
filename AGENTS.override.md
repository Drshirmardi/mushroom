# Mushroom Lean Continuation Protocol

This file replaces the repository `AGENTS.md` while it exists.

## Startup

1. Read only `.codex/PROJECT-CONTEXT.md` and `.codex/NEXT.md`.
2. Inspect `git status --short` and preserve every unrelated or pre-existing change.
3. Read only the code, tests, and configuration needed for the active slice.
4. Do not read or update `plan/` unless `.codex/NEXT.md` explicitly names one required file.

## Continue and loop behavior

- `continue`, `continu`, `ادامه`, or a Loop wake means: resume the active slice immediately without asking for a new prompt.
- Execute one bounded, testable slice per turn/wake. After acceptance, update `.codex/NEXT.md` with only the next slice and stop; the next continue/Loop wake resumes it.
- If safely blocked, exhaust relevant local checks, record the exact unblock in `.codex/NEXT.md`, and report it briefly. Do not start unrelated work.
- Never rely on chat history as project memory; keep stable facts in `PROJECT-CONTEXT.md` and live handoff only in `NEXT.md`.

## Efficiency and safety

- Use no subagent by default. Use one for independent exploration/test review, or at most two when write paths are disjoint and parallelism materially helps.
- Keep one writer for Prisma/migrations, authentication, shared module wiring, lockfiles, and generated OpenAPI/client files.
- Run targeted tests and package typechecks first. Run full workspace build/E2E only at a slice or milestone gate that requires them.
- The main agent reviews the final diff, acceptance criteria, tests, security/data boundaries, and unrelated changes before accepting a slice.
- Do not add speculative abstractions, duplicate API types, mock production behavior, or hide failures behind fake zero/empty states.
- Do not modify `apps/app/src/components/home/slider-data.ts` or `justforcheck.md` unless explicitly requested.
- Keep commentary and the final handoff concise: outcome, files, tests, blocker, next slice.
