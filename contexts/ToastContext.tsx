/**
 * Toast Context
 *
 * Provides toast notification functionality with undo support.
 * Toast displays at the bottom of the screen for 3 seconds.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface ToastOptions {
  message: string;
  /** Optional undo callback - if provided, shows an Undo button */
  onUndo?: () => void;
  /** Duration in ms (default: 3000) */
  duration?: number;
}

interface ToastState {
  visible: boolean;
  message: string;
  onUndo?: () => void;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setToast({ visible: false, message: "" });
    });
  }, [fadeAnim]);

  const showToast = useCallback(
    ({ message, onUndo, duration = 3000 }: ToastOptions) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Show the toast
      setToast({ visible: true, message, onUndo });
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Auto-hide after duration
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [fadeAnim, hideToast]
  );

  const handleUndo = useCallback(() => {
    if (toast.onUndo) {
      toast.onUndo();
    }
    // Clear timeout and hide immediately
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    hideToast();
  }, [toast.onUndo, hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast.visible && (
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.toast}>
            <Text style={styles.message}>{toast.message}</Text>
            {toast.onUndo && (
              <TouchableOpacity
                onPress={handleUndo}
                style={styles.undoButton}
                accessibilityLabel="Undo"
                accessibilityRole="button"
              >
                <Text style={styles.undoText}>UNDO</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    backgroundColor: "#27272a",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 200,
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: "#3f3f46",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  undoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  undoText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
