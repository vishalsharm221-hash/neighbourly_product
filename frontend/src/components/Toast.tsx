import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius } from "@/src/theme";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastCtx {
  showToast: (message: string, type?: ToastType) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const icons: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: "check-circle",
  error: "alert-circle",
  info: "info",
  warning: "alert-triangle",
};

const bgColors: Record<ToastType, string> = {
  success: colors.success,
  error: colors.error,
  info: colors.brand,
  warning: colors.warning,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t) => (
          <View key={t.id} style={[styles.toast, { backgroundColor: bgColors[t.type] }]}>
            <Feather name={icons[t.type]} size={18} color="#fff" />
            <Text style={styles.text}>{t.message}</Text>
          </View>
        ))}
      </View>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used within ToastProvider");
  return c;
}

const styles = StyleSheet.create({
  container: { position: "absolute", top: 60, left: 0, right: 0, alignItems: "center", gap: 8, zIndex: 9999 },
  toast: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderRadius: radius.pill, shadowColor: "#000", shadowOpacity: 0.15,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    maxWidth: "85%",
  },
  text: { color: "#fff", fontSize: 14, fontWeight: "600", flexShrink: 1 },
});
