import { Tabs } from "expo-router";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { colors, spacing, radius } from "@/src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3366FF",
        tabBarInactiveTintColor: "#8E8E88",
        tabBarStyle: {
          backgroundColor: "rgba(255,255,255,0.9)",
          borderTopWidth: 3,
          borderTopColor: "#000",
          height: 72,
          paddingBottom: 10,
          paddingTop: 6,
          shadowColor: "#000",
          shadowOpacity: 1,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: focused ? "#3366FF" : "transparent",
              borderWidth: focused ? 0 : 2, borderColor: focused ? "transparent" : "#000",
              alignItems: "center", justifyContent: "center",
              shadowColor: focused ? "#000" : "transparent",
              shadowOpacity: focused ? 1 : 0,
              shadowRadius: 0,
              shadowOffset: focused ? { width: 2, height: 2 } : { width: 0, height: 0 },
              elevation: focused ? 2 : 0,
            }}>
              <Feather name="home" size={size * 0.85} color={focused ? "#FFFFFF" : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: focused ? "#FF3366" : "transparent",
              borderWidth: focused ? 0 : 2, borderColor: focused ? "transparent" : "#000",
              alignItems: "center", justifyContent: "center",
              shadowColor: focused ? "#000" : "transparent",
              shadowOpacity: focused ? 1 : 0,
              shadowRadius: 0,
              shadowOffset: focused ? { width: 2, height: 2 } : { width: 0, height: 0 },
              elevation: focused ? 2 : 0,
            }}>
              <Feather name="compass" size={size * 0.85} color={focused ? "#FFFFFF" : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create-picker"
        options={{
          title: "",
          tabBarIcon: ({ color, size }) => (
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: colors.brand,
              alignItems: "center", justifyContent: "center",
              borderWidth: 3, borderColor: "#000",
              shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 6,
              marginTop: -12,
            }}>
              <Feather name="plus" size={24} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: focused ? "#FF6B35" : "transparent",
              borderWidth: focused ? 0 : 2, borderColor: focused ? "transparent" : "#000",
              alignItems: "center", justifyContent: "center",
              shadowColor: focused ? "#000" : "transparent",
              shadowOpacity: focused ? 1 : 0,
              shadowOffset: focused ? { width: 2, height: 2 } : { width: 0, height: 0 },
              elevation: focused ? 2 : 0,
            }}>
              <Feather name="message-square" size={size * 0.85} color={focused ? "#FFFFFF" : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: focused ? "#22C55E" : "transparent",
              borderWidth: focused ? 0 : 2, borderColor: focused ? "transparent" : "#000",
              alignItems: "center", justifyContent: "center",
              shadowColor: focused ? "#000" : "transparent",
              shadowOpacity: focused ? 1 : 0,
              shadowOffset: focused ? { width: 2, height: 2 } : { width: 0, height: 0 },
              elevation: focused ? 2 : 0,
            }}>
              <Feather name="user" size={size * 0.85} color={focused ? "#FFFFFF" : color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
