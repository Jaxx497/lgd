import { LAYOUT_KEY } from "../../tui/layouts/keys";
import { useBoundStore } from "../../tui/store";
import Card from "./card";

export default function Results() {
  const s = useBoundStore();

  if (s.errorMessage) {
    const retry = () => {
      s.setErrorMessage(undefined);
      if (s.mirrorAdapter) {
        void s.handleSearchSubmit();
        return;
      }
      void s.fetchConfig();
    };
    return (
      <div className="note bad">
        {s.errorMessage}
        <div>
          <button className="ghost" onClick={retry}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (s.isLoading) {
    return (
      <div className="note">
        <div className="spin" />
        {s.loaderMessage}
      </div>
    );
  }
  if (s.activeLayout !== LAYOUT_KEY.RESULT_LIST_LAYOUT) {
    return <div className="note">Search for a book or author.</div>;
  }
  if (s.entries.length === 0) {
    return <div className="note">No results.</div>;
  }
  return (
    <>
      {s.entries.map((entry) => (
        <Card key={entry.id} entry={entry} />
      ))}
      <div className="pager">
        <button className="ghost" disabled={s.currentPage === 1} onClick={() => s.prevPage()}>
          ← Prev
        </button>
        <span>Page {s.currentPage}</span>
        <button
          className="ghost"
          disabled={s.nextPageStatus === "unavailable"}
          onClick={() => s.nextPage()}
        >
          Next →
        </button>
      </div>
    </>
  );
}
