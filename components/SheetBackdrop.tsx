import React, { memo } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SheetBackdropProps } from "../types";

const MAX_OPACITY = 0.5;

/**
 * SheetBackdrop - Dimmed overlay behind the sheet
 * Only shown when dimmed=true and allowBackgroundInteraction=false
 */
export const SheetBackdrop = memo<SheetBackdropProps>(
  ({ opacity, onPress, pointerEvents = "auto" }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value * MAX_OPACITY,
    }));

    if (pointerEvents === "none") {
      return (
        <Animated.View
          style={[styles.backdrop, animatedStyle]}
          pointerEvents="none"
        />
      );
    }

    return (
      <Pressable
        onPress={onPress}
        style={StyleSheet.absoluteFill}
        pointerEvents={pointerEvents}
      >
        <Animated.View style={[styles.backdrop, animatedStyle]} />
      </Pressable>
    );
  }
);

SheetBackdrop.displayName = "SheetBackdrop";

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
});
