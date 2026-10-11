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
  rainbowOutline?: boolean
  ref?: React.Ref<HTMLDivElement>
}

const INPUT_CLASS_NAME = [
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

const OPTION_CLASS_NAME = [
  "flex items-center justify-between px-3 py-2 text-sm cursor-pointer",
  "hover:bg-accent hover:text-accent-foreground transition-colors group",
].join(" ")

interface OptionListProps {
  options: string[]
  onSelect: (option: string) => void
  onRemove?: (option: string) => void
}

function OptionList({ options, onSelect, onRemove }: OptionListProps) {
    const handleRemoveOption = (option: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (onRemove) {
        onRemove(option)
      }
    }

    return (
      <div
        className={cn(
          "absolute z-50 w-full mt-1 max-h-60 overflow-auto",
          // Use theme-aware background and border
          "bg-popover border border-popover shadow-lg rounded-lg"
        )}
      >
        {options.map((option, index) => (
          <div key={index} className={OPTION_CLASS_NAME} onClick={() => onSelect(option)}>
            <span className="flex-1">{option}</span>
            {onRemove && (
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
    )
}

function NewValueMarker() {
    return (
      <div
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 text-sm font-bold"
        title="New value will be added"
      >
        +
      </div>
    )
}

interface Disclosure {
  isOpen: boolean
  open: () => void
  close: () => void
}

function useDisclosure(): Disclosure {
    const [isOpen, setIsOpen] = React.useState(false)
    return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }
}

interface ComboInputProps {
  value: string
  placeholder: string
  rainbowOutline: boolean
  onChange: (value: string) => void
  disclosure: Disclosure
}

function ComboInput({ value, placeholder, rainbowOutline, onChange, disclosure }: ComboInputProps) {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
      disclosure.open()
    }

    return (
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={disclosure.open}
        onBlur={() => setTimeout(disclosure.close, 150)}
        placeholder={placeholder}
        className={cn(INPUT_CLASS_NAME, rainbowOutline && "rainbow-outline")}
      />
    )
}

function ComboBox({
  options, value, onChange, onRemoveOption, placeholder = "Select or type...", label, className, rainbowOutline = false, ref,
}: ComboBoxProps) {
    const disclosure = useDisclosure()

    // Check if current value is a new option (not in the options list)
    const isNewValue = value.trim() !== "" && !options.includes(value.trim())

    const selectOption = (option: string) => {
      onChange(option)
      disclosure.close()
    }

    return (
      <div ref={ref} className={cn("relative w-full", className)}>
        {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}
        <div className="relative">
          <ComboInput value={value} placeholder={placeholder} rainbowOutline={rainbowOutline} onChange={onChange} disclosure={disclosure} />
          {isNewValue && <NewValueMarker />}
        </div>
        {disclosure.isOpen && options.length > 0 && <OptionList options={options} onSelect={selectOption} onRemove={onRemoveOption} />}
      </div>
    )
}

ComboBox.displayName = "ComboBox"

export { ComboBox }
