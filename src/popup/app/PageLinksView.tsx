import { ext, sendMessageAndForget } from '../../util/browser-api';
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

interface SourceTab {
  tabId: number;
  pageUrl: string | null;
}

interface PageScan {
  state: LoadState;
  sourceTab: SourceTab | null;
}

const FAILED_SCAN: PageScan = {
  state: { status: 'error', message: 'Could not scan this page for links.' },
  sourceTab: null,
};

async function scanActiveTab(): Promise<PageScan> {
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { state: { status: 'empty' }, sourceTab: null };
  }
  const response = (await ext.tabs.sendMessage(tab.id, GetPageLinksMessage, { frameId: 0 })) as
    | IPageLinksResponse
    | undefined;
  const links = response?.links ?? [];
  return {
    state: links.length ? { status: 'ready', links } : { status: 'empty' },
    sourceTab: { tabId: tab.id, pageUrl: tab.url ?? null },
  };
}

function usePageScan(): PageScan {
  const [scan, setScan] = useState<PageScan>({ state: { status: 'loading' }, sourceTab: null });

  useEffect(() => {
    let cancelled = false;
    scanActiveTab()
      .then(result => {
        if (!cancelled) setScan(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed loading page links', error);
        setScan(FAILED_SCAN);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return scan;
}

export default function PageLinksView() {
  const { state, sourceTab } = usePageScan();

  const addLink = (url: string) => {
    sendMessageAndForget({
      action: PreAddTorrentMessage.action,
      url,
      tabId: sourceTab?.tabId ?? null,
      frameId: 0,
      pageUrl: sourceTab?.pageUrl ?? null,
    } as IPreAddTorrentMessage);
    window.close();
  };

  if (state.status !== 'ready') {
    return <ScanNotice state={state} />;
  }
  return <LinkList links={state.links} onAdd={addLink} />;
}

function ScanNotice({ state }: { state: Exclude<LoadState, { status: 'ready' }> }) {
  if (state.status === 'loading') {
    return <Notice title="Remote Torrent Adder">Scanning page…</Notice>;
  }
  if (state.status === 'empty') {
    return <Notice title="No links found">No torrent or magnet links were found on this page.</Notice>;
  }
  return (
    <Notice title="Could not scan this page" tone="error">
      {state.message}
    </Notice>
  );
}

function LinkList({ links, onAdd }: { links: IPageLinkInfo[]; onAdd: (url: string) => void }) {
  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Links found on this page</h1>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {links.map(link => (
            <button
              key={link.url}
              onClick={() => onAdd(link.url)}
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
