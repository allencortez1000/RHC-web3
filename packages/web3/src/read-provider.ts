import type { Web3ReadResult } from '@rhc/types';
export interface ReadProvider {
  getTokenSnapshot(): Promise<Web3ReadResult>;
  /** Configuration and last observation only; never initiates a network read. */
  getReadStatus(): Promise<Web3ReadResult>;
}
