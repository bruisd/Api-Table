/**
 * API client for share functionality
 */

import { API_BASE_URL } from './config';

const API_BASE = `${API_BASE_URL}/api`;

export interface CreateShareResponse {
  id: string;
  shareUrl: string;
  expiresAt: string;
}

export interface GetShareResponse {
  id: string;
  data: unknown;
  fetchInput: string | null;
  url: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface ApiError {
  error: string;
}

/**
 * Create a new share
 */
export async function createShare(
  data: unknown,
  fetchInput?: string,
  url?: string
): Promise<CreateShareResponse> {
  const response = await fetch(`${API_BASE}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data,
      fetchInput,
      url,
    }),
  });

  if (!response.ok) {
    const error = await response.json() as ApiError;
    throw new Error(error.error || 'Failed to create share');
  }

  return response.json();
}

/**
 * Get a share by ID
 */
export async function getShare(id: string): Promise<GetShareResponse> {
  const response = await fetch(`${API_BASE}/share/${id}`);

  if (!response.ok) {
    const error = await response.json() as ApiError;
    throw new Error(error.error || 'Share not found or expired');
  }

  return response.json();
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<{ status: string; activeShares: number }> {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
