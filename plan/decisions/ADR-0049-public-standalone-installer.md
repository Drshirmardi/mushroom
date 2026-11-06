# ADR-0049 — Public standalone installer and versioned self-update

- Status: ACCEPTED
- Date: 2026-11-06
- Decision makers: product owner (approved plan and explicit implementation instruction), Codex coordinator
- Tasks: F12-T02-I09, F12-T02-I10, F12-T02-I11

## Context

The allowlisted installer currently requires a manual build and upload from a private monorepo. It needs an independent public home without exposing private application history or server secrets.

## Decision

Create a fresh public Drshirmardi/mushroom-installer repository at X:/Git/mushroom-installer. Move installer code and standalone tests there; application-specific integration checks remain in Mushroom and consume a pinned public source revision. Copy only necessary shared assets, recording hashes and the source revision; Mushroom retains its application runtime assets.

Relevant main-branch changes publish versioned archives, checksums and manifests after Linux tests. A public Bash bootstrap installs fresh hosts or replaces the legacy tool without running provisioning again. Updates affect installer files only. Stage version directories, validate them and atomically switch current, retaining a previous version. Expose --version, update --check, update and update --version. Interactive panel checks use a six-hour cache and explicit confirmation; automated operations do not require network checks.

## Alternatives considered

The owner selected a full code move over a release-only mirror, explicit update confirmation over silent updates, and automatic tested publication over manual-only releases.

## Consequences and validation

The repositories need a compatibility pin and shared-file hashes. Publish no private Git history, runtime.env, credentials or unrelated source. Preserve existing /etc/mushroom and environment files. Verify legacy upgrade, rollback, corrupt archives, concurrency, offline behavior, real chat/database/backup and private application integration. Live VPS deployment is outside this work; public publication and download verification are included.

## Revisit trigger

Revisit when a deployment contract requires a coordinated major version.
