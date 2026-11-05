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

type InputProps = Pick<ComboBoxProps, "options" | "value" | "onChange" | "placeholder" | "rainbowOutline"> & {
  baseId: string
  list: ListState
  selectOption: (option: string) => void
}

type ListProps = Pick<ComboBoxProps, "options" | "value" | "onRemoveOption"> & {
  baseId: string
  list: ListState
  selectOption: (option: string) => void
}

interface OptionProps {
  id: string
  option: string
  isSelected: boolean
  isActive: boolean
  onSelect: (option: string) => void
  onRemove?: (option: string) => void
}

interface ListState {
  isVisible: boolean
  activeIndex: number
  open: () => void
  close: () => void
  clearActive: () => void
  move: (step: 1 | -1) => void
}

const LABEL_CLASS = "block text-sm font-medium text-foreground mb-2"

const INPUT_CLASS = [
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

const NEW_VALUE_CLASS = "absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 text-sm font-bold"

const LIST_CLASS = [
  "absolute z-50 w-full mt-1 max-h-60 overflow-auto",
  "bg-popover text-popover-foreground rounded-lg",
  "border border-muted-foreground/30 shadow-lg shadow-black/40",
].join(" ")

const OPTION_CLASS = [
  "flex items-center justify-between px-3 py-2 text-sm cursor-pointer",
  "hover:bg-accent hover:text-accent-foreground transition-colors group",
].join(" ")

const REMOVE_CLASS = [
  "ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100",
  "transition-opacity text-xs font-bold",
].join(" ")

function optionElementId(baseId: string, index: number): string {
  return `${baseId}-option-${index}`
}

function listElementId(baseId: string): string {
  return `${baseId}-listbox`
}

function inputElementId(baseId: string): string {
  return `${baseId}-input`
}

function isNewOption(value: string, options: string[]): boolean {
  return value.trim() !== "" && !options.includes(value.trim())
}

function nextActiveIndex(current: number, step: 1 | -1, optionCount: number): number {
  const start = current === -1 && step === -1 ? 0 : current
  return (start + step + optionCount) % optionCount
}

function useListState(options: string[]): ListState {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const optionCount = options.length

  const move = (step: 1 | -1) => {
    if (optionCount === 0) return
    setIsOpen(true)
    setActiveIndex(current => nextActiveIndex(current, step, optionCount))
  }
  const close = () => {
    setIsOpen(false)
    setActiveIndex(-1)
  }

  return {
    isVisible: isOpen && optionCount > 0,
    activeIndex,
    open: () => setIsOpen(true),
    close,
    clearActive: () => setActiveIndex(-1),
    move,
  }
}

function useScrollActiveIntoView(activeIndex: number): React.RefObject<HTMLDivElement | null> {
  const listRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])
  return listRef
}

function keyHandlers(
  list: ListState,
  options: string[],
  selectOption: (option: string) => void,
): Partial<Record<string, () => void>> {
  const activeOption = list.isVisible ? options[list.activeIndex] : undefined
  return {
    ArrowDown: () => list.move(1),
    ArrowUp: () => list.move(-1),
    Enter: activeOption === undefined ? undefined : () => selectOption(activeOption),
    Escape: list.isVisible ? list.close : undefined,
  }
}

function comboboxAttributes(baseId: string, list: ListState): React.InputHTMLAttributes<HTMLInputElement> {
  const hasActiveOption = list.isVisible && list.activeIndex >= 0
  return {
    id: inputElementId(baseId),
    type: "text",
    role: "combobox",
    autoComplete: "off",
    "aria-autocomplete": "list",
    "aria-expanded": list.isVisible,
    "aria-controls": list.isVisible ? listElementId(baseId) : undefined,
    "aria-activedescendant": hasActiveOption ? optionElementId(baseId, list.activeIndex) : undefined,
  }
}

function inputHandlers(props: InputProps): React.InputHTMLAttributes<HTMLInputElement> {
  const { list, options, onChange, selectOption } = props
  return {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value)
      list.clearActive()
      list.open()
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      const handler = keyHandlers(list, options, selectOption)[event.key]
      if (!handler) return
      event.preventDefault()
      handler()
    },
    onFocus: list.open,
    onClick: list.open,
    onBlur: list.close,
  }
}

function ComboBoxInput(props: InputProps) {
  const { baseId, list, options, value, placeholder = "Select or type...", rainbowOutline = false } = props
  return (
    <div className="relative">
      <input
        {...comboboxAttributes(baseId, list)}
        {...inputHandlers(props)}
        value={value}
        placeholder={placeholder}
        className={cn(INPUT_CLASS, rainbowOutline && "rainbow-outline")}
      />
      {isNewOption(value, options) && (
        <div className={NEW_VALUE_CLASS} title="New value will be added">+</div>
      )}
    </div>
  )
}

function RemoveOptionButton({ option, onRemove }: { option: string; onRemove: (option: string) => void }) {
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onRemove(option)
  }
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={handleClick}
      className={REMOVE_CLASS}
      title="Remove this option"
      aria-label={`Remove ${option}`}
    >
      ×
    </button>
  )
}

function ComboBoxOption({ id, option, isSelected, isActive, onSelect, onRemove }: OptionProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={isSelected}
      className={cn(OPTION_CLASS, isActive && "bg-accent text-accent-foreground")}
      onClick={() => onSelect(option)}
    >
      <span className="flex-1">{option}</span>
      {onRemove && <RemoveOptionButton option={option} onRemove={onRemove} />}
    </div>
  )
}

function ComboBoxList({ baseId, list, options, value, selectOption, onRemoveOption }: ListProps) {
  const listRef = useScrollActiveIntoView(list.activeIndex)
  const removeOption = onRemoveOption && ((option: string) => {
    list.clearActive()
    onRemoveOption(option)
  })
  return (
    <div
      ref={listRef}
      id={listElementId(baseId)}
      role="listbox"
      onMouseDown={(event) => event.preventDefault()}
      className={LIST_CLASS}
    >
      {options.map((option, index) => (
        <ComboBoxOption
          key={index}
          id={optionElementId(baseId, index)}
          option={option}
          isSelected={option === value}
          isActive={index === list.activeIndex}
          onSelect={selectOption}
          onRemove={removeOption}
        />
      ))}
    </div>
  )
}

function ComboBox(props: ComboBoxProps) {
  const { options, onChange, label, className, ref } = props
  const baseId = React.useId()
  const list = useListState(options)
  const selectOption = (option: string) => {
    onChange(option)
    list.close()
  }
  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      {label && (
        <label htmlFor={inputElementId(baseId)} className={LABEL_CLASS}>{label}</label>
      )}
      <ComboBoxInput {...props} baseId={baseId} list={list} selectOption={selectOption} />
      {list.isVisible && <ComboBoxList {...props} baseId={baseId} list={list} selectOption={selectOption} />}
    </div>
  )
}

ComboBox.displayName = "ComboBox"

export { ComboBox }
