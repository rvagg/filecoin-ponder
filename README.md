# filecoin-ponder

A fork of [ponder-sh/ponder](https://github.com/ponder-sh/ponder) with patches for Filecoin EVM (FVM) compatibility. Published to npm as **[`@rvagg/ponder`](https://www.npmjs.com/package/@rvagg/ponder)**.

Recommended install pattern uses an npm alias so source code keeps importing from `"ponder"`:

```json
{
  "dependencies": {
    "ponder": "npm:@rvagg/ponder@^0.16.6"
  }
}
```

```bash
npm install
```

The package's internal type declarations self-reference the original `"ponder"` name, so installing under that local name keeps virtual modules and type imports resolving correctly. See the [package README](packages/core/README.md#install) for the alternative (direct scope install + tsconfig paths).

If you're indexing on Ethereum, Base, Arbitrum, or any other standard EVM chain, this fork will work but [upstream `ponder`](https://www.npmjs.com/package/ponder) would be the better choice. This fork exists only to unblock Filecoin (chains 314 and 314159).

## What's different

Patches on top of upstream `main` (one commit) addressing Filecoin EVM incompatibilities:

**1. Null round handling.** Filecoin has "null rounds" where no block is produced for an epoch. Lotus returns RPC error code 12 for these, which upstream Ponder treats as a fatal error. `isNullRoundError()` detects null rounds and skips them in both historical and realtime sync paths.

**2. logsBloom validation bypass.** FVM fills all logsBloom bits to 1 regardless of actual log content. Upstream Ponder validates that a non-zero logsBloom implies non-empty logs, which fails on every Filecoin block without events. The check is skipped for Filecoin chain IDs (314, 314159).

**3. Start block lookback fallback.** Ponder fetches the config's `startBlock` on every restart for the sync progress anchor. On RPC endpoints with limited history (Lotus gateway has a 24h or 7d window), this fails once the start block ages past the lookback limit. The fork synthesizes a placeholder block on lookback failure, allowing Ponder to resume from its checkpoint without needing full-history RPC access.

**4. RPC timeout raised from 10s to 20s.** Upstream's hardcoded 10s timeout in `rpc/index.ts` and `rpc/http.ts` is occasionally tight for blocks with unusually large event payloads (observed during calibnet testing under pathological workloads). 20s gives margin without changing the API.

Filecoin chain IDs are wired into `utils/finality.ts` with 900-block finality.

The corresponding upstream PR was [ponder-sh/ponder#2282](https://github.com/ponder-sh/ponder/pull/2282), rejected because the maintainers preferred a different approach. This fork exists to unblock Filecoin usage in the meantime.

## Known Filecoin limitations (not fixed here)

- **Bloom filter optimization defeated.** FVM's all-ones logsBloom means Ponder can't skip blocks based on the filter. Every block triggers an `eth_getLogs` call. Performance impact only, not correctness.
- **Traces don't work.** Ponder uses `debug_traceBlockByHash` (Geth format). Lotus only supports `trace_block` (OpenEthereum format). Trace handlers and transfer handlers won't function on Filecoin.

## Versioning

Versions mirror upstream `ponder`. `@rvagg/ponder@0.16.6` corresponds to upstream's `ponder@0.16.6` plus the Filecoin patches. New releases are cut after rebasing the fork onto each upstream tag.

## Maintaining the fork

### Rebase on upstream

```bash
git fetch upstream
git rebase upstream/main
# Expect a one-line conflict in packages/core/package.json (the "name" field)
git push origin main --force-with-lease
```

The `upstream` remote should point at `https://github.com/ponder-sh/ponder.git`.

### Cut a release

Releases are tag-driven. After rebasing onto a new upstream version:

```bash
# Verify packages/core/package.json's "version" matches upstream's tagged release
git tag v0.16.7
git push origin v0.16.7
```

The `Release` workflow (`.github/workflows/release.yml`) fires on `v*` tags and publishes via OIDC trusted publishing, so no `NPM_TOKEN` is required. The same workflow can be run via `workflow_dispatch` to publish under an arbitrary npm dist-tag (e.g. `next`) for testing.

### What's published

Only `packages/core` is published, as `@rvagg/ponder`. Its runtime dependency on `@ponder/utils` resolves to upstream's published version (`@ponder/utils@0.2.18` at time of writing). No separate fork of utils is needed because this fork hasn't touched `packages/utils/`.

## Where this is used

The [foc-observer](https://github.com/FilOzone/foc-observer) project uses this fork to index Filecoin smart contract events. The `indexer/` Dockerfile installs it from npm.

## Upstream documentation

For Ponder API reference, configuration, schema definition, and indexing-function patterns, see [ponder.sh](https://ponder.sh) and the [upstream repo](https://github.com/ponder-sh/ponder).
