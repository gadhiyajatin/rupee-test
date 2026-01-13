
'use client';

import { RupeeBookAppWrapper } from '@/components/rupeebook-app';

export default function BookPage() {
    // This page now simply acts as a renderer for the main app wrapper.
    // The wrapper itself, along with the root layout and page.tsx, handles
    // all logic for mobile vs. web, loading states, and data fetching.
    // This simplification resolves potential client-side rendering conflicts.
    return <RupeeBookAppWrapper isMobile={true} />;
}
