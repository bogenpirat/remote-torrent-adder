import { useEffect, useState } from 'react';
import Notice from './Notice';
import {
  GetPageLinksMessage,
  PreAddTorrentMessage,
  type IPageLinkInfo,
  type IPageLinksResponse,
  type IPreAddTorrentMessage,
} from '../../models/messages';

type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; links: IPageLinkInfo[] };

export default function PageLinksView() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [sourceTab, setSourceTab] = useState<{ tabId: number; pageUrl: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          if (!cancelled) setState({ status: 'empty' });
          return;
        }
        if (!cancelled) setSourceTab({ tabId: tab.id, pageUrl: tab.url ?? null });
        const response = (await chrome.tabs.sendMessage(tab.id, GetPageLinksMessage, { frameId: 0 })) as
          | IPageLinksResponse
          | undefined;
        if (cancelled) return;
        const links = response?.links ?? [];
        setState(links.length ? { status: 'ready', links } : { status: 'empty' });
      } catch (error: unknown) {
        if (cancelled) return;
        console.error('Failed loading page links', error);
        setState({ status: 'error', message: 'Could not scan this page for links.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addLink = (url: string) => {
    chrome.runtime.sendMessage({
      action: PreAddTorrentMessage.action,
      url,
      tabId: sourceTab?.tabId ?? null,
      frameId: 0,
      pageUrl: sourceTab?.pageUrl ?? null,
    } as IPreAddTorrentMessage);
    window.close();
  };

  if (state.status === 'loading') {
    return <Notice title="Remote Torrent Adder">Scanning page…</Notice>;
  }
  if (state.status === 'empty') {
    return <Notice title="No links found">No torrent or magnet links were found on this page.</Notice>;
  }
  if (state.status === 'error') {
    return (
      <Notice title="Could not scan this page" tone="error">
        {state.message}
      </Notice>
    );
  }

  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Links found on this page</h1>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {state.links.map(link => (
            <button
              key={link.url}
              onClick={() => addLink(link.url)}
              className="w-full text-left bg-card p-3 rounded-lg border border-border shadow-sm hover:bg-accent transition-colors"
            >
              <span className="block font-medium text-foreground truncate">{link.label}</span>
              <span className="block text-xs text-muted-foreground truncate">{link.url}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
