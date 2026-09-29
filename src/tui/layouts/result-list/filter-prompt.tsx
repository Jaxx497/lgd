import { useState } from "react";
import { Text, useInput } from "ink";
import InkTextInput from "ink-text-input";
import { useBoundStore } from "../../store";
import { parseExtensions } from "../../../user-config";

// `f` on the results list: edit the filetype filter for this session.
export function FilterPrompt() {
  const filter = useBoundStore((state) => state.filter);
  const applyFilter = useBoundStore((state) => state.applyFilter);
  const setIsEditingFilter = useBoundStore((state) => state.setIsEditingFilter);
  const [value, setValue] = useState(filter.join(","));

  useInput((_input, key) => {
    if (key.escape) {
      setIsEditingFilter(false);
    }
  });

  return (
    <Text wrap="truncate-end">
      <Text color="yellow">Filetypes (comma-separated, empty for all): </Text>
      <InkTextInput
        value={value}
        onChange={setValue}
        onSubmit={() => {
          setIsEditingFilter(false);
          applyFilter(parseExtensions(value.split(",")));
        }}
      />
    </Text>
  );
}
