import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const TabsVariantContext = React.createContext<'default' | 'button'>('default');

const tabsListVariants = cva(
  '', // Empty base - no default styles
  {
    variants: {
      variant: {
        default: 'flex items-center justify-start', // Your original styles
        button: 'flex items-center gap-4 justify-start',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const tabsTriggerVariants = cva(
  '', // Empty base - no default styles
  {
    variants: {
      variant: {
        default:
          'inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent py-1.5 text-sm font-medium text-primaryGray ring-offset-background transition-all data-[state=active]:!border-primary data-[state=active]:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', // Your exact original styles
        button:
          'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 gap-3 px-6 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-gray-300 data-[state=active]:border-primary data-[state=active]:bg-primary-muted data-[state=active]:text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface TabsProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  variant?: 'default' | 'button';
}

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsProps
>(({ variant = 'default', children, ...props }, ref) => (
  <TabsVariantContext.Provider value={variant}>
    <TabsPrimitive.Root ref={ref} {...props}>
      {children}
    </TabsPrimitive.Root>
  </TabsVariantContext.Provider>
));
Tabs.displayName = TabsPrimitive.Root.displayName;

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {
  variant?: 'default' | 'button'; // Optional override
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant: variantOverride, ...props }, ref) => {
  const contextVariant = React.useContext(TabsVariantContext);
  const variant = variantOverride || contextVariant;

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variant
          ? tabsListVariants({ variant })
          : 'flex items-center justify-start',
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {
  variant?: 'default' | 'button'; // Optional override
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant: variantOverride, ...props }, ref) => {
  const contextVariant = React.useContext(TabsVariantContext);
  const variant = variantOverride || contextVariant;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        variant
          ? tabsTriggerVariants({ variant })
          : 'inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent py-1.5 text-sm font-medium text-primaryGray ring-offset-background transition-all data-[state=active]:!border-primary data-[state=active]:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsProps, TabsListProps, TabsTriggerProps };
