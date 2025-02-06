'use client';
import styles from './loader.module.css'; // Import the CSS module

export default function Loader() {
  return (
    <div className={styles.loader}>
      <div className={`justify-content-center ${styles['jimu-primary-loading']}`} />
    </div>
  );
}
