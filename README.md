# filecoin-ponder

A fork of [ponder-sh/ponder](https://github.com/ponder-sh/ponder) with patches for Filecoin compatibility.

## What's different

One commit on top of upstream `main`:

**Filecoin null round handling + finality config**
- Filecoin has "null rounds" -- epochs where no block is produced. Lotus returns RPC error code 12 for these, which causes upstream ponder to treat them as fatal errors.
- `isNullRoundError()` detects code 12 / "null round" errors and skips them instead of retrying
- Historical and realtime sync skip null round blocks
- Filecoin chain IDs (314 mainnet, 314159 calibnet) configured with 900-block finality
- Tests for all of the above

**Files changed:** `packages/core/src/rpc/actions.ts`, `packages/core/src/rpc/index.ts`, `packages/core/src/sync-historical/index.ts`, `packages/core/src/sync-realtime/index.ts`, `packages/core/src/utils/finality.ts` + test files.

**Upstream PR:** [ponder-sh/ponder#2282](https://github.com/ponder-sh/ponder/pull/2282) (rejected, maintainers prefer a different approach -- this fork exists to unblock Filecoin usage).

## Known Filecoin limitations (not fixed here)

- **Bloom filters:** FVM sets all logsBloom bits to 1, defeating ponder's bloom filter optimization. Every block triggers an `eth_getLogs` call. Performance impact, not a correctness issue.
- **Traces:** Ponder uses `debug_traceBlockByHash` (Geth). Lotus only supports `trace_block` (OpenEthereum format). Trace handlers don't work on Filecoin.

## Upstream

For ponder documentation, usage, and API reference, see [ponder.sh](https://ponder.sh) and the [upstream repo](https://github.com/ponder-sh/ponder).
