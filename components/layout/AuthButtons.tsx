'use client';

import Link from 'next/link';
import { UnifiedButton } from '@/components/ui/UnifiedButton';

interface AuthButtonsProps {
  callbackUrl: string;
}

export function AuthButtons({ callbackUrl }: AuthButtonsProps) {
  return (
    <div className="hidden md:flex items-center gap-2">
      <Link href={callbackUrl ? `/login?callbackUrl=${callbackUrl}` : '/login'}>
        <UnifiedButton variant="primary">
          Log in
        </UnifiedButton>
      </Link>
      <Link href={callbackUrl ? `/signup?callbackUrl=${callbackUrl}` : '/signup'}>
        <UnifiedButton variant="secondary">
          Sign up
        </UnifiedButton>
      </Link>
    </div>
  );
}

