import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

// shadcn's Button, with Legará's variants. "brick" is the yellow one with a darker bottom edge
// that presses down, like a brick being pushed onto a stud.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-[15px] font-semibold transition-[background-color,color,box-shadow,transform] duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background hover:bg-foreground/88 active:translate-y-px',
        brick:
          'bg-brick-yellow text-on-yellow shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)] hover:brightness-[1.04] active:translate-y-px active:shadow-[inset_0_-1px_0_rgb(0_0_0/0.18)]',
        outline: 'border border-input bg-background hover:bg-surface active:translate-y-px',
        ghost: 'hover:bg-surface',
        link: 'h-auto px-0 text-link underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
