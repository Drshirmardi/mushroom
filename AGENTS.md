# Mushroom Repository Agent Instructions

These instructions are mandatory for every agent run in this repository.
The `plan/` directory is the execution source of truth; chat history is not.

## Mandatory startup

Before editing files:

1. Read `plan/README.md` and follow its document routing.
2. Read `plan/STATUS.md`, `plan/04-ENGINEERING-STANDARDS.md`, and `plan/05-AGENT-WORKFLOW.md`.
3. Read the complete file for the active phase under `plan/phases/`.
4. Inspect the repository and current Git changes. Preserve all unrelated user changes.

## Automatic task selection

- If the user names a task ID, work only on that task after validating its dependencies.
- Otherwise, use `plan/STATUS.md` to select work.
- If a task is already active, do not start a different task. Continue it only when the current run is clearly its handoff and no concurrent agent owns it; otherwise report the ownership conflict.
- If no task is active, choose the first unchecked task in the active phase whose dependencies are complete and which has no active blocker.
- Claim exactly one task in `plan/STATUS.md` before changing implementation files, using the claim format in `plan/05-AGENT-WORKFLOW.md`.
- Never begin the next task automatically in the same run.

## Execution and completion

- Keep the change within the claimed task's scope, acceptance criteria, and Definition of Done.
- Follow `plan/04-ENGINEERING-STANDARDS.md`; material architecture changes require an ADR and owner approval.
- Run verification proportional to the task and review the final diff for unrelated changes.
- Mark a task `[x]` only when its implementation exists, required checks pass, and evidence is recorded in the active phase log under `plan/logs/`.
- Keep the active phase checklist and `plan/STATUS.md` synchronized.
- On completion, append evidence to the active phase log, clear the active-task claim in `plan/STATUS.md`, and identify the next eligible task there without starting it.
- If incomplete or blocked, leave the task unchecked and record completed work, remaining work, tests, blocker, and safe next action.

## Safety

- Do not reset, overwrite, delete, or reformat unrelated local changes.
- Do not modify `apps/app/src/components/home/slider-data.ts` or `justforcheck.md` unless the user explicitly requests it.
- Do not add real secrets, perform destructive Git operations, or silently change the active phase.

## Default user request

When the user says "continue", "start", or asks to proceed according to the plan without naming a task, execute the automatic task-selection workflow above.
