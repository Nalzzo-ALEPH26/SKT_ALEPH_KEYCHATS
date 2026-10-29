# KEYCHATS AI CONTRIBUTOR RULES

This file is the authoritative working agreement for AI coding agents modifying this repository.

## 1. Repository and branch policy — mandatory

- The only working repository is `Nalzzo-ALEPH26/SKT_ALEPH_KEYCHATS`.
- The only allowed branch is `main`.
- **Never create another branch for any reason.** Do not create feature, fix, temp, transfer, test, backup, handoff, or agent branches.
- Do not switch work to `SKT_ALEPH_Main_Repo`. That repository is no longer the KEYCHATS source of truth.
- Make changes directly on `main` only.
- Never force-push, rewrite history, rebase published `main`, or use destructive Git commands such as `git reset --hard` against shared work.
- Before editing, read the current remote `main` and confirm you are working from its latest state.
- Before writing/pushing, re-check the remote `main`. If another contributor changed it, incorporate the latest changes first instead of overwriting them.
- Preserve other contributors' edits. Never replace a newer file with an older local copy just to make your change easier.

## 2. Shared-repository concurrency

Multiple humans and AI agents may modify this repository.

- Keep each change narrowly scoped to the user's request.
- Avoid unrelated formatting, renaming, refactors, dependency upgrades, or generated-file changes.
- Prefer small, understandable commits.
- If the remote `main` moves while you are working, stop before pushing, compare the new changes, and reconcile them safely.
- Never solve a conflict by discarding another contributor's work unless the user explicitly asks for that removal.
- Do not create a temporary branch as a conflict-resolution shortcut.

## 3. Project structure and stack

- Application root: `keychats/`
- Framework: Next.js App Router + TypeScript + React.
- Database/Auth/Realtime: Supabase.
- Production hosting: the existing Vercel `keychats` project.
- Production domain: `https://keychats.vercel.app`.
- Preserve the existing Vercel project, domain, Git connection, environment variables, and Supabase connection unless the user explicitly requests a change.

## 4. Supabase and data-safety rules

- Treat production data, authentication, messages, communities, and user records as persistent data that must be preserved.
- Schema changes must be made with a new migration under `keychats/supabase/migrations/`.
- Never edit, rename, reorder, or delete an already-applied migration just to make a new change work.
- Prefer additive/backward-compatible migrations.
- Do not drop tables, delete production data, hard-delete historical records, reset the production database, or weaken RLS without explicit user approval.
- Any new user-owned table must have appropriate RLS and least-privilege policies.
- Never expose Supabase secret/service-role credentials to browser/client code.
- Do not put secrets, tokens, passwords, private keys, or production credentials in the repository.

## 5. Authentication and authorization

- Do not weaken existing authentication or authorization checks for convenience.
- Admin-only actions must remain server-authorized; hiding a button in the UI is not authorization.
- Board/community owner privileges must be checked server-side where required.
- Preserve historical account/message references when changing account deletion or moderation behavior unless explicit destructive deletion is requested.

## 6. UI and behavior changes

- Preserve existing behavior outside the requested scope.
- Reuse existing components, data flows, and design tokens before introducing parallel implementations.
- For notification features, preserve per-room preferences and current defaults unless explicitly changed:
  - normal channel notification default: OFF
  - DM notification default: ON
- Accessibility and basic keyboard/browser behavior must not regress.

## 7. Testing requirements

For application-code changes, run from `keychats/` when the environment supports it:

```bash
npm test
npm run build
```

When the change touches browser flows and Playwright is available, also run:

```bash
npm run test:e2e
```

When the change touches Supabase schema, RLS, policies, or database behavior and a local Supabase runtime is available, also run:

```bash
supabase test db
```

The repository CI in `.github/workflows/keychats-ci.yml` is the final full check and runs database security tests, unit tests, production build, and E2E smoke tests.

- Do not claim a test passed unless it was actually run and passed.
- If a required test cannot run because of environment/tool limitations, state that limitation explicitly.
- Do not weaken, delete, skip, or change test expectations merely to obtain a green build unless the expected product behavior itself intentionally changed.

## 8. Deployment rules

- `main` is the production source branch.
- Do not create extra deployments from temporary branches.
- Avoid unnecessary redeployments; one validated `main` push should be preferred.
- Do not create a new Vercel project or a new Supabase project for routine changes.
- After a deployment-affecting change, verify the production deployment/status before claiming it is live.

## 9. Generated files and repository hygiene

- Do not commit `.next/`, `node_modules/`, local Supabase temp/state directories, logs, caches, editor files, or temporary transfer payloads.
- Do not leave temporary scripts, patch bundles, test branches, debug-only code, or one-off credentials in the repository.
- Keep repository changes limited to files that are genuinely needed for the requested feature/fix.

## 10. Required workflow for every AI change

1. Read this `AGENTS.md` before modifying code.
2. Confirm the repository is `Nalzzo-ALEPH26/SKT_ALEPH_KEYCHATS`.
3. Confirm the target branch is `main`; **do not create any other branch**.
4. Read the latest remote `main` and inspect relevant code/tests before editing.
5. Make the smallest safe change that satisfies the request.
6. Add or update tests when behavior changes.
7. Run the relevant checks listed above.
8. Re-check that remote `main` has not changed before writing/pushing. Reconcile safely if it has.
9. Commit/push only to `main`.
10. Report exactly what changed, what was tested, and any limitation or unfinished item.

## 11. User instructions override implementation preferences, not safety constraints

When the user's request conflicts with an implementation preference in this document, follow the user. However, do not silently violate data safety, credential safety, authorization, or repository-integrity rules. Explain the conflict and choose the least destructive path.

**Absolute branch rule: AI agents must not create or use any branch other than `main`.**
