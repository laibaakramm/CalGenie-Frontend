import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '../utils/theme';

export interface CustomGoalCardProps {
  /** Icon to display (e.g. LoseIcon, GainIcon, MaintainIcon) */
  icon: React.ReactNode;
  /** Label shown below the icon */
  name: string;
  /** Whether this card is currently selected */
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function CustomGoalCard({
  icon,
  name,
  selected = false,
  onPress,
  style,
}: CustomGoalCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={[styles.name, selected && styles.nameSelected]}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
  },
  cardSelected: {
    borderColor: Colors.primary,
  },
  iconWrap: {
    marginBottom: Spacing.sm,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  nameSelected: {
    color: Colors.primary,
  },
});
