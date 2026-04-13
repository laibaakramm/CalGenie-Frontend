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
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === "DashboardTab") {
            return (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                color={color}
                size={size}
              />
            );
          }
          if (route.name === "FoodHistoryTab") {
            return (
              <Ionicons
                name={focused ? "restaurant" : "restaurant-outline"}
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
        options={{ title: "Food" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}

