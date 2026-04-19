import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { DashboardScreen } from "../screens/Dashboard";
import { FoodHistoryScreen } from "../screens/FoodHistory";
import { ProfileScreen } from "../screens/Profile";
import type { AppTabParamList } from "../types";
import { Colors } from "../utils/theme";

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#8A8A8A",
        // tabBarBackground: () => <View style={{ backgroundColor: "#1E1E1E" }} />,
        tabBarStyle: {
          backgroundColor: "#0F0F0F",
          borderTopColor: "#1F1F1F",
          height: 86,
          paddingTop: 6,
          paddingBottom: 38,
          //marginBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.4,
        },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === "DashboardTab") {
            return (
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
                color={color}
                size={size}
              />
            );
          }
          if (route.name === "FoodHistoryTab") {
            return (
              <Ionicons
                name={focused ? "time" : "time-outline"}
                color={color}
                size={size}
              />
            );
          }

          return (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={size}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{ title: "Dashboard" }}
      />
      <Tab.Screen
        name="FoodHistoryTab"
        component={FoodHistoryScreen}
        options={{ title: "History" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}
