import { useEffect, useState } from "react";
import { SEARCH_MIN_CHAR } from "../../settings";
import { useBoundStore } from "../../tui/store";
import Chips from "./chips";
import Downloads from "./downloads";
import Results from "./results";
import Settings from "./settings";
import { DOWNLOADS, SETTINGS, SVG } from "../icons";
import { getLanguage } from "../storage";

export default function App() {
  const s = useBoundStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const running = s.inDownloadQueueEntryIds.length;
  let view = <Results />;
  if (showDownloads) {
    view = <Downloads />;
  }
  useEffect(() => {
    const store = useBoundStore.getState();
    useBoundStore.setState({ userConfig: { ...store.userConfig, language: getLanguage() } });
    void useBoundStore.getState().fetchConfig();
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
    setShowDownloads(false);
    void s.handleSearchSubmit();
  };

  return (
    <>
      <header>
        {/* its own row, so the search field gets the full width */}
        <nav className="toolbar">
          <span className="brand">libgen-dl</span>
          <div className="actions">
            <button
              type="button"
              className="ghost"
              aria-label="Downloads"
              aria-pressed={showDownloads}
              onClick={() => setShowDownloads(!showDownloads)}
            >
              <svg {...SVG}>{DOWNLOADS}</svg>
              {running > 0 && <span className="count">{running}</span>}
            </button>
            <button
              type="button"
              className="ghost"
              aria-label="Settings"
              aria-pressed={showSettings}
              onClick={() => setShowSettings(!showSettings)}
            >
              <svg {...SVG}>{SETTINGS}</svg>
            </button>
          </div>
        </nav>
        <form onSubmit={submit}>
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Search LibGen"
            value={s.searchValue}
            onChange={(event) => s.setSearchValue(event.target.value)}
          />
          <button disabled={s.searchValue.length < SEARCH_MIN_CHAR || !s.mirrorAdapter}>Go</button>
        </form>
        <Chips />
      </header>
      <main>
        {showSettings && <Settings />}
        {view}
      </main>
      {s.warningMessage && <div className="toast">{s.warningMessage}</div>}
    </>
  );
}
