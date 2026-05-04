'use client';

import CompanionOverlay from '@/components/companion-overlay/CompanionOverlay';

/**
 * Open as a compact browser window (via “Pop-out” on the overlay) — easier to tuck on screen than a tab.
 */
export default function CompanionPopoutPage() {
  return <CompanionOverlay standalone />;
}
