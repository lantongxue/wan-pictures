import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Label } from './label';

const fieldSetVariants = cva('flex flex-col gap-4');

const FieldSet = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => (
  <fieldset ref={ref} className={cn(fieldSetVariants(), className)} {...props} />
));
FieldSet.displayName = 'FieldSet';

const FieldLegend = React.forwardRef<
  HTMLLegendElement,
  React.HTMLAttributes<HTMLLegendElement>
>(({ className, ...props }, ref) => (
  <legend
    ref={ref}
    className={cn('text-xs font-semibold tracking-wide text-foreground', className)}
    {...props}
  />
));
FieldLegend.displayName = 'FieldLegend';

const fieldGroupVariants = cva('flex flex-col gap-3.5');

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(fieldGroupVariants(), className)} {...props} />
));
FieldGroup.displayName = 'FieldGroup';

const fieldVariants = cva('flex flex-col gap-1.5', {
  variants: {
    orientation: {
      vertical: 'flex-col gap-1.5',
      horizontal: 'flex-row items-center justify-between gap-3',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

export interface FieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fieldVariants> {}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
);
Field.displayName = 'Field';

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label> & {
    required?: boolean;
  }
>(({ className, children, required, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn('text-xs font-medium text-foreground flex items-center gap-1', className)}
    {...props}
  >
    {children}
    {required && (
      <span className="text-destructive font-normal" aria-hidden="true">
        *
      </span>
    )}
  </Label>
));
FieldLabel.displayName = 'FieldLabel';

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-[11px] text-muted-foreground leading-normal', className)}
    {...props}
  />
));
FieldDescription.displayName = 'FieldDescription';

const FieldError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) return null;
  return (
    <p
      ref={ref}
      role="alert"
      className={cn(
        'text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
});
FieldError.displayName = 'FieldError';

const FieldContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex-1 min-w-0', className)} {...props} />
));
FieldContent.displayName = 'FieldContent';

const FieldSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn('h-px w-full bg-border/60 my-1', className)}
    {...props}
  />
));
FieldSeparator.displayName = 'FieldSeparator';

export {
  Field,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldContent,
  FieldSeparator,
};
