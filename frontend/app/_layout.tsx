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
                <Stack.Screen name="events" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="marketplace" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="messages" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="groups" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="group-detail" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="businesses" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="business-detail" options={{ animation: "slide_from_right" }} />
                <Stack.Screen
                  name="create-group"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen
                  name="create-business"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen name="recommendations" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="recommendation-detail" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="listings" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="listing-detail" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="safety" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="news" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="services" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="service-detail" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="search" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="saved" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="map" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
                <Stack.Screen
                  name="report-issue"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen
                  name="create-listing"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen name="polls" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="poll-detail" options={{ animation: "slide_from_right" }} />
                <Stack.Screen
                  name="create-poll"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen
                  name="create-recommendation"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen
                  name="create-service"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen name="user-profile" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="followers" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="following" options={{ animation: "slide_from_right" }} />
              </Stack>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
