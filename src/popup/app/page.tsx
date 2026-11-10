import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Toggle } from '../components/ui/toggle';
import Notice from './Notice';
import WebUiPickerView from './WebUiPickerView';
import PageLinksView from './PageLinksView';
import SetLabelView from './SetLabelView';
import { EditableComboBox, FormFrame, SubmitError } from './FormFrame';
import { errorMessage, moveToFront } from '../lib/utils';
import { useEditableOptions, useSubmission } from '../lib/form-hooks';
import { loadPopupData, submitTorrent, type AddTorrentRequest, type PopupData } from '../popup-data';

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
  if (mode === 'label') {
    return <SetLabelView />;
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
  const options = useTorrentOptions(data);
  const { submitting, submitError, submit } = useSubmission(
    'Failed adding the torrent',
    () => submitTorrent(options.toRequest()),
  );

  return (
    <FormFrame title="Remote Torrent Adder" subtitle={data.torrent.name}>
      <ComboBoxFields data={data} options={options} />
      <ToggleFields data={data} options={options} />
      <SubmitError message={submitError} />
      <Button onClick={() => void submit()} disabled={submitting} className="w-full">
        {submitting ? 'Adding…' : 'Add Torrent'}
      </Button>
    </FormFrame>
  );
}

type TorrentOptions = ReturnType<typeof useTorrentOptions>;

function useTorrentOptions(data: PopupData) {
  const labels = useEditableOptions(data.initial.label, data.labelOptions);
  const directories = useEditableOptions(data.initial.directory, data.directoryOptions);
  const [paused, setPaused] = useState(data.initial.paused);
  const [clientSpecific, setClientSpecific] = useState(data.clientSpecific.initial);
  const toRequest = (): AddTorrentRequest => ({
    webUiId: data.webUiSettings.id,
    label: labels.value,
    directory: directories.value,
    paused,
    clientSpecific,
    // Whatever was just used moves to the front, so it is offered first next time.
    labelOptions: moveToFront(labels.value, labels.options),
    directoryOptions: moveToFront(directories.value, directories.options),
  });
  return { labels, directories, paused, setPaused, clientSpecific, setClientSpecific, toRequest };
}

interface FieldsProps {
  data: PopupData;
  options: TorrentOptions;
}

function ComboBoxFields({ data, options }: FieldsProps) {
  return (
    <>
      {data.supports.label && (
        <EditableComboBox label="Label" field={options.labels} rainbowOutline={data.auto.label}
          placeholder="Select or type label..." />
      )}
      {data.supports.directory && (
        <EditableComboBox label="Directory" field={options.directories} rainbowOutline={data.auto.directory}
          placeholder="Select or type directory..." />
      )}
    </>
  );
}

function ToggleFields({ data, options }: FieldsProps) {
  return (
    <>
      {data.supports.paused && (
        <Toggle label="Start Paused" checked={options.paused} onChange={options.setPaused} />
      )}
      {data.clientSpecific.descriptors.map(descriptor => (
        <Toggle
          key={descriptor.key}
          label={descriptor.label}
          checked={options.clientSpecific[descriptor.key] ?? descriptor.default}
          onChange={value => options.setClientSpecific(previous => ({ ...previous, [descriptor.key]: value }))}
        />
      ))}
    </>
  );
}
