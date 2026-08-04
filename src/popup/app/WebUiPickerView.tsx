import { useEffect, useState } from 'react';
import Notice from './Notice';
import { WebUIFactory } from '../../models/clients';
import { GetSettingsMessage } from '../../models/messages';
import { deserializeSettings } from '../../util/serializer';
import { addTrailingSlash } from '../../util/utils';

interface WebUiOption {
  id: string;
  name: string;
  url: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; options: WebUiOption[] };

export default function WebUiPickerView() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    chrome.runtime.sendMessage(GetSettingsMessage, (serialized?: string) => {
      if (cancelled) return;
      const settings = serialized ? deserializeSettings(serialized) : null;
      const options: WebUiOption[] = (settings?.webuiSettings ?? [])
        .map(webUiSettings => {
          const webUi = WebUIFactory.createWebUI(webUiSettings);
          if (!webUi) return null;
          return {
            id: webUiSettings.id,
            name: webUiSettings.name || webUi.name,
            url: addTrailingSlash(webUi.createBaseUrl()),
          };
        })
        .filter((option): option is WebUiOption => option !== null);
      setState(options.length ? { status: 'ready', options } : { status: 'empty' });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openWebUi = (url: string) => {
    chrome.tabs.create({ url, active: true });
    window.close();
  };

  if (state.status === 'loading') {
    return <Notice title="Remote Torrent Adder">Loading…</Notice>;
  }
  if (state.status === 'empty') {
    return <Notice title="No WebUIs configured">Add a WebUI in the extension&apos;s options first.</Notice>;
  }

  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Choose a WebUI</h1>
        </div>
        <div className="space-y-2">
          {state.options.map(option => (
            <button
              key={option.id}
              onClick={() => openWebUi(option.url)}
              className="w-full text-left bg-card p-3 rounded-lg border border-border shadow-sm hover:bg-accent transition-colors"
            >
              <span className="block font-medium text-foreground">{option.name}</span>
              <span className="block text-xs text-muted-foreground truncate">{option.url}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
