import styles from './VariableDetector.module.css';

interface VariableDetectorProps {
  variables: string[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

export default function VariableDetector({
  variables,
  values,
  onChange,
}: VariableDetectorProps) {
  if (variables.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={styles.icon}
        >
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        <span className={styles.title}>Variables Detected</span>
        <span className={styles.count}>{variables.length}</span>
      </div>

      <div className={styles.variables}>
        {variables.map((name) => (
          <div key={name} className={styles.variable}>
            <label className={styles.label} htmlFor={`var-${name}`}>
              <span className={styles.varName}>%%{name}%%</span>
            </label>
            <input
              id={`var-${name}`}
              type="text"
              className={styles.input}
              value={values[name] || ''}
              onChange={(e) => onChange(name, e.target.value)}
              placeholder={`Enter value for ${name}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
