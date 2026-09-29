import { Box, Text } from "ink";
import Spinner from "./spinner";

interface Properties {
  message: string;
}

export function LoadingSpinner({ message }: Properties) {
  return (
    <Box>
      <Box marginRight={1}>
        <Spinner />
      </Box>
      <Text>{message}</Text>
    </Box>
  );
}
