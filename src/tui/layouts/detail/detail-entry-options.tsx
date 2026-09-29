import type { FC } from "react";
import { useInput } from "ink";
import { IOption } from "../../components/option";
import OptionList from "../../components/option-list";
import { DetailEntryOption } from "../../../options";
import Label from "../../../labels";
import { LAYOUT_KEY } from "../keys";
import { useBoundStore } from "../../store";

const DetailEntryOptions: FC = () => {
  const detailedEntry = useBoundStore((state) => state.detailedEntry);
  const setDetailedEntry = useBoundStore((state) => state.setDetailedEntry);
  const setActiveLayout = useBoundStore((state) => state.setActiveLayout);
  const pushDownloadQueue = useBoundStore((state) => state.pushDownloadQueue);

  const inDownloadQueueEntryIds = useBoundStore((state) => state.inDownloadQueueEntryIds);
  let inDownloadQueue = false;
  if (detailedEntry) {
    inDownloadQueue = inDownloadQueueEntryIds.includes(detailedEntry.id);
  }

  let downloadLabel = Label.DOWNLOAD_DIRECTLY;
  if (inDownloadQueue) {
    downloadLabel = Label.DOWNLOADING;
  }

  const detailOptions: Record<string, IOption> = {
    [DetailEntryOption.TURN_BACK_TO_THE_LIST]: {
      label: Label.TURN_BACK_TO_THE_LIST,
      onSelect: () => {
        setActiveLayout(LAYOUT_KEY.RESULT_LIST_LAYOUT);
        setDetailedEntry(undefined);
      },
    },
    [DetailEntryOption.DOWNLOAD_DIRECTLY]: {
      loading: inDownloadQueue,
      label: downloadLabel,
      description: "(Press [D])",
      onSelect: () => {
        if (detailedEntry) {
          pushDownloadQueue(detailedEntry);
        }
      },
    },
  };

  useInput((input) => {
    if (input.toLowerCase() === "d" && detailedEntry) {
      pushDownloadQueue(detailedEntry);
      return;
    }
  });

  if (!detailedEntry) {
    return;
  }

  return <OptionList key={"detailOptions"} options={detailOptions} />;
};

export default DetailEntryOptions;
