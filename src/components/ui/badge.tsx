import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

export enum BadgeSizes {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

const sizeVariants = {
  [BadgeSizes.SMALL]: 'text-xs px-2 py-1',
  [BadgeSizes.MEDIUM]: 'text-sm px-4 py-2',
  [BadgeSizes.LARGE]: 'text-md px-5 py-3',
};
const badgeVariants = cva(
  'inline-flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-[0.5px] rounded-[6px] text-xs font-medium leading-[20px] py-1 px-3 [&>span.dot]:h-1.5 [&>span.dot]:w-1.5 [&>span.dot]:rounded-full [&>span.dot]:mr-2 capitalize',
  {
    variants: {
      variant: {
        default: 'border-0 text-primary bg-primaryHoverMenu !font-semibold',
        greenish:
          'border-[#A6D092] text-[#547544] bg-[#DEFFCF] [&>span.dot]:bg-[#A6D092]',
        bluish:
          'border-primary text-primary bg-[#E3EDFE] [&>span.dot]:bg-[#0062FF]',
        brownish:
          'border-[#D8B283] text-[#825D30] bg-[#FFE6C8] [&>span.dot]:bg-[#D8B283]',
        yellowish:
          'border-[#C7C080] text-[#726D41] bg-[#FFFACC] [&>span.dot]:bg-[#C7C080]',
        reddish:
          'border-[#D38282] text-[#843838] bg-[#FFDADA] [&>span.dot]:bg-[#D38282]',
        grayish:
          'border-[#7F8596] text-[#7F8596] bg-[#FCFCFC] [&>span.dot]:bg-[#7F8596]',
        orangy:
          'border-[#D8B283] text-[#825D30] bg-[#FFE6C8] [&>span.dot]:bg-[#D8B283]',
        purplish:
          'border-[#A020F0] text-[#A020F0] bg-[#f3e9ff] [&>span.dot]:bg-[#A020F0]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  withDot?: boolean;
  itemsStart?: boolean;
  size?: BadgeSizes;
}

function Badge({
  className,
  variant,
  withDot = false,
  itemsStart = false,
  size,
  children,
  ...rest
}: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        sizeVariants[size || BadgeSizes.MEDIUM],
        className,
      )}
      {...rest}
    >
      {withDot && (
        <span
          className={cn('dot flex-[0_0_6px]', itemsStart && 'mt-[7px]')}
        ></span>
      )}
      {children}
    </div>
  );
}
const driverbdriveBadgeVariants = cva(
  'inline-flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-[0.5px] rounded-[6px] text-xs font-medium leading-[20px] py-1 px-3 [&>span.dot]:h-1.5 [&>span.dot]:w-1.5 [&>span.dot]:rounded-full [&>span.dot]:mr-2 capitalize',
  {
    variants: {
      variant: {
        default: 'border-0 text-primary bg-primaryHoverMenu !font-semibold',
        greenish: 'border-[#A6D092] text-[#547544] bg-[#DEFFCF]',
        bluish: 'border-primary text-primary bg-[#E3EDFE]',
        brownish: 'border-[#D8B283] text-[#825D30] bg-[#FFE6C8]',
        yellowish: 'border-[#C7C080] text-[#726D41] bg-[#FFFACC]',
        reddish: 'border-[#D38282] text-[#843838] bg-[#FFDADA] ',
        grayish: 'border-[#7F8596] text-[#7F8596] bg-[#FCFCFC]',
        orangy: 'border-[#D8B283] text-[#825D30] bg-[#FFE6C8]',
        purplish: 'border-[#A020F0] text-[#A020F0] bg-[#f3e9ff]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export const DriverStatusBadge = ({
  className,
  variant,
  dotColor,
  withDot = false,
  itemsStart = false,
  children,
  ...rest
}: BadgeProps & { dotColor?: string }) => {
  const status = children
    ?.toString()
    ?.split(/(?=[A-Z])/)
    .join('-');

  return (
    <div
      className={cn(driverbdriveBadgeVariants({ variant }), className)}
      {...rest}
    >
      <span>{status}</span>
      {withDot && (
        <span
          className={cn(
            'dot ml-1 flex-[0_0_6px]',
            itemsStart && 'mt-[7px]',
            dotColor,
          )}
        ></span>
      )}
    </div>
  );
};

function EmployeeStatusBadge({ status }: { status: string }) {
  const variant = React.useMemo(() => {
    switch (status) {
      case 'active':
        return 'greenish';
      case 'terminated':
        return 'orangy';
      case 'suspended':
        return 'reddish';
      case 'restricted':
        return 'orangy';
      case 'dismissed':
        return 'reddish';
      case 'deleted':
        return 'reddish';
      case 'caution':
        return 'yellowish';
      case 'pending':
        return 'orangy';
      default:
        return 'default';
    }
  }, [status]);
  return <Badge variant={variant}>{status}</Badge>;
}

export { Badge, badgeVariants, EmployeeStatusBadge };
