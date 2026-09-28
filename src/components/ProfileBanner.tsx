"use client";

import Image from 'next/image';
import { useEffect, useRef, type ReactNode } from 'react';
import { useAnimationMode } from './AnimationPreferences';
import { BANNER_IMAGES, BANNER_ANIMATED } from '@/lib/banners';
import styles from './ProfileBanner.module.css';

export default function ProfileBanner({ id = 'carbon', children, animated = true, compact = false }: {
  id?: string; children?: ReactNode; animated?: boolean; compact?: boolean;
}) {
  const mode = useAnimationMode();
  const ref = useRef<HTMLDivElement>(null);
  const image = BANNER_IMAGES[id];
  useEffect(() => {
    const el = ref.current;
    if (!el || !animated || mode === 'minimal') return;
    let visible = false;
    const update = () => el.style.setProperty('--banner-play', visible && !document.hidden ? 'running' : 'paused');
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [animated, mode]);
  return <div ref={ref} className={styles.banner} data-compact={compact} data-design={id} data-animated={BANNER_ANIMATED.has(id)} data-mode={animated ? mode : 'minimal'}>
    {image && <Image src={image} alt="" fill sizes="(max-width: 480px) 100vw, 440px" className="object-cover" />}
    <span className={styles.light} aria-hidden="true" />
    <span className={styles.accent} aria-hidden="true" />
    {children && <div className={styles.content}>{children}</div>}
  </div>;
}
