/**
 * Shared types for API Table
 */

export interface HistoryEntry {
  id: string;
  fetchInput: string;
  url: string;
  method: string;
  statusCode: number;
  timestamp: number;
  response?: unknown;
}

export type TabType = 'table' | 'json';

export interface ExecutionState {
  loading: boolean;
  error: string | null;
  response: unknown | null;
  statusCode: number | null;
  url: string | null;
}
