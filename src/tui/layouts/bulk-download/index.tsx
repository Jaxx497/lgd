import { Box, Text } from "ink";
import { useBoundStore } from "../../store";
import { DownloadStatusAndProgress } from "../../components/download-status-and-progress";

export function BulkDownload() {
  const bulkDownloadQueue = useBoundStore((state) => state.bulkDownloadQueue);
  const completedBulkDownloadItemCount = useBoundStore(
    (state) => state.completedBulkDownloadItemCount
  );
  const failedBulkDownloadItemCount = useBoundStore((state) => state.failedBulkDownloadItemCount);
  const downloadDirectory = useBoundStore((state) => state.userConfig.downloadDir);
  const totalItemCount = bulkDownloadQueue.length;

  return (
    <Box flexDirection="column">
      <Box paddingLeft={3} flexDirection="column">
        <Text wrap="truncate-end">
          <Text color="greenBright">COMPLETED ({completedBulkDownloadItemCount}) </Text>
          <Text color="redBright">FAILED ({failedBulkDownloadItemCount}) </Text>
          <Text color="white">TOTAL ({totalItemCount})</Text>
        </Text>

        <Text color="white">
          Downloading files to <Text color="blueBright">{downloadDirectory}</Text>
        </Text>

        {bulkDownloadQueue.map((item, index) => (
          <Text key={index} wrap="truncate-end">
            <DownloadStatusAndProgress downloadProgressData={item} />
            {item.filename && (
              <Text>
                <Text color="green">{item.filename}</Text>
              </Text>
            )}
            {!item.filename && item.md5 && (
              <Text>
                <Text color="gray">md5: </Text>
                <Text color="green">{item.md5}</Text>
              </Text>
            )}
            {!item.filename && !item.md5 && <Text color="gray">-</Text>}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
