import { useEffect, useState } from "react";
import { SEARCH_MIN_CHAR } from "../../settings";
import { useBoundStore } from "../../tui/store";
import Chips from "./chips";
import Downloads from "./downloads";
import Results from "./results";
import Settings from "./settings";
import { getTheme, setTheme, type Theme } from "../theme";

const OTHER: Record<Theme, Theme> = { light: "dark", dark: "light" };
// Words, not icons: on e-ink a gear and a sun look alike next to a moon.
const LABEL: Record<Theme, string> = { light: "Dark", dark: "Light" };

export default function App() {
  const s = useBoundStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const running = s.inDownloadQueueEntryIds.length;
  let view = <Results />;
  if (showDownloads) {
    view = <Downloads />;
  }
  let downloadsLabel = "Downloads";
  if (running > 0) {
    downloadsLabel += ` (${running})`;
  }
  const [theme, setThemeState] = useState<Theme>(getTheme());

  // The button shows the theme you would switch to.
  const toggleTheme = () => {
    setTheme(OTHER[theme]);
    setThemeState(OTHER[theme]);
  };
  useEffect(() => {
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
          <button
            type="button"
            className="ghost"
            aria-pressed={showDownloads}
            onClick={() => setShowDownloads(!showDownloads)}
          >
            {downloadsLabel}
          </button>
          <button
            type="button"
            className="ghost"
            aria-label={`Switch to ${OTHER[theme]} mode`}
            onClick={toggleTheme}
          >
            {LABEL[theme]}
          </button>
          <button
            type="button"
            className="ghost"
            aria-pressed={showSettings}
            onClick={() => setShowSettings(!showSettings)}
          >
            Settings
          </button>
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
