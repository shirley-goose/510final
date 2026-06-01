import type { CSSProperties } from 'react';

/** Twemoji SVG CDN — CC-BY 4.0, Twitter/Twemoji */
const CDN = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg';

const ICONS = {
  dog:     `${CDN}/1f436.svg`,   // 🐶
  cat:     `${CDN}/1f431.svg`,   // 🐱
  rabbit:  `${CDN}/1f430.svg`,   // 🐰
  hamster: `${CDN}/1f439.svg`,   // 🐹
  paw:     `${CDN}/1f43e.svg`,   // 🐾
  bone:    `${CDN}/1f9b4.svg`,   // 🦴
  star:    `${CDN}/2b50.svg`,    // ⭐
  heart:   `${CDN}/1f49b.svg`,   // 💛
  sparkle: `${CDN}/2728.svg`,    // ✨
  dogFace: `${CDN}/1f415.svg`,   // 🐕
  fish:    `${CDN}/1f41f.svg`,   // 🐟
};

type PetIconProps = {
  icon: keyof typeof ICONS;
  size?: number;
  style?: CSSProperties;
  className?: string;
  alt?: string;
};

export function PetIcon({ icon, size = 64, style, className, alt = '' }: PetIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ICONS[icon]}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', ...style }}
      draggable={false}
    />
  );
}

// Named convenience exports used in page.tsx
export const DogSitting  = (p: Omit<PetIconProps, 'icon'>) => <PetIcon icon="dog"     {...p} />;
export const CatSitting  = (p: Omit<PetIconProps, 'icon'>) => <PetIcon icon="cat"     {...p} />;
export const DogRunning  = (p: Omit<PetIconProps, 'icon'>) => <PetIcon icon="dogFace" {...p} />;
export const PawPrint    = (p: Omit<PetIconProps, 'icon'>) => <PetIcon icon="paw"     {...p} />;
export const Bone        = (p: Omit<PetIconProps, 'icon'>) => <PetIcon icon="bone"    {...p} />;
export const Star        = (p: Omit<PetIconProps, 'icon'>) => <PetIcon icon="star"    {...p} />;
