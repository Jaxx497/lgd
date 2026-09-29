import { Box, Text } from "ink";
import { useBoundStore } from "../store";

const ResultListInfo = () => {
  const searchValue = useBoundStore((state) => state.searchValue);
  const currentPage = useBoundStore((state) => state.currentPage);

  return (
    <Box>
      <Text wrap="truncate">
        Results for <Text color="green">{searchValue}</Text> on page{" "}
        <Text color="yellow">{currentPage}</Text>
      </Text>
    </Box>
  );
};

export default ResultListInfo;
