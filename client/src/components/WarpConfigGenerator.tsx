import { useMemo, useState } from 'react';
import { generateWarpConfig, isValidFetchInput } from '../lib/warpGenerator';
import styles from './WarpConfigGenerator.module.css';

interface WarpConfigGeneratorProps {
  fetchInput: string;
}

export default function WarpConfigGenerator({ fetchInput }: WarpConfigGeneratorProps) {
  const [copied, setCopied] = useState(false);

  const config = useMemo(() => {
    if (!fetchInput.trim() || !isValidFetchInput(fetchInput)) {
      return null;
    }
    return generateWarpConfig(fetchInput);
  }, [fetchInput]);

  const handleCopy = async () => {
    if (!config) return;

    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!config) {
    return (
      <div className={styles.empty}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <p>Enter a valid fetch() call to generate Warp config</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>Warp Action Config</h3>
          <span className={styles.badge}>3 actions</span>
        </div>
        <button
          type="button"
          className={`btn ${copied ? 'btn-primary' : 'btn-secondary'}`}
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Config
            </>
          )}
        </button>
      </div>

      <div className={styles.description}>
        <p>
          This config contains 3 actions for the Warp scraping platform:
        </p>
        <ol>
          <li>Execute fetch and store response in <code>#intactCA</code> div</li>
          <li>Wait 200ms for response</li>
          <li>Parse JSON and render as HTML table</li>
        </ol>
      </div>

      <div className={styles.codeBlock}>
        <pre>
          <code>{config}</code>
        </pre>
      </div>

      <div className="info-note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Variables (%%variableName%%) are preserved in the config for Warp's variable system.
        </span>
      </div>
    </div>
  );
}
