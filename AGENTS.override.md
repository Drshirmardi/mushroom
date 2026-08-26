# Mushroom Task-Oriented Continuation Protocol

This file replaces the repository `AGENTS.md` while it exists.

## Startup

1. Read only `.codex/PROJECT-CONTEXT.md` and `.codex/NEXT.md`.
2. Inspect `git status --short` and preserve every unrelated or pre-existing change.
3. Treat the active batch in `.codex/NEXT.md` as the execution source of truth.
4. Read only code, tests, and configuration owned by the active tasks.
5. Do not read or update `plan/` unless `.codex/NEXT.md` names one exact required file.

## Task contract

- Every task must have an ID, status, dependencies, scope, owned paths, acceptance criteria, and required checks.
- Valid states are `READY`, `IN_PROGRESS`, `REVIEW`, `REWORK`, `BLOCKED`, and `DONE`.
- Never start a task whose dependencies are incomplete or whose write paths overlap another active task.
- A batch contains at most three independent tasks; three is a limit, not a quota.
- Shared Prisma/migrations, auth, module wiring, lockfiles, OpenAPI, and generated-client paths always have one writer.

## Continue and execution

- `continue`, `continu`, `ادامه`, or a Loop wake means: resume the active batch immediately.
- Resume `IN_PROGRESS` or `REWORK` tasks before claiming `READY` tasks.
- Use one worker agent per independent task when parallelism is safe; the main agent coordinates and may own one task.
- Worker agents edit only their owned paths, run targeted checks, and return a concise handoff. They never edit `.codex/NEXT.md` or task states.
- If fewer than three tasks are safely independent, run only the safe subset. Do not manufacture parallel work.
- If blocked, exhaust in-scope local checks and record the exact unblock; do not switch to unrelated work.

## Main-agent review gate

- Review each task diff, acceptance criteria, tests, security/data boundaries, shared contracts, and unrelated changes.
- Run targeted checks first; run integration, build, or E2E only when required by the batch gate.
- Mark a task `DONE` only after its implementation and checks pass. Failed review becomes `REWORK` or `BLOCKED`.
- Close the batch only when every task is `DONE`; then replace `.codex/NEXT.md` with the next eligible batch and stop.
- Never rely on chat history as project memory; stable facts live in `PROJECT-CONTEXT.md`, active work only in `NEXT.md`.

## Safety

- Do not add speculative abstractions, duplicate API types, mock production behavior, or fake zero/empty states.
- Do not modify `apps/app/src/components/home/slider-data.ts` or `justforcheck.md` unless explicitly requested.
- Keep commentary and final handoff concise: batch outcome, tasks, files, checks, blockers, next batch.
