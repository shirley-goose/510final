'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CompanionOverlay from '@/components/companion-overlay/CompanionOverlay';

function PetOverlayInner() {
  const params = useSearchParams();
  const modelParam = params.get('model');
  const overrideModelUrl = modelParam ? decodeURIComponent(modelParam) : undefined;
  return <CompanionOverlay standalone iframeMode overrideModelUrl={overrideModelUrl} />;
}

export default function PetOverlayPage() {
  return (
    <Suspense fallback={null}>
      <PetOverlayInner />
    </Suspense>
  );
}
