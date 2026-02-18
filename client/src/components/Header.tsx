import styles from './Header.module.css';

export default function Header() {
  const handleReset = () => {
    // Dispatch custom event that MainPage will listen to
    window.dispatchEvent(new CustomEvent('apitable:reset'));
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.container}`}>
        <button
          type="button"
          className={styles.logo}
          onClick={handleReset}
        >
          <span className={styles.icon}>&#9889;</span>
          <span className={styles.brand}>API Table</span>
        </button>
        <p className={styles.tagline}>Paste. Parse. Preview.</p>
      </div>
    </header>
  );
}
