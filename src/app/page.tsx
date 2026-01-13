
'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { RupeeBookAppWrapper } from '@/components/rupeebook-app';
import { LoadingAnimation } from '@/components/ui/loading-animation';

export default function Home() {
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <LoadingAnimation />
    );
  }
  
  // The RupeeBookAppWrapper now handles both mobile and desktop layouts internally.
  return <RupeeBookAppWrapper isMobile={isMobile} />;
}

    