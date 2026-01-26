import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { useSharedValue, runOnJS } from "react-native-reanimated";

/**
 * Hook to measure content height for "auto" detent
 * @returns Object with shared value, measured height state, and onLayout handler
 */
export function useContentHeight() {
  const contentHeight = useSharedValue(0);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const onContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0 && height !== measuredHeight) {
        contentHeight.value = height;
        setMeasuredHeight(height);
      }
    },
    [contentHeight, measuredHeight]
  );

  return {
    contentHeight,
    measuredHeight,
    onContentLayout,
  };
}
