import { useEffect } from "react";
import { SEARCH_MIN_CHAR } from "../../settings";
import { useBoundStore } from "../../tui/store";
import Chips from "./chips";
import Results from "./results";

export default function App() {
  const s = useBoundStore();
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
        </form>
        <Chips />
      </header>
      <main>
        <Results />
      </main>
      {s.warningMessage && <div className="toast">{s.warningMessage}</div>}
    </>
  );
}
