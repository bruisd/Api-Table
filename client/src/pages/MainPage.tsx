import { useState, useCallback, useEffect } from 'react';
import FetchInput from '../components/FetchInput';
import WarpTable from '../components/WarpTable';
import ShareButton from '../components/ShareButton';
import type { TabType } from '../lib/types';
import styles from './MainPage.module.css';

export default function MainPage() {
  const [activeTab, setActiveTab] = useState<TabType>('table');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<unknown | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [fetchInput, setFetchInput] = useState<string>('');

  const handleExecute = useCallback(
    (data: unknown, status: number, requestUrl: string, input: string) => {
      setResponse(data);
      setStatusCode(status);
      setUrl(requestUrl);
      setFetchInput(input);
      setError(null);
    },
    []
  );

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setResponse(null);
    setStatusCode(null);
  }, []);

  // Listen for reset event from header
  useEffect(() => {
    const handleReset = () => {
      setActiveTab('table');
      setLoading(false);
      setError(null);
      setResponse(null);
      setStatusCode(null);
      setUrl(null);
      setFetchInput('');
    };

    window.addEventListener('apitable:reset', handleReset);
    return () => window.removeEventListener('apitable:reset', handleReset);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.inputSection}>
        <FetchInput
          onExecute={handleExecute}
          onError={handleError}
          onLoading={setLoading}
          initialValue={fetchInput}
          key={fetchInput}
        />
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className={styles.loadingState}>
          <span className="spinner" />
          <p>Executing request...</p>
        </div>
      )}

      {response !== null && !loading && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <div className={styles.responseMeta}>
              <h2 className={styles.resultsTitle}>Response</h2>
              {statusCode && (
                <span
                  className={`${styles.statusBadge} ${
                    statusCode >= 200 && statusCode < 300
                      ? styles.success
                      : statusCode >= 400
                      ? styles.error
                      : styles.warning
                  }`}
                >
                  {statusCode}
                </span>
              )}
              {url && (
                <code className={styles.urlDisplay}>{url}</code>
              )}
            </div>

            <div className={styles.actions}>
              <ShareButton
                data={response}
                fetchInput={fetchInput}
                url={url || undefined}
              />
            </div>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={`tab ${activeTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveTab('table')}
            >
              Table View
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'json' ? 'active' : ''}`}
              onClick={() => setActiveTab('json')}
            >
              Raw JSON
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'table' && (
              <div className={styles.tableContainer}>
                <WarpTable data={response} />
              </div>
            )}

            {activeTab === 'json' && (
              <div className="code-block">
                <pre>
                  <code>{JSON.stringify(response, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {response === null && !loading && !error && (
        <div className={styles.emptyState}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <h3>Ready to test an API</h3>
          <p>Paste a fetch() call above and click Execute to see the response visualized as an interactive table.</p>
        </div>
      )}
    </div>
  );
}
