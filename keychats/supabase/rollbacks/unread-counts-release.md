# Unread and date release preparation

Prepared against main `11160b918520f9801ff6c29ef932bed0e74913e4` and the remote function read on 2026-11-05 (Asia/Seoul). No production write was performed.

## Scope

Deploy only the reviewed A patch and its file manifest. In the shared ConversationMessagePane file include only `hasMoreOlder={hasMore}`. In the two source tests include only the shared unread RPC assertions. Exclude send-confirmation, request-ID schema changes, send Actions/repository changes, and the favicon-controller patch. Keep jsdom as a dev dependency for the unread/date DOM regression tests.

## Database contract and rollback

The deployed function returns `TABLE(room_type text, room_id uuid, unread_count bigint)`, is SQL/STABLE/SECURITY INVOKER, uses an empty search_path, is not strict, and is parallel unsafe. Owner: postgres. Current EXECUTE ACL: postgres, authenticated, service_role; no PUBLIC/anon execution and no grant options. CREATE OR REPLACE with the same signature preserves ownership, grants, and dependencies. Neither forward nor rollback SQL changes table data, schema indexes, or RLS policies.

The rollback SQL in this directory restores the exact captured function definition inside BEGIN/COMMIT, with 3s lock_timeout and 10s statement_timeout. It intentionally contains no GRANT/REVOKE because the forward migration also leaves the existing ACL unchanged. Recheck the definition, owner and complete ACL before either operation; stop if another contributor changed them. Do not execute this file without approval.

## Approval-gated execution order

1. Recheck remote main, the deployed function/ACL and the pending target migration. Validate the A patch on the same main revision.
2. Supply authorized test-environment credentials, run authenticated channel/DM/read/reconnect E2E, and run the 11 pgTap checks against a disposable local/staging database. Do not seed or change production data for tests.
3. Obtain explicit approval for the target DB migration and the A application deployment. Do not publish the entire dirty workspace.
4. Apply only `20261105024614_unread_counts_room_aggregation.sql` through the official migration mechanism in a single transaction with a short lock/statement timeout. Do not run a blanket db push. The existing unread migration is recorded remotely as `20261022132035` but the repository file is `20261022131500`; do not repair, rename or delete historical migration records.
5. Recheck return type, owner/ACL and RLS; compare channel/DM unread results under authenticated identities. If this fails before COMMIT, ROLLBACK and confirm the old function remains. The function replacement is backward compatible with the current application.
6. Publish only A using the existing Vercel project after approval. Verify two-user send/read/reconnect, local-date boundaries, pagination/scroll, RPC count and database latency against the pre-release baseline. The earlier 106.84ms to 48.22ms comparison is one sample, not a production latency guarantee.
7. If correctness/authorization regresses after COMMIT, stop the rollout and apply the captured rollback SQL through a separately approved rollback migration. Record rollback as a new official migration; do not edit earlier history. Restore the previous app deployment if required. Recheck the original function/ACL, unread results and client behavior.

## Local verification and remaining approval gates

Verified on 2026-11-05 in the isolated local Supabase project `keychats-release-a-qa`: existing schema/RLS initialization, target migration through CLI v3's local migration mechanism, exact rollback of definition/owner/ACL/function identity, reapplication and repeated application all passed. The initial rollback syntax error was fixed by adding the missing statement terminator after the captured function definition. The unread pgTap suite passed all 11 checks; authenticated Chromium E2E passed all 11 tests against localhost with fictitious users and data. The A production build passed with local-only environment variables. No production data, credentials or database changes were used.

The earlier A-only unit/typecheck/build verification remains valid; application product code was not changed during this local verification. The old send-confirmation patch and its two unresolved errors remain excluded. Production approval is still required. Recheck main, the live function/ACL and migration history immediately before applying only the target migration, then deploy only the reviewed A patch. Do not run a blanket hosted db push or include the excluded send migration. Local configuration and credentials stay outside the repository.
