import { useEffect, useState } from "react";
import { SEARCH_MIN_CHAR } from "../../settings";
import { useBoundStore } from "../../tui/store";
import Chips from "./chips";
import Results from "./results";
import Settings from "./settings";
import { getTheme, setTheme, type Theme } from "../theme";

const OTHER: Record<Theme, Theme> = { light: "dark", dark: "light" };
const ICON: Record<Theme, string> = { light: "☾", dark: "☀" };

export default function App() {
  const s = useBoundStore();
  const [showSettings, setShowSettings] = useState(false);
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
    void s.handleSearchSubmit();
  };

  return (
    <>
      <header>
        <form onSubmit={submit}>
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Search LibGen"
            value={s.searchValue}
            onChange={(event) => s.setSearchValue(event.target.value)}
          />
          <button disabled={s.searchValue.length < SEARCH_MIN_CHAR || !s.mirrorAdapter}>Go</button>
          <button
            type="button"
            className="ghost"
            aria-label={`Switch to ${OTHER[theme]} mode`}
            onClick={toggleTheme}
          >
            {ICON[theme]}
          </button>
          <button
            type="button"
            className="ghost"
            aria-label="Settings"
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙
          </button>
        </form>
        <Chips />
      </header>
      <main>
        {showSettings && <Settings />}
        <Results />
      </main>
      {s.warningMessage && <div className="toast">{s.warningMessage}</div>}
    </>
  );
}
