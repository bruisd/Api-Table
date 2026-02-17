import { useState, useEffect } from 'react';
import type { HistoryEntry } from '../lib/types';
import styles from './History.module.css';

const HISTORY_KEY = 'apitable_history';
const MAX_HISTORY = 20;

interface HistoryProps {
  onSelect: (entry: HistoryEntry) => void;
}

export default function History({ onSelect }: HistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setEntries([]);
  };

  const getMethodBadgeClass = (method: string) => {
    const methodLower = method.toLowerCase();
    return `badge badge-${methodLower}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // Format as date
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateUrl = (url: string, maxLength = 50) => {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength) + '...';
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>History ({entries.length})</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.title}>Recent Requests</span>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={clearHistory}
            >
              Clear All
            </button>
          </div>

          <div className={styles.list}>
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={styles.entry}
                onClick={() => {
                  onSelect(entry);
                  setIsOpen(false);
                }}
              >
                <div className={styles.entryTop}>
                  <span className={getMethodBadgeClass(entry.method)}>
                    {entry.method}
                  </span>
                  <span className={styles.statusCode}>
                    {entry.statusCode}
                  </span>
                </div>
                <div className={styles.entryUrl}>
                  {truncateUrl(entry.url)}
                </div>
                <div className={styles.entryTime}>
                  {formatTimestamp(entry.timestamp)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to add entry to history (exported for use in App)
export function addToHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    let entries: HistoryEntry[] = stored ? JSON.parse(stored) : [];

    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    // Add to beginning
    entries.unshift(newEntry);

    // Limit to MAX_HISTORY
    if (entries.length > MAX_HISTORY) {
      entries = entries.slice(0, MAX_HISTORY);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save history:', err);
  }
}
