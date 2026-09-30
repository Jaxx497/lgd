import { Text } from "ink";
import type { Hint } from "../layouts/hints";

export function KeyHints({ hints }: { hints: Hint[] }) {
  return (
    <Text wrap="truncate-end">
      {hints.map(([key, label], index) => (
        <Text key={key}>
          {index > 0 && "   "}
          <Text color="cyanBright" bold>
            {key}
          </Text>
          <Text color="gray"> {label}</Text>
        </Text>
      ))}
    </Text>
  );
}
