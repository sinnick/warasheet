import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { WaraSheetRef, WaraSheetContextValue } from "./types";

const WaraSheetContext = createContext<WaraSheetContextValue | null>(null);

interface WaraSheetProviderProps {
  children: ReactNode;
}

/**
 * WaraSheetProvider - Context provider for global sheet control
 *
 * @example
 * // In app root
 * <WaraSheetProvider>
 *   <App />
 * </WaraSheetProvider>
 *
 * // In component
 * const { present, dismiss } = useWaraSheet();
 * present("my-sheet", 0);
 */
export const WaraSheetProvider: React.FC<WaraSheetProviderProps> = ({
  children,
}) => {
  const sheetsRef = useRef<Map<string, WaraSheetRef>>(new Map());

  const register = useCallback((name: string, ref: WaraSheetRef) => {
    sheetsRef.current.set(name, ref);
  }, []);

  const unregister = useCallback((name: string) => {
    sheetsRef.current.delete(name);
  }, []);

  const present = useCallback((name: string, index?: number) => {
    const sheet = sheetsRef.current.get(name);
    if (sheet) {
      sheet.present(index);
    } else {
      console.warn(`[WaraSheet] Sheet "${name}" not found`);
    }
  }, []);

  const dismiss = useCallback((name: string) => {
    const sheet = sheetsRef.current.get(name);
    if (sheet) {
      sheet.dismiss();
    } else {
      console.warn(`[WaraSheet] Sheet "${name}" not found`);
    }
  }, []);

  const resize = useCallback((name: string, index: number) => {
    const sheet = sheetsRef.current.get(name);
    if (sheet) {
      sheet.resize(index);
    } else {
      console.warn(`[WaraSheet] Sheet "${name}" not found`);
    }
  }, []);

  const value: WaraSheetContextValue = {
    register,
    unregister,
    present,
    dismiss,
    resize,
  };

  return (
    <WaraSheetContext.Provider value={value}>
      {children}
    </WaraSheetContext.Provider>
  );
};

/**
 * Hook to control sheets by name through context
 *
 * @example
 * const { present, dismiss, resize } = useWaraSheet();
 *
 * // Present sheet at first detent
 * present("settings-sheet", 0);
 *
 * // Dismiss sheet
 * dismiss("settings-sheet");
 *
 * // Resize to different detent
 * resize("settings-sheet", 1);
 */
export function useWaraSheet(): WaraSheetContextValue {
  const context = useContext(WaraSheetContext);

  if (!context) {
    // Return no-op functions if used outside provider
    return {
      register: () => {},
      unregister: () => {},
      present: (name: string) => {
        console.warn(
          `[WaraSheet] Cannot present "${name}" - WaraSheetProvider not found`
        );
      },
      dismiss: (name: string) => {
        console.warn(
          `[WaraSheet] Cannot dismiss "${name}" - WaraSheetProvider not found`
        );
      },
      resize: (name: string) => {
        console.warn(
          `[WaraSheet] Cannot resize "${name}" - WaraSheetProvider not found`
        );
      },
    };
  }

  return context;
}
