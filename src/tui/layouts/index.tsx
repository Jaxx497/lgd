import type { FC } from "react";
import { Layout } from "./layout";
import { LAYOUT_KEY } from "./keys";
import Search from "./search/index";
import ResultList from "./result-list/index";
import Detail from "./detail/index";
import { BulkDownload } from "./bulk-download";

const Layouts: FC = () => {
  return (
    <>
      <Layout layoutName={LAYOUT_KEY.SEARCH_LAYOUT}>
        <Search />
      </Layout>

      <Layout layoutName={LAYOUT_KEY.RESULT_LIST_LAYOUT}>
        <ResultList />
      </Layout>

      <Layout layoutName={LAYOUT_KEY.DETAIL_LAYOUT}>
        <Detail />
      </Layout>

      <Layout layoutName={LAYOUT_KEY.BULK_DOWNLOAD_LAYOUT}>
        <BulkDownload />
      </Layout>
    </>
  );
};

export default Layouts;
