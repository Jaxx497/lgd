import { Text } from "ink";

export function KeyHints({ hints }: { hints: string }) {
  return (
    <Text color="gray" wrap="truncate-end">
      {hints}
    </Text>
  );
}
