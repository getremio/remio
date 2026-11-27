import { requireNativeView } from "expo";
import { useCallback, useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { RemioTerminalCellMetrics, RemioTerminalFrame, RemioTerminalTheme } from "./contract";
import { encodeTerminalCustomGlyphs, type RemioTerminalCustomGlyph } from "./custom-glyphs";
import { encodeTerminalFrame, type NativeRemioTerminalFrame } from "./frame-encoding";

export * from "./contract";

export interface RemioTerminalViewProps {
  frame: RemioTerminalFrame;
  theme: RemioTerminalTheme;
  fontFamily: string;
  /** Font size in points after the system font scale is applied. */
  fontSize: number;
  onCellMetrics?: (metrics: RemioTerminalCellMetrics) => void;
  style?: StyleProp<ViewStyle>;
}

interface NativeRemioTerminalViewProps extends Omit<
  RemioTerminalViewProps,
  "frame" | "onCellMetrics"
> {
  frame: NativeRemioTerminalFrame;
  customGlyphs: RemioTerminalCustomGlyph[];
  onCellMetrics?: (event: { nativeEvent: RemioTerminalCellMetrics }) => void;
}

const NativeRemioTerminalView = requireNativeView<NativeRemioTerminalViewProps>("RemioTerminal");
const CUSTOM_GLYPHS = encodeTerminalCustomGlyphs();

export function RemioTerminalView({ frame, onCellMetrics, ...props }: RemioTerminalViewProps) {
  const nativeFrame = useMemo(() => encodeTerminalFrame(frame), [frame]);
  const handleCellMetrics = useCallback(
    (event: { nativeEvent: RemioTerminalCellMetrics }) => onCellMetrics?.(event.nativeEvent),
    [onCellMetrics],
  );
  return (
    <NativeRemioTerminalView
      {...props}
      frame={nativeFrame}
      customGlyphs={CUSTOM_GLYPHS}
      onCellMetrics={handleCellMetrics}
    />
  );
}
