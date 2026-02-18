/**
 * Shared types for API Table
 */

export type TabType = 'table' | 'json';

export interface ExecutionState {
  loading: boolean;
  error: string | null;
  response: unknown | null;
  statusCode: number | null;
  url: string | null;
}
