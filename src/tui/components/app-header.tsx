import { Box, Text } from "ink";
import figures from "figures";
import { useBoundStore } from "../store";
import { APP_VERSION } from "../../index";

export function AppHeader() {
  const mirrorAdapter = useBoundStore((state) => state.mirrorAdapter);

  return (
    <Box paddingY={1} flexDirection="column">
      <Text wrap="truncate-end">
        <Text color="gray">{figures.bullet} </Text>
        <Text color="white">lgd </Text>
        <Text color="green">@{APP_VERSION}</Text>
      </Text>
      {mirrorAdapter?.baseURL && (
        <Box>
          <Text color="gray">
            Active mirror {figures.arrowRight} {mirrorAdapter?.baseURL}
          </Text>
        </Box>
      )}
    </Box>
  );
}
