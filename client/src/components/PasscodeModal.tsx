import { useState, FormEvent } from 'react';
import styles from './PasscodeModal.module.css';

interface PasscodeModalProps {
  onUnlock: () => void;
}

export default function PasscodeModal({ onUnlock }: PasscodeModalProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passcode.trim()) {
      setError('Please enter a passcode');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch('/api/verify-warp-passcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode }),
      });

      if (response.status === 429) {
        setError('Too many attempts. Please try again later.');
        setIsVerifying(false);
        return;
      }

      const data = await response.json();

      if (data.valid) {
        // Store unlock flag in sessionStorage
        sessionStorage.setItem('warpUnlocked', 'true');
        onUnlock();
      } else {
        setError('Incorrect passcode. Try again.');
        setPasscode('');
      }
    } catch (err) {
      setError('Failed to verify passcode. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modal}>
        <div className={styles.icon}>🔒</div>
        <h3 className={styles.title}>Protected Content</h3>
        <p className={styles.subtitle}>
          Warp configuration is restricted. Enter the passcode to view.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter passcode"
            className={styles.input}
            autoFocus
            disabled={isVerifying}
          />

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-primary ${styles.unlockBtn}`}
            disabled={isVerifying || !passcode.trim()}
          >
            {isVerifying ? (
              <>
                <span className="spinner" />
                Verifying...
              </>
            ) : (
              'Unlock'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
