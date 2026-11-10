import { useEffect, useState } from 'react';
import { ext } from '../../util/browser-api';
import { Button } from '../components/ui/button';
import Notice from './Notice';
import { SetTorrentLabelMessage, type ISetTorrentLabelMessage } from '../../models/messages';
import { deserializeSettings } from '../../util/serializer';
import { requestSerializedSettings } from '../../util/request-settings';
import { EditableComboBox, FormFrame, SubmitError } from './FormFrame';
import { moveToFront } from '../lib/utils';
import { useEditableOptions, useSubmission, type EditableOptions } from '../lib/form-hooks';

interface LabelTarget {
  webUiId: string;
  infoHash: string;
  torrentName: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'ready'; webUiName: string; labelOptions: string[] };

export default function SetLabelView() {
  const [target] = useState(readLabelTarget);
  if (!target) {
    return <InvalidTargetNotice />;
  }
  return <SetLabelLoader target={target} />;
}

function SetLabelLoader({ target }: { target: LabelTarget }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void requestSerializedSettings().then((serialized) => {
      if (cancelled) return;
      const settings = serialized ? deserializeSettings(serialized) : null;
      const webUiSettings = settings?.webuiSettings.find(candidate => candidate.id === target.webUiId);
      setState(webUiSettings
        ? { status: 'ready', webUiName: webUiSettings.name, labelOptions: webUiSettings.labels }
        : { status: 'invalid' });
    });
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (state.status === 'loading') {
    return <Notice title="Remote Torrent Adder">Loading…</Notice>;
  }
  if (state.status === 'invalid') {
    return <InvalidTargetNotice />;
  }
  return <SetLabelForm target={target} webUiName={state.webUiName} initialLabelOptions={state.labelOptions} />;
}

function InvalidTargetNotice() {
  return <Notice title="Nothing to label" tone="error">This torrent or its WebUI could not be found.</Notice>;
}

interface SetLabelFormProps {
  target: LabelTarget;
  webUiName: string;
  initialLabelOptions: string[];
}

function SetLabelForm({ target, webUiName, initialLabelOptions }: SetLabelFormProps) {
  const labels = useEditableOptions(initialLabelOptions[0] ?? '', initialLabelOptions);
  const { submitting, submitError, submit } = useSubmission(
    'Failed setting the label',
    () => sendSetLabel(target, labels),
  );
  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (labels.value && !submitting) void submit();
  };

  return (
    <FormFrame title="Add label" subtitle={`${target.torrentName} in ${webUiName}`}>
      <form className="flex items-end gap-2" onSubmit={onSubmit}>
        <EditableComboBox className="flex-1" label="Label" field={labels} placeholder="Select or type label..." />
        <Button type="submit" disabled={submitting || !labels.value}>
          {submitting ? 'Setting…' : 'Set label'}
        </Button>
      </form>
      <SubmitError message={submitError} />
    </FormFrame>
  );
}

async function sendSetLabel(target: LabelTarget, labels: EditableOptions): Promise<void> {
  const message: ISetTorrentLabelMessage = {
    action: SetTorrentLabelMessage.action,
    ...target,
    label: labels.value,
    labels: moveToFront(labels.value, labels.options),
  };
  const response = await ext.runtime.sendMessage(message);
  if (response && typeof response === 'object' && 'error' in response) {
    throw new Error(String(response.error));
  }
}

function readLabelTarget(): LabelTarget | undefined {
  const params = new URLSearchParams(window.location.search);
  const webUiId = params.get('webUiId');
  const infoHash = params.get('infoHash');
  if (!webUiId || !infoHash) {
    return undefined;
  }
  return { webUiId, infoHash, torrentName: params.get('torrentName') ?? infoHash };
}
