"use client";

/**
 * Web port of Momentra splash (React Native + Reanimated reference:
 * momentra_splash/rn/SplashScreen.tsx). Uses CSS module animations — no RN deps.
 */
import { useEffect, useId } from "react";
import styles from "./splash-screen.module.css";

type SplashScreenProps = {
  onFinish: () => void;
};

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const reactId = useId();
  const gradId = `momentra-splash-emb${reactId.replace(/:/g, "")}`;

  useEffect(() => {
    const t = window.setTimeout(onFinish, 3300);
    return () => window.clearTimeout(t);
  }, [onFinish]);

  return (
    <div className={styles.container} aria-hidden>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <svg
        className={styles.markWrap}
        viewBox="0 0 120 120"
        width="100%"
        height="100%"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--ctx-accent)" />
            <stop offset="100%" stopColor="var(--ctx-accent-end)" />
          </linearGradient>
        </defs>

        <path
          className={styles.ghost}
          d="M14,100 L14,50 L34,74 L54,24 L54,100"
        />

        <circle className={styles.dot} cx={14} cy={100} r={6} />
        <circle className={styles.dot} cx={14} cy={62} r={6} />
        <circle className={styles.dot} cx={34} cy={74} r={6} />
        <circle className={styles.dot} cx={54} cy={32} r={6} />
        <circle className={styles.dot} cx={54} cy={100} r={6} />

        <path
          className={styles.peak}
          d="M54,100 L54,32 L74,74 L94,32 L96,100"
          style={{ stroke: `url(#${gradId})` }}
        />

        <path
          className={styles.arc}
          d="M94,32 Q98,20 104,16"
        />

        <circle className={styles.sparkOuter} cx={105} cy={18} r={10} />
        <circle className={styles.sparkInner} cx={105} cy={18} r={5.5} />
      </svg>

      <div className={styles.spacer} />

      <div className={styles.wordBlock}>
        <div className={styles.wordRow}>
          <span className={styles.wordText}>
            <span className={styles.wordStem}>momentr</span>
            <span className={styles.wordAccent}>a</span>
          </span>
          <span className={styles.floatDot} />
        </div>
        <p className={styles.tagline}>TOGETHER · FORWARD</p>
      </div>
    </div>
  );
}
