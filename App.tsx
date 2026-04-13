import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { AuthProvider } from './src/store/authStore';
import { DashboardOverviewProvider } from './src/store/dashboardOverviewStore';
import { MealLogProvider } from './src/store/mealLogStore';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MealLogProvider>
          <DashboardOverviewProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </DashboardOverviewProvider>
        </MealLogProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
