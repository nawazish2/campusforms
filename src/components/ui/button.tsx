import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-ballpoint-600 text-white shadow-sm hover:brightness-110 active:brightness-95',
        secondary:
          'border border-ink/10 bg-card text-ink shadow-sm hover:bg-ink/[0.03] active:bg-ink/[0.06]',
        ghost: 'text-ink/70 hover:bg-ink/[0.05] hover:text-ink',
        'danger-ghost':
          'text-red-600 hover:bg-red-50',
        danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        'tick': 'bg-tick text-white shadow-sm hover:bg-tick/90',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
