import type { ReadConfig } from './config';
import type { ReadProvider } from './read-provider';
import { emptyResult } from './snapshot';
export function disabledReadProvider(config: ReadConfig): ReadProvider {
  return { getTokenSnapshot: async () => emptyResult(config), getReadStatus: async () => emptyResult(config) };
}
