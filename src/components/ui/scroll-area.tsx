import * as React from 'react';
import { cn } from '../../lib/utils';

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
ScrollArea.displayName = 'ScrollArea';

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: 'vertical' | 'horizontal' }
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('hidden', className)} {...props} />
));
ScrollBar.displayName = 'ScrollBar';

export { ScrollArea, ScrollBar };

