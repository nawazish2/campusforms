import type { CSSProperties, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NoticeSlipProps {
  tilt?: number;
  fastener?: 'pin' | 'tape' | 'none';
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  as?: ElementType;
}

/** A paper slip held by a pin or tape. Tilts slightly; straightens on hover. */
export function NoticeSlip({
  tilt = 0,
  fastener = 'none',
  className,
  style,
  children,
  as: Tag = 'div',
}: NoticeSlipProps) {
  return (
    <Tag
      className={cn(
        'slip notice-slip',
        fastener === 'pin' && 'slip-pin',
        fastener === 'tape' && 'slip-tape',
        className
      )}
      style={{ rotate: `${tilt}deg`, ...style }}
    >
      {children}
    </Tag>
  );
}
