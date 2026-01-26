import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import type { SheetGrabberProps } from "../types";

const DEFAULT_WIDTH = 36;
const DEFAULT_HEIGHT = 5;
const DEFAULT_COLOR = "#DDDDDD";

/**
 * SheetGrabber - Drag handle indicator at the top of the sheet
 */
export const SheetGrabber = memo<SheetGrabberProps>(({ options }) => {
  const {
    visible = true,
    color = DEFAULT_COLOR,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
  } = options ?? {};

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.grabber,
          {
            width,
            height,
            backgroundColor: color as string,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
});

SheetGrabber.displayName = "SheetGrabber";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  grabber: {
    // Dynamic styles applied inline
  },
});
