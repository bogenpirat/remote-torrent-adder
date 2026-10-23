import { useEffect, useState } from 'react';
import { ext } from '../../util/browser-api';
import { ComboBox } from '../components/ui/combobox';
import { Button } from '../components/ui/button';
import Notice from './Notice';
import { SetTorrentLabelMessage, type ISetTorrentLabelMessage } from '../../models/messages';
import { deserializeSettings } from '../../util/serializer';
import { requestSerializedSettings } from '../../util/request-settings';
import { errorMessage, moveToFront } from '../lib/utils';

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

function SetLabelForm({ target, webUiName, initialLabelOptions }: { target: LabelTarget; webUiName: string; initialLabelOptions: string[] }) {
  const [label, setLabel] = useState(initialLabelOptions[0] ?? '');
  const [labelOptions, setLabelOptions] = useState(initialLabelOptions);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const message: ISetTorrentLabelMessage = {
        action: SetTorrentLabelMessage.action,
        ...target,
        label,
        labels: moveToFront(label, labelOptions),
      };
      const response = await ext.runtime.sendMessage(message);
      if (response && typeof response === 'object' && 'error' in response) {
        throw new Error(String(response.error));
      }
      window.close();
    } catch (error: unknown) {
      console.error('Failed setting the label', error);
      setSubmitError(errorMessage(error));
      setSubmitting(false);
    }
  };

  const removeLabel = (option: string) => {
    setLabelOptions(previous => previous.filter(entry => entry !== option));
    if (label === option) setLabel('');
  };

  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Add label</h1>
          <p className="text-xs text-muted-foreground mt-1">{target.torrentName} in {webUiName}</p>
        </div>

        <div className="space-y-3 bg-card p-4 rounded-lg border border-border shadow-sm">
          <form
            className="flex items-end gap-2"
            onSubmit={event => {
              event.preventDefault();
              if (label && !submitting) void handleSubmit();
            }}
          >
            <ComboBox
              className="flex-1"
              label="Label"
              value={label}
              onChange={setLabel}
              onRemoveOption={removeLabel}
              options={labelOptions}
              placeholder="Select or type label..."
            />
            <Button
              type="submit"
              disabled={submitting || !label}
              variant="default"
              size="default"
            >
              {submitting ? 'Setting…' : 'Set label'}
            </Button>
          </form>

          {submitError && (
            <p role="alert" className="text-xs text-destructive">{submitError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function readLabelTarget(): LabelTarget | null {
  const params = new URLSearchParams(window.location.search);
  const webUiId = params.get('webUiId');
  const infoHash = params.get('infoHash');
  if (!webUiId || !infoHash) {
    return null;
  }
  return { webUiId, infoHash, torrentName: params.get('torrentName') ?? infoHash };
}
