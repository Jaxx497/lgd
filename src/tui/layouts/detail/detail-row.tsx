import type { FC } from "react";
import { Box, Text } from "ink";

const DetailRow: FC<{
  label: string;
  description: string;
}> = ({ label, description }) => {
  return (
    <Box>
      <Box flexShrink={0} width={11}>
        <Text color="yellow">{label}</Text>
      </Box>
      <Text>{description}</Text>
    </Box>
  );
};

export default DetailRow;
