import {
  type GetLogsRetryHelperParameters,
  getLogsRetryHelper as upstreamGetLogsRetryHelper,
} from "@ponder/utils";
import { type Hex, hexToBigInt, numberToHex } from "viem";

/**
 * Lotus rejects eth_getLogs over its configured MaxFilterHeightRange with
 * "block range exceeds maximum of N (got M)". @ponder/utils only recognises
 * named hosted providers, so it would retry the same range indefinitely.
 * Chunk to N here; everything else defers to the upstream helper.
 */
const LOTUS_BLOCK_RANGE = /block range exceeds maximum of (\d+)/;

export function getLogsRetryHelper(
  args: GetLogsRetryHelperParameters,
): ReturnType<typeof upstreamGetLogsRetryHelper> {
  const match = stringify(args.error).match(LOTUS_BLOCK_RANGE);
  if (match !== null) {
    const max = BigInt(match[1]!);
    const from = hexToBigInt(args.params[0].fromBlock);
    const to = hexToBigInt(args.params[0].toBlock);
    // Only chunk when the request is actually wider than the cap, so a
    // range that already fits cannot loop.
    if (max > 0n && to - from > max) {
      const ranges: { fromBlock: Hex; toBlock: Hex }[] = [];
      for (let start = from; start <= to; start += max) {
        const end = start + max - 1n < to ? start + max - 1n : to;
        ranges.push({ fromBlock: numberToHex(start), toBlock: numberToHex(end) });
      }
      return { shouldRetry: true, ranges, isSuggestedRange: true };
    }
  }
  return upstreamGetLogsRetryHelper(args);
}

function stringify(error: unknown): string {
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
