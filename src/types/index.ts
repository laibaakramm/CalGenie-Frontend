/**
 * Shared type definitions for CalGenie
 */

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  Scanning: undefined;
};

export type AppTabParamList = {
  DashboardTab: undefined;
  FoodHistoryTab: undefined;
  ProfileTab: undefined;
};

export type InputType = 'email' | 'name' | 'password' | 'text';

export type CustomButtonVariant = 'primary' | 'secondary' | 'outline';
