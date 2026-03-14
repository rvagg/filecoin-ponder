import { type RpcError, hexToBigInt } from "viem";
import { expect, test } from "vitest";
import { getLogsRetryHelper } from "./getLogsRetryHelper.js";

// 0x5aa64e..0x5ab347 spans 3321 blocks, the request Lotus rejected.
const params = [{ fromBlock: "0x5aa64e", toBlock: "0x5ab347" }] as never;
const lotus = (msg: string) => ({ details: msg }) as unknown as RpcError;

test("chunks a rejected range to the maximum Lotus states", () => {
  const r = getLogsRetryHelper({ params, error: lotus("block range exceeds maximum of 2880 (got 3321)") });
  expect(r.shouldRetry).toBe(true);
  if (!r.shouldRetry) return;
  expect(r.isSuggestedRange).toBe(true);
  expect(r.ranges[0]!.fromBlock).toBe("0x5aa64e");
  expect(r.ranges.at(-1)!.toBlock).toBe("0x5ab347");
  for (const piece of r.ranges) {
    expect(hexToBigInt(piece.toBlock) - hexToBigInt(piece.fromBlock)).toBeLessThan(2880n);
  }
  for (let i = 1; i < r.ranges.length; i++) {
    expect(hexToBigInt(r.ranges[i]!.fromBlock)).toBe(hexToBigInt(r.ranges[i - 1]!.toBlock) + 1n);
  }
});

test("does not retry a range that already fits the stated maximum", () => {
  const small = [{ fromBlock: "0x1", toBlock: "0x10" }] as never;
  const r = getLogsRetryHelper({ params: small, error: lotus("block range exceeds maximum of 2880 (got 15)") });
  expect(r.shouldRetry).toBe(false);
});

test("defers errors it does not recognise to the upstream helper", () => {
  const r = getLogsRetryHelper({ params, error: lotus("something unrelated") });
  expect(r.shouldRetry).toBe(false);
});
