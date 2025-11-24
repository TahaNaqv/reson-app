// CircularProgressBar.js

import styles from '../../styles/CircularProgressBar.module.css';

const CircularProgressBar = ({ progress }) => {
  // Calculate the radius and circumference of the progress bar
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress / 100) * circumference;

  return (
    <div className={styles.progressBar}>
      <svg height="150px" width="150px">
        <circle
          className={styles.progressBarBackground}
          cx="60"
          cy="80"
          r={radius}
        />
        <circle
          className={styles.progressBarCircle}
          cx="70"
          cy="60"
          r={radius}
          style={{ strokeDashoffset: progressOffset }}
        />
        <text x="40%" y="55%" textAnchor="middle" dominantBaseline="middle" className={styles.text}>
          Energy
        </text>
      </svg>
    </div>
  );
};

export default CircularProgressBar;
