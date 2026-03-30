import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '../utils/theme';

export interface CalorieEstimateCardProps {
  /** Set when backend returns a value; omit for placeholder UI */
  calories?: number | null;
  /** Set when backend detects a food label */
  foodName?: string | null;
}

/**
 * Displays estimated calories for food in an image. Wire `calories` and `foodName`
 * when the detection API is available; until then the card shows placeholders.
 */
export function CalorieEstimateCard({
  calories,
  foodName,
}: CalorieEstimateCardProps) {
  const caloriesDisplay =
    calories != null && !Number.isNaN(calories) ? String(Math.round(calories)) : '—';
  const foodDisplay =
    foodName != null && foodName.trim() !== '' ? foodName.trim() : '—';

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.title}>Food calories</Text>
      <View style={styles.calorieRow}>
        <Text style={styles.calorieValue}>{caloriesDisplay}</Text>
        <Text style={styles.calorieUnit}>kcal</Text>
      </View>
      <View style={styles.divider} />
      <Text style={styles.foodLabel}>Detected food</Text>
      <Text style={styles.foodValue} numberOfLines={2}>
        {foodDisplay}
      </Text>
      <Text style={styles.hint}>
        Calorie detection is not connected yet — this will update automatically when the
        service is available.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  calorieValue: {
    fontSize: FontSize.xl + 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  calorieUnit: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  foodLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  foodValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  hint: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.placeholder,
  },
});
