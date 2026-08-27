# Mushroom Repository Agent Instructions

These instructions are mandatory for every agent run in this repository.
The `plan/` directory is the execution source of truth; chat history is not.

## Mandatory startup

Before editing files:

1. Read `plan/README.md` and follow its document routing.
2. Read `plan/STATUS.md`, `plan/04-ENGINEERING-STANDARDS.md`, and `plan/05-AGENT-WORKFLOW.md`.
3. Read the complete file for the active phase under `plan/phases/`.
4. Inspect the repository and current Git changes. Preserve all unrelated user changes.

## Automatic batch selection

- If the user names a task ID, validate its dependencies and place only that task in a single-task batch.
- Otherwise, use `plan/STATUS.md` and the active phase's batch map to select work.
- If a batch is already active, do not start another batch. Continue it only when this run is its coordinator/handoff and there is no ownership conflict.
- If no batch is active, the main agent may select up to three unchecked tasks whose dependencies are complete, blockers are clear, contracts are frozen, and owned paths do not overlap.
- Three tasks are a maximum, not a quota. Use a one- or two-task batch when dependencies, shared files, risk, or verification isolation require it.
- The main agent claims one batch in `plan/STATUS.md` before implementation starts. Each worker agent owns exactly one task and only the paths assigned in that claim.
- Do not start the next batch until the current batch has passed the main-agent review gate and its evidence/status updates are complete.

## Execution and completion

- Keep the change within the claimed task's scope, acceptance criteria, and Definition of Done.
- Follow `plan/04-ENGINEERING-STANDARDS.md`; material architecture changes require an ADR and owner approval.
- Worker agents do not edit `plan/STATUS.md`, phase checkboxes, or phase logs. They return a structured handoff and mark their assigned task ready for review only through the coordinator.
- The main agent reviews every worker handoff, the combined diff, acceptance criteria, shared contracts, and unrelated changes, then runs integration verification proportional to the batch.
- Only the main agent may mark a task `[x]`, and only after the whole batch reaches its review gate, the task implementation exists, required checks pass, and evidence is recorded under `plan/logs/`.
- Keep the active phase checklist and `plan/STATUS.md` synchronized.
- If review fails, leave affected tasks unchecked, set the batch/task to `REWORK` or `BLOCKED`, and record the exact safe next action. Do not open the next batch.
- On batch completion, append evidence for accepted tasks, clear the active-batch claim, and identify the next eligible batch without starting it.

## Safety

- Do not reset, overwrite, delete, or reformat unrelated local changes.
- Do not modify `apps/app/src/components/home/slider-data.ts` or `justforcheck.md` unless the user explicitly requests it.
- Do not add real secrets, perform destructive Git operations, or silently change the active phase.

## Default user request

When the user says "continue", "start", or asks to proceed according to the plan without naming a task, execute the automatic batch-selection workflow above.


# Per-Task Commit Policy

## Task isolation
- Each roadmap task must be implemented, verified, reviewed, documented, and committed independently.
- Do not mix changes from multiple roadmap task IDs in one commit unless the repository plan explicitly defines them as one inseparable shared-contract operation.
- Preserve all unrelated, pre-existing, and user-owned worktree changes.
- Never stage unrelated files merely to obtain a clean working tree.

## Commit gate
A task may be committed only when:
1. Its required implementation is complete.
2. Its acceptance criteria are satisfied.
3. Required targeted tests, typechecks, contract checks, migrations, or other task-specific verification pass.
4. Required evidence/status files are updated.
5. Main-agent review finds no unresolved blocker requiring the task to remain `REWORK` or `BLOCKED`.

Do not commit incomplete task work as a completed-task commit.

## Commit contents
The task commit should contain only:
- implementation owned by that task
- tests added or changed for that task
- generated artifacts required by that task
- evidence/log updates for that task
- task/status synchronization required when marking that task `DONE`

Do not include:
- unrelated formatting
- opportunistic refactors
- future-task work
- unrelated generated files
- pre-existing user changes

## Commit format
Use one final task-level commit after the task passes its review gate.

Preferred format:

`<type>(<TASK-ID>): <concise outcome>`

Examples:
- `feat(F04-T03): connect clinic service management`
- `fix(F05-T07): enforce booking ownership`
- `test(F06-T04): cover encounter authorization boundary`
- `refactor(F07-T02): simplify prescription mapping`

Choose the commit type based on the actual change; do not default everything to `feat`.

## Execution boundary
- After completing and committing a task, stop before starting another task unless the active repository workflow explicitly authorizes continuing the current batch.
- If multiple independent workers run in parallel, each worker must not create the final repository task commit unless explicitly assigned commit ownership.
- The coordinator/main agent owns final review, task status synchronization, and task-level commit creation unless the active workflow states otherwise.

## Shared-file ownership
- Shared contracts, OpenAPI output, generated clients, Prisma schema/migrations, lockfiles, authentication infrastructure, and other designated single-writer paths must retain single-writer ownership.
- If completing one task requires modifying a shared path also needed by another task, serialize that shared work rather than combining unrelated task implementations.

## Failure handling
- If required verification fails, do not mark the task `DONE` and do not create its final task commit.
- Set or preserve the appropriate `REWORK` or `BLOCKED` state and record the exact reason and safe next action.
- Once the issue is corrected and the complete task passes review, create the normal single task-level commit.

## Final handoff
After each committed task, report:
- task ID and final status
- commit hash
- commit message
- changed files
- verification performed and results
- remaining blockers, if any
- next eligible task or batch

The repository plan remains authoritative for task selection, dependencies, ownership, and completion state.
