import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth-context";
import { colors } from "@/src/theme";

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View
        testID="splash-loader"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}
      >
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/auth" />;
  if (!profile?.city || !profile?.locality) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
