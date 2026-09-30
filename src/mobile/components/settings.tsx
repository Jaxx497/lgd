import { useEffect, useState } from "react";
import { useBoundStore } from "../../tui/store";
import { fetchNewerVersion, REPO_URL, version } from "../../update";
import { getTheme, setTheme } from "../theme";
import { getFolder, getLanguage, setFolder, setLanguage, Storage, type Folder } from "../storage";

// What LibGen calls them; "" = no preference.
const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Russian",
  "Polish",
  "Dutch",
  "Chinese",
  "Japanese",
];

export default function Settings() {
  const [folder, setChosen] = useState<Folder | undefined>(getFolder());
  const [error, setError] = useState("");

  const choose = async () => {
    setError("");
    try {
      const picked = await Storage.pickFolder();
      setFolder(picked);
      setChosen(picked);
    } catch (pickError) {
      // dismissing the picker rejects too; only say so if it was a real failure
      const message = (pickError as Error).message;
      if (message !== "No folder chosen") {
        setError(message);
      }
    }
  };
  const [language, setChosenLanguage] = useState(getLanguage());
  const chooseLanguage = (value: string) => {
    setLanguage(value);
    setChosenLanguage(value);
    const store = useBoundStore.getState();
    // setState, not setUserConfig: that would also reset the filetype chips
    useBoundStore.setState({ userConfig: { ...store.userConfig, language: value } });
    store.applyFilter(store.filter); // re-lists the current search in the new order
  };
  const [dark, setDark] = useState(getTheme() === "dark");
  const toggleDark = (on: boolean) => {
    if (on) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
    setDark(on);
  };
  const [newer, setNewer] = useState<string>();
  useEffect(() => {
    void fetchNewerVersion().then(setNewer);
  }, []);
  const reset = () => {
    setFolder(undefined);
    setChosen(undefined);
  };

  return (
    <div className="card">
      <div className="title">Download folder</div>
      <div className="authors">{folder?.name ?? "Downloads"}</div>
      <div className="row">
        <button className="ghost" disabled={!folder} onClick={reset}>
          Use Downloads
        </button>
        <button onClick={choose}>Choose folder</button>
      </div>
      {error && <div className="status bad">{error}</div>}
      <div className="title">Preferred language</div>
      <div className="authors">Books in this language are listed first</div>
      <select value={language} onChange={(event) => chooseLanguage(event.target.value)}>
        <option value="">None</option>
        {LANGUAGES.map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
      <label className="switch">
        <span className="title">Dark mode</span>
        <input
          type="checkbox"
          role="switch"
          checked={dark}
          onChange={(event) => toggleDark(event.target.checked)}
        />
      </label>
      <div className="authors">
        libgen-dl v{version}
        {newer && (
          <>
            {" · "}
            <a href={`${REPO_URL}/releases/latest`} target="_blank" rel="noreferrer">
              v{newer} available
            </a>
          </>
        )}
      </div>
    </div>
  );
}
