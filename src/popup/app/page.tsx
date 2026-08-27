import { useEffect, useState } from 'react';
import { ComboBox } from '../components/ui/combobox';
import { Button } from '../components/ui/button';
import { Toggle } from '../components/ui/toggle';
import Notice from './Notice';
import WebUiPickerView from './WebUiPickerView';
import PageLinksView from './PageLinksView';
import { loadPopupData, submitTorrent, type PopupData } from '../popup-data';

type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; data: PopupData };

export default function Home() {
  const mode = new URLSearchParams(window.location.search).get('mode');
  if (mode === 'picker') {
    return <WebUiPickerView />;
  }
  if (mode === 'links') {
    return <PageLinksView />;
  }

  return <BufferedTorrentForm />;
}

function BufferedTorrentForm() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadPopupData()
      .then(data => {
        if (cancelled) return;
        setState(data ? { status: 'ready', data } : { status: 'empty' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed loading the pending torrent', error);
        setState({ status: 'failed', message: errorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return <Notice title="Remote Torrent Adder">Loading…</Notice>;
  }
  if (state.status === 'empty') {
    return <Notice title="Nothing to add">No torrent is waiting to be added.</Notice>;
  }
  if (state.status === 'failed') {
    return <Notice title="Could not load the torrent" tone="error">{state.message}</Notice>;
  }
  return <AddTorrentForm data={state.data} />;
}

// The form only mounts once the data exists, so every field can be initialised
// straight from it and no value is ever asserted non-null.
function AddTorrentForm({ data }: { data: PopupData }) {
  const [label, setLabel] = useState(data.initial.label);
  const [directory, setDirectory] = useState(data.initial.directory);
  const [paused, setPaused] = useState(data.initial.paused);
  const [clientSpecific, setClientSpecific] = useState(data.clientSpecific.initial);
  const [labelOptions, setLabelOptions] = useState(data.labelOptions);
  const [directoryOptions, setDirectoryOptions] = useState(data.directoryOptions);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitTorrent({
        webUiId: data.webUiSettings.id,
        label,
        directory,
        paused,
        clientSpecific,
        // Whatever was just used moves to the front, so it is offered first next time.
        labelOptions: moveToFront(label, labelOptions),
        directoryOptions: moveToFront(directory, directoryOptions),
      });
      window.close();
    } catch (error: unknown) {
      console.error('Failed adding the torrent', error);
      setSubmitError(errorMessage(error));
      setSubmitting(false);
    }
  };

  const removeLabel = (option: string) => {
    setLabelOptions(previous => previous.filter(entry => entry !== option));
    if (label === option) setLabel('');
  };

  const removeDirectory = (option: string) => {
    setDirectoryOptions(previous => previous.filter(entry => entry !== option));
    if (directory === option) setDirectory('');
  };

  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Remote Torrent Adder</h1>
          <p className="text-xs text-muted-foreground mt-1">{data.torrent.name}</p>
        </div>

        <div className="space-y-3 bg-card p-4 rounded-lg border border-border shadow-sm">
          {data.supports.label && (
            <ComboBox
              label="Label"
              value={label}
              onChange={setLabel}
              onRemoveOption={removeLabel}
              options={labelOptions}
              autoGlow={data.auto.label}
              placeholder="Select or type label..."
            />
          )}

          {data.supports.directory && (
            <ComboBox
              label="Directory"
              value={directory}
              onChange={setDirectory}
              onRemoveOption={removeDirectory}
              options={directoryOptions}
              autoGlow={data.auto.directory}
              placeholder="Select or type directory..."
            />
          )}

          {data.supports.paused && (
            <Toggle label="Start Paused" checked={paused} onChange={setPaused} />
          )}

          {data.clientSpecific.descriptors.map(descriptor => (
            <Toggle
              key={descriptor.key}
              label={descriptor.label}
              checked={clientSpecific[descriptor.key] ?? descriptor.default}
              onChange={value => setClientSpecific(previous => ({ ...previous, [descriptor.key]: value }))}
            />
          ))}

          {submitError && (
            <p role="alert" className="text-xs text-destructive">{submitError}</p>
          )}

          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full"
            variant="default"
            size="default"
          >
            {submitting ? 'Adding…' : 'Add Torrent'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function moveToFront(value: string, options: string[]): string[] {
  return value ? [value, ...options.filter(option => option !== value)] : options;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
