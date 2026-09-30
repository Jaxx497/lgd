import { useEffect, useState } from "react";
import { SEARCH_MIN_CHAR } from "../../settings";
import { useBoundStore } from "../../tui/store";
import Chips from "./chips";
import Downloads from "./downloads";
import Results from "./results";
import Settings from "./settings";
import { DOWNLOADS, SETTINGS, SVG } from "../icons";
import { getLanguage } from "../storage";

type Page = "results" | "downloads" | "settings";

export default function App() {
  const s = useBoundStore();
  // One page at a time; the toolbar icon of the open page takes you back to the results.
  const [page, setPage] = useState<Page>("results");
  const toggle = (next: Page) => {
    if (page === next) {
      setPage("results");
      return;
    }
    setPage(next);
  };
  const running = s.inDownloadQueueEntryIds.length;
  let view = <Results />;
  if (page === "downloads") {
    view = (
      <>
        <h1 className="page-title">Downloads</h1>
        <Downloads />
      </>
    );
  }
  if (page === "settings") {
    view = (
      <>
        <h1 className="page-title">Settings</h1>
        <Settings />
      </>
    );
  }
  useEffect(() => {
    const store = useBoundStore.getState();
    useBoundStore.setState({ userConfig: { ...store.userConfig, language: getLanguage() } });
    void useBoundStore.getState().fetchConfig();
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
    setPage("results");
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
              aria-pressed={page === "downloads"}
              onClick={() => toggle("downloads")}
            >
              <svg {...SVG}>{DOWNLOADS}</svg>
              {running > 0 && <span className="count">{running}</span>}
            </button>
            <button
              type="button"
              className="ghost"
              aria-label="Settings"
              aria-pressed={page === "settings"}
              onClick={() => toggle("settings")}
            >
              <svg {...SVG}>{SETTINGS}</svg>
            </button>
          </div>
        </nav>
        {page === "results" && (
          <>
            <form onSubmit={submit}>
              <input
                type="search"
                enterKeyHint="search"
                placeholder="Search LibGen"
                value={s.searchValue}
                onChange={(event) => s.setSearchValue(event.target.value)}
              />
              <button disabled={s.searchValue.length < SEARCH_MIN_CHAR || !s.mirrorAdapter}>
                Go
              </button>
            </form>
            <Chips />
          </>
        )}
      </header>
      <main>{view}</main>
      {s.warningMessage && <div className="toast">{s.warningMessage}</div>}
    </>
  );
}
