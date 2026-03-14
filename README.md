# filecoin-ponder

A fork of [ponder-sh/ponder](https://github.com/ponder-sh/ponder) with patches for Filecoin compatibility.

## What's different

One commit on top of upstream `main` addressing three Filecoin EVM incompatibilities:

**1. Null round handling**
Filecoin has "null rounds" -- epochs where no block is produced. Lotus returns RPC error code 12 for these, which causes upstream Ponder to treat them as fatal errors. `isNullRoundError()` detects these and skips them instead of retrying or crashing. Historical and realtime sync both handle null rounds gracefully.

**2. logsBloom validation bypass**
Filecoin's FVM fills all logsBloom bits to 1 regardless of actual log content. Upstream Ponder validates that a non-zero logsBloom implies non-empty logs, which fails on every Filecoin block without events. The check is skipped for Filecoin chains (314, 314159).

**3. Start block lookback fallback**
Ponder fetches the config's `startBlock` on every restart for the sync progress anchor. On RPC endpoints with limited lookback (e.g. Lotus gateway with a 24h or 7d window), this fails once the start block ages past the lookback limit. Falls back to a synthetic placeholder block when the fetch fails, allowing Ponder to resume from its checkpoint without needing full-history RPC access.

**Also:** Filecoin chain IDs (314 mainnet, 314159 calibnet) configured with 900-block finality.

**Files changed:** `packages/core/src/rpc/actions.ts`, `packages/core/src/rpc/index.ts`, `packages/core/src/runtime/index.ts`, `packages/core/src/sync-historical/index.ts`, `packages/core/src/sync-realtime/index.ts`, `packages/core/src/utils/finality.ts` + test files.

**Upstream PR:** [ponder-sh/ponder#2282](https://github.com/ponder-sh/ponder/pull/2282) (rejected, maintainers prefer a different approach -- this fork exists to unblock Filecoin usage).

## Known Filecoin limitations (not fixed here)

- **Bloom filter performance:** FVM's all-ones logsBloom defeats Ponder's bloom filter optimization for skipping blocks. Every block triggers an `eth_getLogs` call even if it has no relevant events. Performance impact only.
- **Traces:** Ponder uses `debug_traceBlockByHash` (Geth format). Lotus only supports `trace_block` (OpenEthereum format). Trace handlers and transfer handlers don't work on Filecoin.

## Upstream

For Ponder documentation, usage, and API reference, see [ponder.sh](https://ponder.sh) and the [upstream repo](https://github.com/ponder-sh/ponder).
