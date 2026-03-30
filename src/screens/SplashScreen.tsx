import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { LogoIcon } from '../components/LogoIcon';
import { FontSize, Spacing } from '../utils/theme';

const PRIMARY = '#10B77F';
const MUTED = '#64748B';

const SPLASH_DURATION_MS = 3000;

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <LogoIcon width={192} height={192} />
      <Text style={styles.title}>
        <Text style={styles.titleCal}>Cal</Text>
        <Text style={styles.titleGenie}>Genie</Text>
      </Text>
      <Text style={styles.tagline}>Snap. Scan. Stay Fit.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xl + 8,
    fontWeight: '700',
    marginTop: Spacing.lg,
  },
  titleCal: {
    color: MUTED,
  },
  titleGenie: {
    color: PRIMARY,
  },
  tagline: {
    fontSize: FontSize.md,
    color: MUTED,
    marginTop: Spacing.sm,
    fontWeight: '400',
  },
});
