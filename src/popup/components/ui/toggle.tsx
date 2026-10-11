import * as React from "react"
import { cn } from "../../lib/utils"

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
  disabled?: boolean
  ref?: React.Ref<HTMLButtonElement>
}

const TRACK_CLASS_NAME = [
  "relative inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors",
  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

const THUMB_CLASS_NAME = "inline-block h-4 w-4 transform rounded-full bg-background transition-transform"

interface ToggleLabelProps {
  label: string
  checked: boolean
  onToggle: () => void
}

function ToggleLabel({ label, checked, onToggle }: ToggleLabelProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle();
      }
    }

    return (
      <span
        className="block text-sm font-medium text-foreground cursor-pointer select-none"
        onClick={onToggle}
        tabIndex={0}
        role="button"
        aria-pressed={checked}
        onKeyDown={handleKeyDown}
      >
        {label}
      </span>
    )
}

function Toggle({ checked, onChange, label, className, disabled = false, ref }: ToggleProps) {
    const handleToggle = () => {
      if (!disabled) {
        onChange(!checked)
      }
    }

    return (
      <div className={cn("flex items-center space-x-3", className)}>
        {label && <ToggleLabel label={label} checked={checked} onToggle={handleToggle} />}
        <button
          ref={ref}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(TRACK_CLASS_NAME, checked ? "bg-primary" : "bg-input")}
        >
          <span className={cn(THUMB_CLASS_NAME, checked ? "translate-x-6" : "translate-x-1")} />
        </button>
      </div>
    )
}

Toggle.displayName = "Toggle"

export { Toggle }
