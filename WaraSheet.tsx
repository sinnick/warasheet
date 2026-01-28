import React, {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { View, StyleSheet, Dimensions, Platform, LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetGrabber } from "./components/SheetGrabber";
import { SheetBackdrop } from "./components/SheetBackdrop";
import { useContentHeight } from "./hooks/useContentHeight";
import { useWaraSheet } from "./WaraSheetContext";
import type { WaraSheetProps, WaraSheetRef, SheetDetent, DetentInfo } from "./types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const { height: FULL_SCREEN_HEIGHT } = Dimensions.get("screen");

// Spring animation config
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

// Extra padding for overscroll effect
const OVERSCROLL_HEIGHT = 100;
// Minimum height for auto detent when content is too small
const MIN_AUTO_HEIGHT = 100;
// Velocity threshold for quick dismiss
const DISMISS_VELOCITY_THRESHOLD = 500;

/**
 * Calculate the Y position for each detent
 */
function calculateDetentPositions(
  detents: SheetDetent[],
  contentHeight: number,
  screenHeight: number,
  safeAreaBottom: number,
  grabberHeight: number,
  headerHeight: number
): number[] {
  return detents.map((detent) => {
    if (detent === "auto") {
      // Auto = based on content height + grabber + safe area
      const autoHeight = Math.max(
        contentHeight + grabberHeight + safeAreaBottom,
        MIN_AUTO_HEIGHT
      );
      return screenHeight - autoHeight;
    }
    if (detent === "header") {
      // Header = only show the header (grabber + header content + safe area)
      // Use MIN_AUTO_HEIGHT as fallback when header hasn't been measured yet
      const headerOnlyHeight = Math.max(headerHeight, MIN_AUTO_HEIGHT) + safeAreaBottom;
      return screenHeight - headerOnlyHeight;
    }
    // Fraction = percentage of screen height
    return screenHeight * (1 - detent);
  });
}

/**
 * Find the closest detent based on current position and velocity
 */
function findClosestDetent(
  currentY: number,
  velocity: number,
  detentPositions: number[],
  screenHeight: number,
  dismissible: boolean
): { index: number; position: number } {
  // If dismissing with high velocity downward
  if (dismissible && velocity > DISMISS_VELOCITY_THRESHOLD) {
    return { index: -1, position: screenHeight };
  }

  // Find closest detent
  let closestIndex = 0;
  let closestDistance = Math.abs(currentY - detentPositions[0]);

  for (let i = 1; i < detentPositions.length; i++) {
    const distance = Math.abs(currentY - detentPositions[i]);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }

  // Check if we should dismiss (if dragged below the lowest detent)
  if (dismissible) {
    const lowestDetent = Math.max(...detentPositions);
    const dismissThreshold = lowestDetent + 100; // 100px below lowest detent
    if (currentY > dismissThreshold) {
      return { index: -1, position: screenHeight };
    }
  }

  return { index: closestIndex, position: detentPositions[closestIndex] };
}

/**
 * WaraSheet - Bottom sheet overlay component
 *
 * Unlike TrueSheet which uses iOS UISheetPresentationController (modal),
 * this component renders as an overlay allowing background interaction.
 *
 * @example
 * <WaraSheet
 *   ref={sheetRef}
 *   detents={["auto", 0.5]}
 *   allowBackgroundInteraction={true}
 *   onDidDismiss={handleDismiss}
 * >
 *   <YourContent />
 * </WaraSheet>
 */
export const WaraSheet = forwardRef<WaraSheetRef, WaraSheetProps>(
  (props, ref) => {
    const {
      name,
      detents = [0.5, 1],
      initialDetentIndex = -1,
      dismissible = true,
      draggable = true,
      dimmed = true,
      dimmedDetentIndex = 0,
      allowBackgroundInteraction = true,
      backgroundColor = "#fff",
      safeAreaBackgroundColor,
      cornerRadius = 20,
      grabber = true,
      grabberOptions,
      header,
      footer,
      style,
      onMount,
      onDidPresent,
      onDidDismiss,
      onDetentChange,
      onDragBegin,
      onDragEnd,
      children,
    } = props;

    const insets = useSafeAreaInsets();
    const { register, unregister } = useWaraSheet();

    // On Android without edge-to-edge, window height excludes the navigation bar
    // but insets.bottom is 0. Calculate the gap to fill it with content background.
    const navigationBarGap = Platform.OS === 'android'
      ? Math.max(0, FULL_SCREEN_HEIGHT - SCREEN_HEIGHT - (insets.bottom || 0))
      : 0;
    const { contentHeight, measuredHeight, onContentLayout } = useContentHeight();

    // State for measuring header height (grabber + header content)
    const [headerHeight, setHeaderHeight] = useState(0);

    const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
      setHeaderHeight(event.nativeEvent.layout.height);
    }, []);

    // Grabber height for calculations
    const grabberHeight = grabber ? 29 : 0; // 12 + 5 + 12 padding

    // Animation shared values
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const startY = useSharedValue(0);
    const currentDetentIndex = useSharedValue(initialDetentIndex);
    const isPresented = useSharedValue(false);
    const backdropOpacity = useSharedValue(0);

    // Calculate detent positions
    const detentPositions = useMemo(
      () =>
        calculateDetentPositions(
          detents,
          measuredHeight,
          SCREEN_HEIGHT,
          insets.bottom,
          grabberHeight,
          headerHeight
        ),
      [detents, measuredHeight, insets.bottom, grabberHeight, headerHeight]
    );

    // Shared values for worklet access (avoid JS array operations in worklets)
    const highestDetent = useSharedValue(SCREEN_HEIGHT * 0.1);
    const lowestDetent = useSharedValue(SCREEN_HEIGHT * 0.5);
    const detentPositionsShared = useSharedValue<number[]>([]);

    // Update shared values when detentPositions change
    useEffect(() => {
      if (detentPositions.length > 0) {
        highestDetent.value = Math.min(...detentPositions);
        lowestDetent.value = Math.max(...detentPositions);
        detentPositionsShared.value = [...detentPositions];
      }
    }, [detentPositions, highestDetent, lowestDetent, detentPositionsShared]);

    // Callback wrappers for worklets
    const callOnDidPresent = useCallback(
      (index: number) => {
        onDidPresent?.({ index });
      },
      [onDidPresent]
    );

    const callOnDidDismiss = useCallback(() => {
      onDidDismiss?.();
    }, [onDidDismiss]);

    const callOnDetentChange = useCallback(
      (index: number) => {
        onDetentChange?.({ index });
      },
      [onDetentChange]
    );

    const callOnDragBegin = useCallback(
      (index: number) => {
        onDragBegin?.({ index });
      },
      [onDragBegin]
    );

    const callOnDragEnd = useCallback(
      (index: number) => {
        onDragEnd?.({ index });
      },
      [onDragEnd]
    );

    // Imperative methods
    const present = useCallback(
      (index = 0) => {
        const targetIndex = Math.min(index, detentPositions.length - 1);
        const position = detentPositions[targetIndex];

        translateY.value = withSpring(position, SPRING_CONFIG, (finished) => {
          if (finished) {
            runOnJS(callOnDidPresent)(targetIndex);
          }
        });
        currentDetentIndex.value = targetIndex;
        isPresented.value = true;

        // Animate backdrop
        if (dimmed && targetIndex >= dimmedDetentIndex) {
          backdropOpacity.value = withSpring(1, SPRING_CONFIG);
        }
      },
      [
        detentPositions,
        translateY,
        currentDetentIndex,
        isPresented,
        backdropOpacity,
        dimmed,
        dimmedDetentIndex,
        callOnDidPresent,
      ]
    );

    const dismiss = useCallback(() => {
      translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG, (finished) => {
        if (finished) {
          isPresented.value = false;
          runOnJS(callOnDidDismiss)();
        }
      });
      currentDetentIndex.value = -1;
      backdropOpacity.value = withSpring(0, SPRING_CONFIG);
    }, [translateY, currentDetentIndex, isPresented, backdropOpacity, callOnDidDismiss]);

    // Soft dismiss - hides sheet without triggering onDidDismiss callback
    // Used when temporarily hiding sheet (e.g., drawer navigation) to preserve parent state
    const softDismiss = useCallback(() => {
      translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG, (finished) => {
        if (finished) {
          isPresented.value = false;
          // NOTE: We intentionally do NOT call callOnDidDismiss here
        }
      });
      currentDetentIndex.value = -1;
      backdropOpacity.value = withSpring(0, SPRING_CONFIG);
    }, [translateY, currentDetentIndex, isPresented, backdropOpacity]);

    const resize = useCallback(
      (index: number) => {
        if (!isPresented.value) return;

        const targetIndex = Math.min(index, detentPositions.length - 1);
        const position = detentPositions[targetIndex];

        translateY.value = withSpring(position, SPRING_CONFIG, (finished) => {
          if (finished) {
            runOnJS(callOnDetentChange)(targetIndex);
          }
        });
        currentDetentIndex.value = targetIndex;

        // Update backdrop based on detent
        if (dimmed) {
          const targetOpacity = targetIndex >= dimmedDetentIndex ? 1 : 0;
          backdropOpacity.value = withSpring(targetOpacity, SPRING_CONFIG);
        }
      },
      [
        detentPositions,
        translateY,
        currentDetentIndex,
        isPresented,
        backdropOpacity,
        dimmed,
        dimmedDetentIndex,
        callOnDetentChange,
      ]
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        present,
        dismiss,
        softDismiss,
        resize,
        isPresented: () => isPresented.value,
      }),
      [present, dismiss, softDismiss, resize, isPresented]
    );

    // Register with context
    useEffect(() => {
      if (name) {
        register(name, {
          present,
          dismiss,
          softDismiss,
          resize,
          isPresented: () => isPresented.value,
        });
        return () => unregister(name);
      }
    }, [name, register, unregister, present, dismiss, softDismiss, resize, isPresented]);

    // Call onMount
    useEffect(() => {
      onMount?.();
    }, [onMount]);

    // Initial present if initialDetentIndex >= 0
    useEffect(() => {
      if (initialDetentIndex >= 0 && detentPositions.length > 0) {
        present(initialDetentIndex);
      }
    }, [initialDetentIndex, detentPositions.length]);

    // Update position when header height changes (for "header" detent)
    // This ensures the sheet adjusts when header content loads/changes
    useEffect(() => {
      if (isPresented.value && headerHeight > 0 && detentPositions.length > 0) {
        const currentIndex = currentDetentIndex.value;
        if (currentIndex >= 0 && currentIndex < detentPositions.length) {
          const newPosition = detentPositions[currentIndex];
          translateY.value = withSpring(newPosition, SPRING_CONFIG);
        }
      }
    }, [headerHeight, detentPositions, isPresented, currentDetentIndex, translateY]);

    // Pan gesture for dragging
    // activeOffsetY allows scroll gestures to work inside the sheet
    // The pan gesture only activates after moving 10px vertically
    const panGesture = Gesture.Pan()
      .enabled(draggable)
      .activeOffsetY([-10, 10])
      .shouldCancelWhenOutside(false)
      .onStart(() => {
        startY.value = translateY.value;
        runOnJS(callOnDragBegin)(currentDetentIndex.value);
      })
      .onUpdate((event) => {
        // Calculate new position from the initial drag position
        const newY = startY.value + event.translationY;

        // Clamp with rubber band effect at top
        if (newY < highestDetent.value) {
          // Rubber band effect when pulling above highest detent
          const overscroll = highestDetent.value - newY;
          translateY.value = highestDetent.value - overscroll * 0.3;
        } else {
          translateY.value = newY;
        }

        // Update backdrop opacity based on position
        if (dimmed) {
          const opacity = interpolate(
            translateY.value,
            [lowestDetent.value, SCREEN_HEIGHT],
            [1, 0],
            Extrapolation.CLAMP
          );
          backdropOpacity.value = opacity;
        }
      })
      .onEnd((event) => {
        // Inline findClosestDetent logic for worklet safety
        const positions = detentPositionsShared.value;
        const currentY = translateY.value;
        const velocity = event.velocityY;

        let targetIndex = -1;
        let targetPosition = SCREEN_HEIGHT;

        // If dismissing with high velocity downward
        if (dismissible && velocity > DISMISS_VELOCITY_THRESHOLD) {
          targetIndex = -1;
          targetPosition = SCREEN_HEIGHT;
        } else if (positions.length > 0) {
          // Find closest detent
          let closestIndex = 0;
          let closestDistance = Math.abs(currentY - positions[0]);

          for (let i = 1; i < positions.length; i++) {
            const distance = Math.abs(currentY - positions[i]);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = i;
            }
          }

          // Check if we should dismiss (if dragged below the lowest detent)
          if (dismissible) {
            const lowest = lowestDetent.value;
            const dismissThreshold = lowest + 100;
            if (currentY > dismissThreshold) {
              targetIndex = -1;
              targetPosition = SCREEN_HEIGHT;
            } else {
              targetIndex = closestIndex;
              targetPosition = positions[closestIndex];
            }
          } else {
            targetIndex = closestIndex;
            targetPosition = positions[closestIndex];
          }
        }

        if (targetIndex === -1) {
          // Dismiss
          translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG, (finished) => {
            if (finished) {
              isPresented.value = false;
              runOnJS(callOnDidDismiss)();
            }
          });
          currentDetentIndex.value = -1;
          backdropOpacity.value = withSpring(0, SPRING_CONFIG);
        } else {
          // Snap to detent
          translateY.value = withSpring(targetPosition, SPRING_CONFIG, (finished) => {
            if (finished && currentDetentIndex.value !== targetIndex) {
              runOnJS(callOnDetentChange)(targetIndex);
            }
          });
          currentDetentIndex.value = targetIndex;

          // Update backdrop
          if (dimmed) {
            const targetOpacity = targetIndex >= dimmedDetentIndex ? 1 : 0;
            backdropOpacity.value = withSpring(targetOpacity, SPRING_CONFIG);
          }
        }

        runOnJS(callOnDragEnd)(targetIndex);
      });

    // Animated styles for the sheet
    const animatedSheetStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    // Animated content style - calculates dynamic height based on sheet position
    // This is critical for scroll to work properly inside the sheet
    const animatedContentStyle = useAnimatedStyle(() => {
      // Visible height = screen height - current Y position - safe area bottom - header height
      const visibleHeight = SCREEN_HEIGHT - translateY.value - insets.bottom - headerHeight;
      return {
        height: Math.max(visibleHeight, 0),
        minHeight: 0, // Critical for scroll to work on Android
      };
    });

    // Determine if backdrop should block touches
    const backdropPointerEvents = dimmed && !allowBackgroundInteraction ? "auto" : "none";

    return (
      <View style={styles.container} pointerEvents="box-none">
        {/* Backdrop */}
        {dimmed && (
          <SheetBackdrop
            opacity={backdropOpacity}
            onPress={dismissible ? dismiss : undefined}
            pointerEvents={backdropPointerEvents}
          />
        )}

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: backgroundColor as string,
              borderTopLeftRadius: cornerRadius,
              borderTopRightRadius: cornerRadius,
            },
            style,
            animatedSheetStyle,
          ]}
        >
          {/* Grabber - only this area responds to pan gesture */}
          <GestureDetector gesture={panGesture}>
            <View onLayout={onHeaderLayout}>
              {grabber && <SheetGrabber options={grabberOptions} />}
              {/* Header is also draggable */}
              {header}
            </View>
          </GestureDetector>

          {/* Content - scrollable area with dynamic height */}
          <Animated.View style={[styles.content, animatedContentStyle]}>
            {children}
          </Animated.View>

          {/* Footer */}
          {footer}

          {/* Safe area bottom - separate view allows different background color */}
          {insets.bottom > 0 && (
            <View
              style={{
                height: insets.bottom,
                backgroundColor: (safeAreaBackgroundColor ?? backgroundColor) as string,
              }}
            />
          )}

          {/* Navigation bar fill for Android without edge-to-edge */}
          {navigationBarGap > 0 && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -navigationBarGap,
                height: navigationBarGap,
                backgroundColor: (safeAreaBackgroundColor ?? backgroundColor) as string,
              }}
            />
          )}

          {/* Overscroll fill - extends below sheet for pull-up overscroll effect */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: -(OVERSCROLL_HEIGHT + navigationBarGap),
              height: OVERSCROLL_HEIGHT + navigationBarGap,
              backgroundColor: (safeAreaBackgroundColor ?? backgroundColor) as string,
            }}
          />
        </Animated.View>
      </View>
    );
  }
);

WaraSheet.displayName = "WaraSheet";

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT + OVERSCROLL_HEIGHT,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  content: {
    flex: 0, // Use dynamic height instead of flex
    overflow: "hidden",
  },
});
