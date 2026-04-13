import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/forms/Login';
import { RegisterScreen } from '../screens/forms/Register';
import { ScanningScreen } from "../screens/Scanning";
import { AppTabsNavigator } from './AppTabsNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="MainTabs" component={AppTabsNavigator} />
      <Stack.Screen name="Scanning" component={ScanningScreen} />
    </Stack.Navigator>
  );
}
