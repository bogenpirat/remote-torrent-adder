import { getTorrentAndSettingsAndFillPopup } from '../chrome-messaging';
import { useState, useEffect } from 'react';
import { ComboBox } from '../components/ui/combobox';
import { Button } from '../components/ui/button';
import { Toggle } from '../components/ui/toggle';


// Initial options
const initialLabelOptions = ['Movies', 'TV Shows', 'Music', 'Games', 'Software', 'Books']
const initialDirectoryOptions = []

export default function Home() {
  const [label, setLabel] = useState('')
  const [directory, setDirectory] = useState('')
  const [paused, setPaused] = useState(false)

  // Dynamic options state
  const [labelOptions, setLabelOptions] = useState(initialLabelOptions)
  const [directoryOptions, setDirectoryOptions] = useState(initialDirectoryOptions)

  // Visibility controls
  const [showLabel, setShowLabel] = useState(true)
  const [showDirectory, setShowDirectory] = useState(true)
  const [showPaused, setShowPaused] = useState(true)

  const handleSubmit = () => { // TODO
    const data = {
      label: showLabel ? label : undefined,
      directory: showDirectory ? directory : undefined,
      paused: showPaused ? paused : undefined
    }

    console.log('Submit data:', data)
    alert(`Settings: ${JSON.stringify(data, null, 2)}`)
  }

  // Programmatic setters for external control
  const setFormData: FormControl = {
    label: setLabel,
    directory: setDirectory,
    paused: setPaused,
    labelOptions: setLabelOptions,
    directoryOptions: setDirectoryOptions,
    visibility: {
      label: setShowLabel,
      directory: setShowDirectory,
      paused: setShowPaused
    }
  }

  // Make setters available globally for external access (e.g., from Chrome extension)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).remoteAdderControls = setFormData;
      getTorrentAndSettingsAndFillPopup(setFormData);
    }
  }, [])

  const handleRemoveLabel = (optionToRemove: string) => {
    setLabelOptions(prev => prev.filter(option => option !== optionToRemove))
    // Clear selection if the removed option was selected
    if (label === optionToRemove) {
      setLabel('')
    }
  }

  const handleRemoveDirectory = (optionToRemove: string) => {
    setDirectoryOptions(prev => prev.filter(option => option !== optionToRemove))
    // Clear selection if the removed option was selected
    if (directory === optionToRemove) {
      setDirectory('')
    }
  }

  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Remote Torrent Adder</h1>
          <p className="text-xs text-muted-foreground mt-1">Configure your torrent settings</p>
        </div>

        <div className="space-y-3 bg-card p-4 rounded-lg border border-border shadow-sm">
          {showLabel && (
            <ComboBox
              label="Label"
              value={label}
              onChange={setLabel}
              onRemoveOption={handleRemoveLabel}
              options={labelOptions}
              placeholder="Select or type label..."
            />
          )}

          {showDirectory && (
            <ComboBox
              label="Directory"
              value={directory}
              onChange={setDirectory}
              onRemoveOption={handleRemoveDirectory}
              options={directoryOptions}
              placeholder="Select or type directory..."
            />
          )}

          {showPaused && (
            <Toggle
              label="Start Paused"
              checked={paused}
              onChange={setPaused}
            />
          )}

          <Button
            onClick={handleSubmit}
            className="w-full"
            variant="default"
            size="default"
          >
            Add Torrent
          </Button>
        </div>
      </div>
    </div>
  )
}

export interface FormControl {
  label: (value: string) => void;
  directory: (value: string) => void;
  paused: (value: boolean) => void;
  labelOptions: (options: string[]) => void;
  directoryOptions: (options: string[]) => void;
  visibility: {
    label: (visible: boolean) => void;
    directory: (visible: boolean) => void;
    paused: (visible: boolean) => void;
  };
}
