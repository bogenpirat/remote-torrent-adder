import * as React from "react"
import { cn } from "../../lib/utils"

interface ComboBoxProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  onRemoveOption?: (option: string) => void
  placeholder?: string
  label?: string
  className?: string
}

const ComboBox = React.forwardRef<HTMLDivElement, ComboBoxProps>(
  ({ options, value, onChange, onRemoveOption, placeholder = "Select or type...", label, className }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)

    const filteredOptions = options.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    )

    // Check if current value is a new option (not in the options list)
    const isNewValue = value.trim() !== "" && !options.includes(value.trim())

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
      setIsOpen(true)
    }

    const handleOptionSelect = (option: string) => {
      onChange(option)
      setIsOpen(false)
    }

    const handleRemoveOption = (option: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (onRemoveOption) {
        onRemoveOption(option)
      }
    }

    const handleInputFocus = () => {
      setIsOpen(true)
    }

    const handleInputBlur = () => {
      setTimeout(() => setIsOpen(false), 150)
    }

    return (
      <div ref={ref} className={cn("relative w-full", className)}>
        {label && (
          <label className="block text-sm font-medium text-foreground mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {isNewValue && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 text-sm font-bold" title="New value will be added">
              +
            </div>
          )}
        </div>
        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto">
            {filteredOptions.map((option, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors group"
                onClick={() => handleOptionSelect(option)}
              >
                <span className="flex-1">{option}</span>
                {onRemoveOption && (
                  <button
                    onClick={(e) => handleRemoveOption(option, e)}
                    className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                    title="Remove this option"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)

ComboBox.displayName = "ComboBox"

export { ComboBox }
