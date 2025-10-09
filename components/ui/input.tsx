import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-[20px] border border-border-hover bg-bg-input px-4 py-3 transition-colors",
          "text-base text-foreground placeholder:text-text-muted",
          "focus-visible:outline-none focus-visible:border-border-focus",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "shadow-sm",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
