import type { ReactNode } from "react";
import { Box } from "ink";
import { useStdoutDimensions } from "../hooks/use-stdout-dimensions";

interface Properties {
  children: ReactNode;
}

export function AppContainer({ children }: Properties) {
  const [columns] = useStdoutDimensions();

  return (
    <Box width={columns - 2} marginLeft={1} flexDirection="column">
      {children}
    </Box>
  );
}
