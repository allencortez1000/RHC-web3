import { createThirdwebClient, defineChain, getContract } from 'thirdweb';
import { eth_call, eth_getBlockByNumber } from 'thirdweb/rpc';
import { decodeAbiParameters } from 'thirdweb/utils';
import type { Web3Field, Web3ReadResult } from '@rhc/types';
import type { ReadConfig } from './config';
import { ReadError } from './errors';
import { amountField, boundText, emptyResult, observed, unavailable, unsupported } from './snapshot';
import { createTransport, type RpcReadRequest } from './transport';

export async function readSdkSnapshot(config: ReadConfig, signal: AbortSignal): Promise<Web3ReadResult> {
  if (!config.valid || !config.enabled || !config.approval || !config.secretKey) throw new ReadError('PROVIDER_UNAVAILABLE');
  const approval = config.approval;
  const client = createThirdwebClient({ secretKey: config.secretKey });
  const chain = defineChain({ id: approval.id, rpc: `https://${approval.id}.rpc.thirdweb.com` });
  const contract = getContract({ client, chain, address: approval.contractAddress });
  const transport = createTransport(approval.id, client.clientId, config.secretKey, signal);
  // The SDK accepts an EIP-1193 function. Runtime allowlisting deliberately implements only reads.
  const request = transport as Parameters<typeof eth_call>[0];
  const chainId = await transport({ method: 'eth_chainId' });
  if (typeof chainId !== 'string' || !/^0x[0-9a-f]+$/i.test(chainId) || BigInt(chainId) !== BigInt(approval.id)) throw new ReadError('WRONG_CHAIN');
  const block = await eth_getBlockByNumber(request, { blockTag: 'latest', includeTransactions: false });
  if (block.number === null || !block.hash || !/^0x[0-9a-f]{64}$/i.test(block.hash)) throw new ReadError('BAD_RESPONSE');
  const blockTag = `0x${block.number.toString(16)}` as const;
  // eth_getCode's SDK wrapper exposes only BlockTag, so use its documented JSON-RPC method at a hex height.
  const code = await transport({ method: 'eth_getCode', params: [contract.address, blockTag] });
  if (typeof code !== 'string' || !/^0x(?:[0-9a-f]{2})+$/i.test(code) || /^0x0*$/i.test(code)) throw new ReadError('NO_CONTRACT');

  async function field<T>(selector: `0x${string}`, decode: (raw: `0x${string}`) => T): Promise<Web3Field<T>> {
    try {
      // Pin every call, including height zero (SDK blockNumber 0n is falsy); no latest-tag token reads.
      const raw = block.number === 0n
        ? await transport({ method: 'eth_call', params: [{ to: contract.address, data: selector }, blockTag] })
        : await eth_call(request, { to: contract.address, data: selector, blockNumber: block.number });
      if (typeof raw !== 'string' || !/^0x[0-9a-f]*$/i.test(raw)) throw new ReadError('BAD_RESPONSE');
      if (raw === '0x') return unavailable();
      return observed(decode(raw as `0x${string}`));
    } catch (error) {
      if (signal.aborted) throw new ReadError('TIMEOUT');
      if (error instanceof ReadError && error.code !== 'METHOD_UNAVAILABLE' && error.code !== 'BAD_RESPONSE') throw error;
      return unavailable();
    }
  }
  const text = (raw: `0x${string}`) => boundText(decodeAbiParameters([{ type: 'string' }], raw)[0]);
  const integer = (raw: `0x${string}`) => decodeAbiParameters([{ type: 'uint256' }], raw)[0];
  const name = await field('0x06fdde03', text);
  const symbol = await field('0x95d89b41', text);
  const decimals = await field('0x313ce567', (raw) => {
    const value = integer(raw);
    if (value > 255n) throw new ReadError('BAD_RESPONSE');
    return Number(value); // uint8 metadata only; amounts are never converted to Number.
  });
  const supply = await field('0x18160ddd', integer);
  const cap = approval.optionalReads.includes('cap') ? await field('0x355274ea', integer) : unsupported<bigint>();
  const paused = approval.optionalReads.includes('paused') ? await field('0x5c975abb', (raw) => decodeAbiParameters([{ type: 'bool' }], raw)[0]) : unsupported<boolean>();
  const confirmedBlock = await eth_getBlockByNumber(request, { blockNumber: block.number, includeTransactions: false });
  if (confirmedBlock.hash !== block.hash) throw new ReadError('REORG');
  const data = { name, symbol, decimals, totalSupply: amountField(supply, decimals), cap: amountField(cap, decimals), paused };
  if (!Object.values(data).some((value) => value.status === 'observed')) throw new ReadError('PROVIDER_UNAVAILABLE');
  const partial = Object.values(data).some((value) => value.status === 'unavailable');
  return { ...emptyResult(config), data, connection: partial ? 'degraded' : 'ready', snapshot: partial ? 'partial' : 'fresh',
    diagnosticCode: partial ? 'PARTIAL_METADATA' : null,
    block: { number: block.number.toString(), hash: block.hash, timestamp: block.timestamp.toString(), finality: 'observed' } };
}
// No generic RPC transport is exported from the package entry point.
export type AllowedReadRequest = RpcReadRequest;
