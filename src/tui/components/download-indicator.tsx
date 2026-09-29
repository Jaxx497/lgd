import { Box, Text } from "ink";
import { useBoundStore } from "../store";

export const DownloadIndicator = () => {
  const totalAddedToDownloadQueue = useBoundStore((state) => state.totalAddedToDownloadQueue);
  const totalDownloaded = useBoundStore((state) => state.totalDownloaded);
  const totalFailed = useBoundStore((state) => state.totalFailed);
  const downloadDirectory = useBoundStore((state) => state.userConfig.downloadDir);

  if (totalAddedToDownloadQueue === 0) {
    return;
  }

  return (
    <Box flexDirection="column">
      <Text wrap="truncate">
        <Text color="green">
          DOWNLOADED {totalDownloaded}/{totalAddedToDownloadQueue}
        </Text>{" "}
        {totalFailed > 0 && <Text color="redBright">FAIL ({totalFailed}) </Text>}
        to <Text color="blueBright">{downloadDirectory}</Text>
      </Text>
    </Box>
  );
};
