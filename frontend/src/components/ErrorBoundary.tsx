import { Component, ReactNode, ErrorInfo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, spacing } from "@/src/theme";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.root}>
          <Feather name="alert-triangle" size={48} color={colors.error} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.surface },
  title: { fontSize: 18, fontWeight: "700", color: colors.onSurface, marginTop: spacing.md },
  message: { fontSize: 13, color: colors.muted, textAlign: "center", marginTop: spacing.sm, lineHeight: 18 },
  retry: { marginTop: spacing.lg, backgroundColor: colors.brand, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999 },
  retryText: { color: colors.onBrand, fontWeight: "700", fontSize: 14 },
});
