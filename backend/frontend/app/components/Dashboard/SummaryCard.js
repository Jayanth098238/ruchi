import styles from './SummaryCard.module.css';

export default function SummaryCard({ title, value }) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{title}</div>
      <div className={styles.value}>{value}</div>
    </div>
  );
}
