import { useState } from 'react';
import { createShare } from '../lib/api';
import styles from './ShareButton.module.css';

interface ShareButtonProps {
  data: unknown;
  fetchInput?: string;
  url?: string;
  disabled?: boolean;
}

export default function ShareButton({ data, fetchInput, url, disabled }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{
    shareUrl: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    setError(null);

    try {
      const result = await createShare(data, fetchInput, url);
      setShareResult({
        shareUrl: result.shareUrl,
        expiresAt: result.expiresAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    if (!shareResult) return;

    try {
      await navigator.clipboard.writeText(shareResult.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatExpiresAt = (dateStr: string) => {
    const expires = new Date(dateStr);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (shareResult) {
    return (
      <div className={styles.result}>
        <div className={styles.resultHeader}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Share created!</span>
        </div>

        <div className={styles.urlBox}>
          <input
            type="text"
            value={shareResult.shareUrl}
            readOnly
            className={styles.urlInput}
          />
          <button
            type="button"
            className={`btn ${copied ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className={styles.expiry}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Expires in {formatExpiresAt(shareResult.expiresAt)}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleShare}
        disabled={disabled || isSharing}
      >
        {isSharing ? (
          <>
            <span className="spinner" />
            Creating share...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </>
        )}
      </button>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}
