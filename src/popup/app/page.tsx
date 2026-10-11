import { useEffect, useState } from 'react';
import { ComboBox } from '../components/ui/combobox';
import { Button } from '../components/ui/button';
import { Toggle } from '../components/ui/toggle';
import Notice from './Notice';
import WebUiPickerView from './WebUiPickerView';
import PageLinksView from './PageLinksView';
import { loadPopupData, submitTorrent, type PopupData } from '../popup-data';
import { type ClientSpecificSettingDescriptor } from '../../models/webui';

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

type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; data: PopupData };

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
  const label = useRemovableChoice(data.initial.label, data.labelOptions);
  const directory = useRemovableChoice(data.initial.directory, data.directoryOptions);
  const [paused, setPaused] = useState(data.initial.paused);
  const [clientSpecific, setClientSpecific] = useState(data.clientSpecific.initial);
  const submission = useSubmission(() => submitTorrent({
    webUiId: data.webUiSettings.id,
    label: label.value,
    directory: directory.value,
    paused,
    clientSpecific,
    // Whatever was just used moves to the front, so it is offered first next time.
    labelOptions: moveToFront(label.value, label.options),
    directoryOptions: moveToFront(directory.value, directory.options),
  }));

  return (
    <FormFrame torrentName={data.torrent.name}>
      {data.supports.label && (
        <ChoiceField label="Label" choice={label} highlighted={data.auto.label} placeholder="Select or type label..." />
      )}
      {data.supports.directory && (
        <ChoiceField label="Directory" choice={directory} highlighted={data.auto.directory} placeholder="Select or type directory..." />
      )}
      {data.supports.paused && (
        <Toggle label="Start Paused" checked={paused} onChange={setPaused} />
      )}
      <ClientSpecificToggles descriptors={data.clientSpecific.descriptors} values={clientSpecific} onChange={setClientSpecific} />
      <SubmitControls submission={submission} />
    </FormFrame>
  );
}

interface RemovableChoice {
  value: string;
  setValue: (value: string) => void;
  options: string[];
  removeOption: (option: string) => void;
}

function useRemovableChoice(initialValue: string, initialOptions: string[]): RemovableChoice {
  const [value, setValue] = useState(initialValue);
  const [options, setOptions] = useState(initialOptions);

  const removeOption = (option: string) => {
    setOptions(previous => previous.filter(entry => entry !== option));
    if (value === option) setValue('');
  };

  return { value, setValue, options, removeOption };
}

interface Submission {
  submitting: boolean;
  error: string | null;
  submit: () => Promise<void>;
}

function useSubmission(send: () => Promise<void>): Submission {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await send();
      window.close();
    } catch (failure: unknown) {
      console.error('Failed adding the torrent', failure);
      setError(errorMessage(failure));
      setSubmitting(false);
    }
  };

  return { submitting, error, submit };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function moveToFront(value: string, options: string[]): string[] {
  return value ? [value, ...options.filter(option => option !== value)] : options;
}

function FormFrame({ torrentName, children }: { torrentName: string; children: React.ReactNode }) {
  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Remote Torrent Adder</h1>
          <p className="text-xs text-muted-foreground mt-1">{torrentName}</p>
        </div>

        <div className="space-y-3 bg-card p-4 rounded-lg border border-border shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ChoiceFieldProps {
  label: string;
  choice: RemovableChoice;
  highlighted: boolean;
  placeholder: string;
}

function ChoiceField({ label, choice, highlighted, placeholder }: ChoiceFieldProps) {
  return (
    <ComboBox
      label={label}
      value={choice.value}
      onChange={choice.setValue}
      onRemoveOption={choice.removeOption}
      options={choice.options}
      rainbowOutline={highlighted}
      placeholder={placeholder}
    />
  );
}

interface ClientSpecificTogglesProps {
  descriptors: ReadonlyArray<ClientSpecificSettingDescriptor>;
  values: Record<string, boolean>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

function ClientSpecificToggles({ descriptors, values, onChange }: ClientSpecificTogglesProps) {
  return (
    <>
      {descriptors.map(descriptor => (
        <Toggle
          key={descriptor.key}
          label={descriptor.label}
          checked={values[descriptor.key] ?? descriptor.default}
          onChange={value => onChange(previous => ({ ...previous, [descriptor.key]: value }))}
        />
      ))}
    </>
  );
}

function SubmitControls({ submission }: { submission: Submission }) {
  return (
    <>
      {submission.error && (
        <p role="alert" className="text-xs text-destructive">{submission.error}</p>
      )}

      <Button
        onClick={() => void submission.submit()}
        disabled={submission.submitting}
        className="w-full"
        variant="default"
        size="default"
      >
        {submission.submitting ? 'Adding…' : 'Add Torrent'}
      </Button>
    </>
  );
}
