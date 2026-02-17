import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, send to crash reporting (Sentry, etc.)
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message ?? "Unknown error"}</Text>
          <Pressable style={styles.button} onPress={this.resetError} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "900", marginBottom: 8 },
  message: { fontSize: 14, opacity: 0.6, textAlign: "center", marginBottom: 20 },
  button: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: "#111" },
  buttonText: { color: "white", fontSize: 14, fontWeight: "800" },
});
