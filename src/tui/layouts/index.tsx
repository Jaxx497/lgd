import type { FC } from "react";
import { Layout } from "./layout";
import { LAYOUT_KEY } from "./keys";
import Search from "./search/index";
import ResultList from "./result-list/index";
import { ResultListContextProvider } from "../contexts/result-list-context";
import Detail from "./detail/index";
import { BulkDownload } from "./bulk-download";
import { DownloadQueueBeforeExit } from "./download-queue-before-exit";

const Layouts: FC = () => {
  return (
    <>
      <Layout layoutName={LAYOUT_KEY.SEARCH_LAYOUT}>
        <Search />
      </Layout>

      <Layout layoutName={LAYOUT_KEY.RESULT_LIST_LAYOUT}>
        <ResultListContextProvider>
          <ResultList />
        </ResultListContextProvider>
      </Layout>

      <Layout layoutName={LAYOUT_KEY.DETAIL_LAYOUT}>
        <Detail />
      </Layout>

      <Layout layoutName={LAYOUT_KEY.BULK_DOWNLOAD_LAYOUT}>
        <BulkDownload />
      </Layout>

      <Layout layoutName={LAYOUT_KEY.DOWNLOAD_QUEUE_BEFORE_EXIT_LAYOUT}>
        <DownloadQueueBeforeExit />
      </Layout>
    </>
  );
};

export default Layouts;
