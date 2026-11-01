import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import ThreeDotLoader from '../dashboard/utils/loaders/ThreeDotLoader';

const buttonVariants = cva(
  'inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-xs font-medium [&>svg]:text-lg',
  {
    variants: {
      variant: {
        bluish:
          'bg-primary border border-primary text-primary-foreground hover:bg-primary/90',
        whitish:
          'bg-primaryWhite text-primaryGray border border-primaryGray hover:bg-primaryWhite/90',
        grayish:
          'bg-primaryGray text-white border border-primaryGray hover:bg-primaryGray/90',
        redish:
          'bg-danger text-primaryWhite border border-danger hover:bg-danger/90',
        greenish:
          'bg-[#34A853] text-white border border-[#34A853] hover:bg-[#34A853]/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        'outline-primary':
          'border border-primary bg-transparent hover:bg-primary hover:text-white text-primary',
        'outline-reddish':
          'text-danger border border-danger hover:bg-danger/90 hover:text-white',
        'outline-greenish':
          'text-[#11A253] border border-[#11A253] hover:bg-[#11A253]/90 hover:text-white',
        'outline-yellowish':
          'text-[#726D41] border border-[#C7C080]  hover:bg-[#C7C080]/90 hover:text-white',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        icon: 'w-8 h-8 rounded-full border inline-flex items-center justify-center',
        'icon-emphasized': 'text-primary bg-primary/10 hover:bg-primary/20',
      },
      size: {
        default: 'px-3 py-1.5',
        boosted: 'px-4 py-2 text-sm',
        icon: 'h-10 w-10',
      },
    },
    compoundVariants: [
      {
        variant: 'icon',
        className: 'p-0',
      },
    ],
    defaultVariants: {
      variant: 'bluish',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          isLoading ? 'animate-pulse' : '',
          disabled ? 'pointer-events-none cursor-not-allowed  opacity-50' : '',
        )}
        ref={ref}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center">
            Loading
            <ThreeDotLoader />
          </span>
        ) : (
          props.children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
