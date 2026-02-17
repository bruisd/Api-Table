import { useState, useCallback } from 'react';
import { parseFetch, SAMPLE_FETCH, type ParseResult } from '../lib/fetchParser';
import { detectVariables, replaceVariables, hasUnresolvedVariables } from '../lib/variableEngine';
import VariableDetector from './VariableDetector';
import styles from './FetchInput.module.css';

interface FetchInputProps {
  onExecute: (response: unknown, statusCode: number, url: string, fetchInput: string) => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
  initialValue?: string;
}

export default function FetchInput({
  onExecute,
  onError,
  onLoading,
  initialValue = '',
}: FetchInputProps) {
  const [input, setInput] = useState(initialValue);
  const [parseError, setParseError] = useState<string | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);

  const detectedVariables = detectVariables(input);

  const handleLoadSample = useCallback(() => {
    setInput(SAMPLE_FETCH);
    setParseError(null);
    setVariableValues({});
  }, []);

  const handleVariableChange = useCallback((name: string, value: string) => {
    setVariableValues(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleExecute = useCallback(async () => {
    setParseError(null);

    // Check for unresolved variables
    const { hasUnresolved, unresolved } = hasUnresolvedVariables(input, variableValues);
    if (hasUnresolved) {
      setParseError(`Unresolved variables: ${unresolved.map(v => `%%${v}%%`).join(', ')}`);
      return;
    }

    // Replace variables in the input
    const processedInput = replaceVariables(input, variableValues);

    // Parse the fetch call
    const result: ParseResult = parseFetch(processedInput);

    if (!result.success || !result.data) {
      setParseError(result.error || 'Failed to parse fetch call');
      return;
    }

    const { url, method, headers, body } = result.data;

    setIsExecuting(true);
    onLoading(true);

    try {
      // Execute the fetch call through the proxy
      const proxyResponse = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          method,
          headers,
          body,
        }),
      });

      if (!proxyResponse.ok) {
        const errorData = await proxyResponse.json();
        throw new Error(errorData.error || `Proxy error: ${proxyResponse.status}`);
      }

      const proxyData = await proxyResponse.json();

      // proxyData has { status, headers, body }
      onExecute(proxyData.body, proxyData.status, url, input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute fetch';
      onError(message);
    } finally {
      setIsExecuting(false);
      onLoading(false);
    }
  }, [input, variableValues, onExecute, onError, onLoading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleExecute();
    }
  }, [handleExecute]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Fetch Input</h2>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleLoadSample}
        >
          Load Sample
        </button>
      </div>

      <div className={styles.inputWrapper}>
        <textarea
          className={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Paste your fetch() call here...\n\nExample:\nawait fetch('https://api.example.com/data', {\n  method: 'GET',\n  headers: {\n    'Authorization': 'Bearer %%apiKey%%'\n  }\n})`}
          spellCheck={false}
        />
      </div>

      {detectedVariables.length > 0 && (
        <VariableDetector
          variables={detectedVariables}
          values={variableValues}
          onChange={handleVariableChange}
        />
      )}

      {parseError && (
        <div className="error-message">
          {parseError}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleExecute}
          disabled={!input.trim() || isExecuting}
        >
          {isExecuting ? (
            <>
              <span className="spinner" />
              Executing...
            </>
          ) : (
            'Execute'
          )}
        </button>
        <span className={styles.hint}>
          or press <kbd>Cmd</kbd>+<kbd>Enter</kbd>
        </span>
      </div>

      <div className="info-note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Requests are proxied through our server. Session-based authentication (cookies) will not be forwarded.
        </span>
      </div>
    </div>
  );
}
