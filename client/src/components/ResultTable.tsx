import { useMemo } from 'react';
import styles from './ResultTable.module.css';

interface ResultTableProps {
  data: unknown;
}

export default function ResultTable({ data }: ResultTableProps) {
  const renderedContent = useMemo(() => renderValue(data, 0), [data]);

  return (
    <div className={styles.container}>
      {renderedContent}
    </div>
  );
}

function renderValue(value: unknown, depth: number): React.ReactNode {
  if (value === null) {
    return <span className={styles.null}>null</span>;
  }

  if (value === undefined) {
    return <span className={styles.null}>undefined</span>;
  }

  if (typeof value === 'boolean') {
    return <span className={styles.boolean}>{value.toString()}</span>;
  }

  if (typeof value === 'number') {
    return <span className={styles.number}>{value}</span>;
  }

  if (typeof value === 'string') {
    // Check if it's a URL
    if (value.match(/^https?:\/\//)) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className={styles.link}>
          {value}
        </a>
      );
    }
    return <span className={styles.string}>{value}</span>;
  }

  if (Array.isArray(value)) {
    return renderArray(value, depth);
  }

  if (typeof value === 'object') {
    return renderObject(value as Record<string, unknown>, depth);
  }

  return <span className={styles.string}>{String(value)}</span>;
}

function renderArray(arr: unknown[], depth: number): React.ReactNode {
  if (arr.length === 0) {
    return <span className={styles.empty}>[]</span>;
  }

  // Check if array of primitives
  if (arr.every(item => typeof item !== 'object' || item === null)) {
    return (
      <ol className={styles.primitiveList}>
        {arr.map((item, index) => (
          <li key={index}>{renderValue(item, depth + 1)}</li>
        ))}
      </ol>
    );
  }

  // Check if array of objects with common keys (for flat table rendering)
  if (arr.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
    const objects = arr as Record<string, unknown>[];
    const allKeys = new Set<string>();
    objects.forEach(obj => Object.keys(obj).forEach(key => allKeys.add(key)));
    const keys = Array.from(allKeys);

    // If we have common structure, render as a flat table
    if (keys.length > 0 && keys.length <= 20) {
      return (
        <div className={styles.flatTableWrapper}>
          <table className={styles.flatTable}>
            <thead>
              <tr>
                {keys.map(key => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {objects.map((obj, rowIndex) => (
                <tr key={rowIndex}>
                  {keys.map(key => (
                    <td key={key}>
                      {renderCellValue(obj[key], depth + 1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  // Render as indexed nested tables
  return (
    <table className={styles.nestedTable}>
      <tbody>
        {arr.map((item, index) => (
          <tr key={index}>
            <td className={styles.keyCell}>[{index}]</td>
            <td className={styles.valueCell}>
              {renderValue(item, depth + 1)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderObject(obj: Record<string, unknown>, depth: number): React.ReactNode {
  const keys = Object.keys(obj);

  if (keys.length === 0) {
    return <span className={styles.empty}>{'{}'}</span>;
  }

  return (
    <table className={`${styles.nestedTable} ${depth > 0 ? styles.indented : ''}`}>
      <tbody>
        {keys.map(key => (
          <tr key={key}>
            <td className={styles.keyCell}>{key}</td>
            <td className={styles.valueCell}>
              {renderValue(obj[key], depth + 1)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderCellValue(value: unknown, depth: number): React.ReactNode {
  if (value === null) {
    return <span className={styles.null}>null</span>;
  }

  if (value === undefined) {
    return <span className={styles.null}>-</span>;
  }

  if (typeof value === 'boolean') {
    return <span className={styles.boolean}>{value.toString()}</span>;
  }

  if (typeof value === 'number') {
    return <span className={styles.number}>{value}</span>;
  }

  if (typeof value === 'string') {
    if (value.length > 100) {
      return <span className={styles.string} title={value}>{value.slice(0, 100)}...</span>;
    }
    if (value.match(/^https?:\/\//)) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className={styles.link}>
          {value.length > 50 ? value.slice(0, 50) + '...' : value}
        </a>
      );
    }
    return <span className={styles.string}>{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className={styles.empty}>[]</span>;
    }
    // For nested arrays in flat tables, show count or expand
    if (value.length <= 3 && value.every(v => typeof v !== 'object')) {
      return <span className={styles.string}>[{value.join(', ')}]</span>;
    }
    return renderArray(value, depth);
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length <= 2) {
      return renderObject(value as Record<string, unknown>, depth);
    }
    return renderObject(value as Record<string, unknown>, depth);
  }

  return <span className={styles.string}>{String(value)}</span>;
}
