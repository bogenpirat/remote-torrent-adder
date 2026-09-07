import { useCallback, useEffect, useState } from "react";
import { ext } from "../../util/browser-api";

const ALL_URLS = { origins: ["<all_urls>"] };

export default function HostPermissionNotice() {
  const [granted, setGranted] = useState(true);

  const check = useCallback(() => {
    ext.permissions
      .contains(ALL_URLS)
      .then(setGranted)
      .catch(() => setGranted(true));
  }, []);

  useEffect(() => {
    check();
    ext.permissions.onAdded.addListener(check);
    ext.permissions.onRemoved.addListener(check);
    return () => {
      ext.permissions.onAdded.removeListener(check);
      ext.permissions.onRemoved.removeListener(check);
    };
  }, [check]);

  if (granted) {
    return null;
  }

  return (
    <div className="rta-notice rta-notice--warning" role="alert">
      <span>
        Remote Torrent Adder cannot access websites, so torrent links will not be caught and your
        clients cannot be reached.
      </span>
      <button
        type="button"
        className="rta-notice__action"
        onClick={() => {
          void ext.permissions.request(ALL_URLS).then(setGranted);
        }}
      >
        Grant access
      </button>
    </div>
  );
}
