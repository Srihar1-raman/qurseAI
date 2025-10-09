import * as React from "react"
import { type VariantProps, cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background rounded-full hover:scale-105 hover:shadow-md transition-transform text-sm font-medium",
        secondary:
          "bg-bg-secondary text-foreground border-border hover:bg-bg-hover hover:border-border-hover border rounded-md",
        ghost: "bg-transparent hover:bg-bg-secondary text-sm font-medium",
        active: "bg-primary text-white border-primary",
      },
      size: {
        default: "h-9 px-3 py-2",
        sm: "h-8 px-2 py-1.5",
        lg: "h-10 px-4 py-2.5",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
