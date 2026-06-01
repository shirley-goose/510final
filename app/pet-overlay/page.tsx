'use client';

import { Suspense } from 'react';
import CompanionOverlay from '@/components/companion-overlay/CompanionOverlay';

function PetOverlayInner() {
  return <CompanionOverlay standalone iframeMode />;
}

export default function PetOverlayPage() {
  return (
    <Suspense fallback={null}>
      <PetOverlayInner />
    </Suspense>
  );
}
