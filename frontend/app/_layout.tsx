import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/auth-context";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { ToastProvider } from "@/src/components/Toast";
import { colors, spacing } from "@/src/theme";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary
          fallback={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.surface }}>
              <Feather name="frown" size={48} color={colors.muted} />
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.onSurface, marginTop: spacing.md }}>Unexpected error</Text>
              <Text style={{ color: colors.muted, textAlign: "center", marginTop: spacing.sm }}>Please restart the app.</Text>
            </View>
          }
        >
          <ToastProvider>
            <AuthProvider>
              <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
                <Stack.Screen name="profile-setup" options={{ animation: "slide_from_right" }} />
                <Stack.Screen
                  name="edit-profile"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen
                  name="create-post"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen
                  name="create-event"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen
                  name="create-market"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen name="messages" options={{ animation: "slide_from_right" }} />
              </Stack>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
