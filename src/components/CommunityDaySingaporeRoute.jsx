import { lazy, Suspense } from 'react';

const CommunityDaySingaporeApp = lazy(() => import('./CommunityDaySingaporeApp.jsx'));

export default function CommunityDaySingaporeRoute() {
  return (
    <Suspense fallback={null}>
      <CommunityDaySingaporeApp />
    </Suspense>
  );
}
