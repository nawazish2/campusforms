import { Badge } from '@/components/ui/badge';
import { CATEGORIES } from '@/lib/constants';
import type { FormCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CategoryBadge({
  category,
  className,
}: {
  category: FormCategory;
  className?: string;
}) {
  const meta = CATEGORIES[category];
  const Icon = meta.icon;
  return (
    <Badge className={cn(meta.badge, className)}>
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </Badge>
  );
}
