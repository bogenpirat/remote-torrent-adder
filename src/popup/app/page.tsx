import { getTorrentAndSettingsAndFillPopup } from '../chrome-messaging';
import { WebUISettings } from "../../models/webui";
import { useState, useEffect } from 'react';
import { ComboBox } from '../components/ui/combobox';
import { Button } from '../components/ui/button';
import { Toggle } from '../components/ui/toggle';
import { Torrent } from '../../models/torrent';


export type AddTorrentCallback = (webUiId: string, torrent: Torrent, label: string, dir: string, paused: boolean, labelOptions: string[], directoryOptions: string[]) => Promise<void>;

// Initial options
const initialLabelOptions = ['Movies', 'TV Shows', 'Music', 'Games', 'Software', 'Books']
const initialDirectoryOptions = []

export default function Home() {
  const [webUi, setWebUi] = useState(null)
  const [addTorrentCallback, setAddTorrentCallback] = useState<AddTorrentCallback | null>(null);

  const [torrent, setTorrent] = useState<Torrent>(null)

  const [autoLabeled, setAutoLabeled] = useState(false)
  const [autoDir, setAutoDir] = useState(false)

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


  const handleSubmit = () => {
    const augmentedLabels = [label, ...labelOptions.filter(x => x !== label)];
    const augmentedDirectories = [directory, ...directoryOptions.filter(x => x !== directory)];
    addTorrentCallback(webUi.id, torrent, label || null, directory || null, paused || false, augmentedLabels, augmentedDirectories).then(() => {
      window.close();
    });
  }

  // Programmatic setters for external control
  const setFormData: FormControl = {
    torrent: setTorrent,
    label: setLabel,
    directory: setDirectory,
    autoDir: setAutoDir,
    autoLabeled: setAutoLabeled,
    paused: setPaused,
    labelOptions: setLabelOptions,
    directoryOptions: setDirectoryOptions,
    visibility: {
      label: setShowLabel,
      directory: setShowDirectory,
      paused: setShowPaused
    },
    webUiSettings: setWebUi,
    addTorrentCb: (callback: AddTorrentCallback) => {
      setAddTorrentCallback(() => callback);
    }
  }

  // Make setters available globally for external access
  useEffect(() => getTorrentAndSettingsAndFillPopup(setFormData), [])

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
          <p className="text-xs text-muted-foreground mt-1">
            {torrent?.name}
          </p>
        </div>

        <div className="space-y-3 bg-card p-4 rounded-lg border border-border shadow-sm">
          {showLabel && (
            <ComboBox
              label="Label"
              value={label}
              onChange={setLabel}
              onRemoveOption={handleRemoveLabel}
              options={labelOptions}
              rainbowOutline={autoLabeled}
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
              rainbowOutline={autoDir}
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
  torrent: (value: Torrent) => void;
  label: (value: string) => void;
  directory: (value: string) => void;
  paused: (value: boolean) => void;
  autoDir: (value: boolean) => void;
  autoLabeled: (value: boolean) => void;
  labelOptions: (options: string[]) => void;
  directoryOptions: (options: string[]) => void;
  visibility: {
    label: (visible: boolean) => void;
    directory: (visible: boolean) => void;
    paused: (visible: boolean) => void;
  };
  webUiSettings: (webUiSettings: WebUISettings) => void;
  addTorrentCb: (callback: AddTorrentCallback) => void;
}
