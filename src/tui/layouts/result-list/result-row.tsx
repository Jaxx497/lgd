import { Box, Text } from "ink";
import type { Entry } from "../../../api/models/entry";
import { cellText, COLUMN_GAP, type ColumnLayout } from "../../helpers/table";
import { shortStatus } from "../../helpers/progress";
import { useBoundStore } from "../../store";

interface Properties {
  entry: Entry;
  rowNumber: number;
  isActive: boolean;
  layout: ColumnLayout[];
}

const STATUS_COLOR: Record<string, string> = { "✓": "green", "✗": "red" };

export function ResultRow({ entry, rowNumber, isActive, layout }: Properties) {
  const status = shortStatus(useBoundStore((state) => state.downloadProgressMap[entry.id]));

  let pointer = "  ";
  let color: string | undefined;
  if (isActive) {
    pointer = "▸ ";
    color = "cyanBright";
  }

  return (
    <Box>
      <Text color={color}>{pointer}</Text>
      {layout.map(({ column, width, alignRight }, index) => {
        let justifyContent: "flex-start" | "flex-end" = "flex-start";
        if (alignRight) {
          justifyContent = "flex-end";
        }
        let marginRight = COLUMN_GAP;
        if (index === layout.length - 1) {
          marginRight = 0;
        }
        let cellColor = color;
        if (column === "ext") {
          cellColor = "green";
        } else if (column === "index" && !isActive) {
          cellColor = "gray";
        }

        return (
          <Box key={column} width={width} marginRight={marginRight} justifyContent={justifyContent}>
            <Text wrap="truncate-end" color={cellColor} bold={isActive}>
              {column === "title" && status && (
                <Text color={STATUS_COLOR[status] ?? "yellow"}>{status} </Text>
              )}
              {cellText(column, entry, rowNumber)}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
