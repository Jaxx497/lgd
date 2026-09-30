import type { FC } from "react";
import { Box, Text, useInput } from "ink";
import ContentContainer from "../../components/content-container";
import { KeyHints } from "../../components/key-hints";
import DetailRow from "./detail-row";
import { useBoundStore } from "../../store";
import { DownloadStatusAndProgress } from "../../components/download-status-and-progress";
import { DETAIL_HINTS } from "../hints";
import { LAYOUT_KEY } from "../keys";

const Detail: FC = () => {
  const mirrorAdapter = useBoundStore((state) => state.mirrorAdapter);
  const detailedEntry = useBoundStore((state) => state.detailedEntry);
  const setDetailedEntry = useBoundStore((state) => state.setDetailedEntry);
  const setActiveLayout = useBoundStore((state) => state.setActiveLayout);
  const pushDownloadQueue = useBoundStore((state) => state.pushDownloadQueue);
  const quitPromptVisible = useBoundStore((state) => state.quitPromptVisible);
  const downloadsPanelOpen = useBoundStore((state) => state.downloadsPanelOpen);
  const downloadProgressMap = useBoundStore((state) => state.downloadProgressMap);

  useInput(
    (input, key) => {
      if (input === "h" || key.leftArrow || key.escape) {
        setDetailedEntry(undefined);
        setActiveLayout(LAYOUT_KEY.RESULT_LIST_LAYOUT);
        return;
      }
      if (((input === "d" && !key.ctrl) || key.return) && detailedEntry) {
        pushDownloadQueue(detailedEntry);
      }
    },
    { isActive: !quitPromptVisible && !downloadsPanelOpen }
  );

  if (!detailedEntry) {
    return;
  }

  const downloadProgressData = downloadProgressMap[detailedEntry.id];
  const fields: [string, string][] = [
    ["Title", detailedEntry.title],
    ["Authors", detailedEntry.authors],
    ["Publisher", detailedEntry.publisher],
    ["Year", detailedEntry.year],
    ["Pages", detailedEntry.pages],
    ["Language", detailedEntry.language],
    ["Format", detailedEntry.extension],
    ["Size", detailedEntry.size],
    ["Mirror", mirrorAdapter?.getPageURL(detailedEntry.mirror) ?? detailedEntry.mirror],
  ];

  return (
    <Box flexDirection="column">
      <ContentContainer>
        {fields.map(([label, value]) => (
          <DetailRow key={label} label={label} description={value} />
        ))}
        {downloadProgressData && (
          <Text>
            <DownloadStatusAndProgress downloadProgressData={downloadProgressData} />
          </Text>
        )}
      </ContentContainer>
      {!downloadsPanelOpen && <KeyHints hints={DETAIL_HINTS} />}
    </Box>
  );
};

export default Detail;
