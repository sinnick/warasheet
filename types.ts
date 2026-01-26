import type { ReactNode } from "react";
import type { ColorValue, ViewStyle, StyleProp } from "react-native";
import type { SharedValue } from "react-native-reanimated";

/**
 * Detent value - either "auto" (content-based) or a fraction between 0-1
 */
export type SheetDetent = "auto" | number;

/**
 * Information about current detent state
 */
export interface DetentInfo {
  index: number;
  name?: string;
}

/**
 * Options for customizing the grabber appearance
 */
export interface GrabberOptions {
  visible?: boolean;
  color?: ColorValue;
  width?: number;
  height?: number;
}

/**
 * Props for WaraSheet component
 */
export interface WaraSheetProps {
  /**
   * Unique name for controlling sheet via context
   */
  name?: string;

  /**
   * Snap points for the sheet. Use fractions (0-1) or "auto" for content height.
   * @default [0.5, 1]
   */
  detents?: SheetDetent[];

  /**
   * Initial detent index. Use -1 for closed state.
   * @default -1
   */
  initialDetentIndex?: number;

  /**
   * Whether the sheet can be dismissed by dragging down
   * @default true
   */
  dismissible?: boolean;

  /**
   * Whether dragging is enabled
   * @default true
   */
  draggable?: boolean;

  /**
   * Whether to dim the background
   * @default true
   */
  dimmed?: boolean;

  /**
   * Index of detent from which dimming starts
   * @default 0
   */
  dimmedDetentIndex?: number;

  /**
   * Allow touches to pass through to background content.
   * KEY FEATURE: This enables map interaction while sheet is open.
   * @default true
   */
  allowBackgroundInteraction?: boolean;

  /**
   * Background color of the sheet
   * @default "#fff"
   */
  backgroundColor?: ColorValue;

  /**
   * Corner radius of the sheet
   * @default 20
   */
  cornerRadius?: number;

  /**
   * Whether to show the grabber handle
   * @default true
   */
  grabber?: boolean;

  /**
   * Options for customizing the grabber
   */
  grabberOptions?: GrabberOptions;

  /**
   * Fixed header content
   */
  header?: ReactNode;

  /**
   * Fixed footer content
   */
  footer?: ReactNode;

  /**
   * Custom container style
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Called when sheet mounts
   */
  onMount?: () => void;

  /**
   * Called after sheet presents
   */
  onDidPresent?: (info: DetentInfo) => void;

  /**
   * Called after sheet dismisses
   */
  onDidDismiss?: () => void;

  /**
   * Called when detent changes
   */
  onDetentChange?: (info: DetentInfo) => void;

  /**
   * Called when drag starts
   */
  onDragBegin?: (info: DetentInfo) => void;

  /**
   * Called when drag ends
   */
  onDragEnd?: (info: DetentInfo) => void;

  /**
   * Sheet content
   */
  children: ReactNode;
}

/**
 * Imperative methods available via ref
 */
export interface WaraSheetRef {
  /**
   * Present the sheet at a specific detent index
   * @param index - Detent index (default: 0)
   */
  present: (index?: number) => void;

  /**
   * Dismiss the sheet (triggers onDidDismiss callback)
   */
  dismiss: () => void;

  /**
   * Dismiss the sheet without triggering onDidDismiss callback.
   * Use this when you want to hide the sheet temporarily and re-present it later
   * without losing the parent's state.
   */
  softDismiss: () => void;

  /**
   * Resize sheet to a specific detent
   * @param index - Target detent index
   */
  resize: (index: number) => void;

  /**
   * Check if the sheet is currently presented
   * @returns true if sheet is visible
   */
  isPresented: () => boolean;
}

/**
 * Context value for controlling sheets globally
 */
export interface WaraSheetContextValue {
  /**
   * Register a sheet with the context
   */
  register: (name: string, ref: WaraSheetRef) => void;

  /**
   * Unregister a sheet from the context
   */
  unregister: (name: string) => void;

  /**
   * Present a sheet by name
   */
  present: (name: string, index?: number) => void;

  /**
   * Dismiss a sheet by name
   */
  dismiss: (name: string) => void;

  /**
   * Resize a sheet by name
   */
  resize: (name: string, index: number) => void;
}

/**
 * Internal animation state
 */
export interface SheetAnimationState {
  translateY: SharedValue<number>;
  currentDetentIndex: SharedValue<number>;
  contentHeight: SharedValue<number>;
  isPresented: SharedValue<boolean>;
}

/**
 * Backdrop component props
 */
export interface SheetBackdropProps {
  opacity: SharedValue<number>;
  onPress?: () => void;
  pointerEvents?: "auto" | "none" | "box-none";
}

/**
 * Grabber component props
 */
export interface SheetGrabberProps {
  options?: GrabberOptions;
}
