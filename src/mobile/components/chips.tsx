import { useBoundStore } from "../../tui/store";

const TYPES = ["pdf", "epub", "mobi", "djvu"];

const chipClass = (on: boolean) => ["chip", on && "on"].filter(Boolean).join(" ");

export default function Chips() {
  const filter = useBoundStore((s) => s.filter);
  const applyFilter = useBoundStore((s) => s.applyFilter);

  const toggle = (type: string) => {
    if (filter.includes(type)) {
      applyFilter(filter.filter((t) => t !== type));
      return;
    }
    applyFilter([...filter, type]);
  };

  return (
    <div className="chips">
      <button className={chipClass(filter.length === 0)} onClick={() => applyFilter([])}>
        all
      </button>
      {TYPES.map((type) => (
        <button
          key={type}
          className={chipClass(filter.includes(type))}
          onClick={() => toggle(type)}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
