import type { CSSProperties } from 'react';

/** Microsoft Fluent Emoji 3D — MIT License */
const CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@latest/assets';

const ICONS = {
  dog:          `${CDN}/Dog%20face/3D/dog_face_3d.png`,
  cat:          `${CDN}/Cat%20face/3D/cat_face_3d.png`,
  rabbit:       `${CDN}/Rabbit%20face/3D/rabbit_face_3d.png`,
  hamster:      `${CDN}/Hamster/3D/hamster_3d.png`,
  bear:         `${CDN}/Bear/3D/bear_3d.png`,
  paw:          `${CDN}/Paw%20prints/3D/paw_prints_3d.png`,
  bone:         `${CDN}/Bone/3D/bone_3d.png`,
  star:         `${CDN}/Star/3D/star_3d.png`,
  sparkle:      `${CDN}/Sparkles/3D/sparkles_3d.png`,
  heart:        `${CDN}/Sparkling%20heart/3D/sparkling_heart_3d.png`,
  dogFull:      `${CDN}/Dog/3D/dog_3d.png`,
  catFull:      `${CDN}/Cat/3D/cat_3d.png`,
  sleep:        `${CDN}/Sleeping%20face/3D/sleeping_face_3d.png`,
  party:        `${CDN}/Party%20popper/3D/party_popper_3d.png`,
  balloon:      `${CDN}/Balloon/3D/balloon_3d.png`,
  rainbow:      `${CDN}/Rainbow/3D/rainbow_3d.png`,
};

export type PetIconName = keyof typeof ICONS;

type PetIconProps = {
  icon: PetIconName;
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
      style={{ display: 'block', objectFit: 'contain', ...style }}
      draggable={false}
    />
  );
}
