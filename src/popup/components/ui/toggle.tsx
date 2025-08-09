import * as React from "react"
import { cn } from "../../lib/utils"

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
  disabled?: boolean
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, label, className, disabled = false }, ref) => {
    const handleToggle = () => {
      if (!disabled) {
        onChange(!checked)
      }
    }

    return (
      <div className={cn("flex items-center space-x-3", className)}>
        {label && (
          <span
            className="block text-sm font-medium text-foreground cursor-pointer select-none"
            onClick={handleToggle}
            tabIndex={0}
            role="button"
            aria-pressed={checked}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            }}
          >
            {label}
          </span>
        )}
        <button
          ref={ref}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            checked
              ? "bg-primary"
              : "bg-input"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
              checked ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>
    )
  }
)

Toggle.displayName = "Toggle"

export { Toggle }
