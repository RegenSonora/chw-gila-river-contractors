// The funding sources this release ships (CLAUDE.md rule 6). The build validates each file
// against schemas/funding-source.schema.json, so the cast below is safe. Gila River contractors
// bill TISUPP only (decision 0023).
import type { FundingSourceConfig } from '../core/types';
import tisupp from './tisupp.json';

export const FUNDING_SOURCES = [tisupp] as FundingSourceConfig[];

export function findFundingSource(id: string): FundingSourceConfig | undefined {
  return FUNDING_SOURCES.find((source) => source.id === id);
}
