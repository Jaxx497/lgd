import { useState } from "react";
import { getFolder, setFolder, Storage, type Folder } from "../storage";

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
    </div>
  );
}
