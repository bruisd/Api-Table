import { Link } from 'react-router-dom';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.container}`}>
        <Link to="/" className={styles.logo}>
          <span className={styles.icon}>&#9889;</span>
          <span className={styles.brand}>API Table</span>
        </Link>
        <p className={styles.tagline}>Paste. Parse. Preview.</p>
      </div>
    </header>
  );
}
