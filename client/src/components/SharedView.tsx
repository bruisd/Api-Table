import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getShare, type GetShareResponse } from '../lib/api';
import WarpTable from './WarpTable';
import styles from './SharedView.module.css';

export default function SharedView() {
  const { id } = useParams<{ id: string }>();
  const [share, setShare] = useState<GetShareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (!id) return;

    const fetchShare = async () => {
      try {
        const data = await getShare(id);
        setShare(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load share');
      } finally {
        setLoading(false);
      }
    };

    fetchShare();
  }, [id]);

  useEffect(() => {
    if (!share) return;

    const updateCountdown = () => {
      const expires = new Date(share.expiresAt);
      const now = new Date();
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [share]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className="spinner" />
        <p>Loading shared data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <h2>This share has expired</h2>
        <p>The shared data is no longer available. Shares expire after 24 hours.</p>
        <Link to="/" className="btn btn-primary">
          Go to API Table
        </Link>
      </div>
    );
  }

  if (!share) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.meta}>
          <h1 className={styles.title}>Shared API Response</h1>
          {share.url && (
            <div className={styles.url}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <code>{share.url}</code>
            </div>
          )}
        </div>

        <div className={styles.expiry}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Expires in {countdown}</span>
        </div>
      </div>

      <div className={styles.content}>
        <WarpTable data={share.data} />
      </div>

      <div className={styles.footer}>
        <Link to="/" className="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Create Your Own
        </Link>
      </div>
    </div>
  );
}
