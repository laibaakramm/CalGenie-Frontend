import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MEAL_LABELS,
  MEAL_ORDER,
  type MealLogItem,
  type MealType,
  useMealLogs,
} from "../store/mealLogStore";
import { BorderRadius, Colors, FontSize, Spacing } from "../utils/theme";

const MEAL_ICONS: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
};

const MEAL_ACCENT: Record<MealType, string> = {
  breakfast: "#F59E0B",
  lunch: "#3B82F6",
  dinner: "#6366F1",
};

const FILTERS = ["daily", "monthly", "yearly"] as const;

function MealSection({ mealType }: { mealType: MealType }) {
  const { logsByMeal, removeMealLog } = useMealLogs();
  const items = logsByMeal[mealType];
  const accent = MEAL_ACCENT[mealType];
  const total = items.reduce((s, i) => s + i.calories, 0);

  const handleDelete = async (item: MealLogItem) => {
    try {
      await removeMealLog(item.id);
    } catch (e) {
      Alert.alert(
        "Delete failed",
        e instanceof Error ? e.message : "Unable to delete this entry.",
      );
    }
  };

  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { borderLeftColor: accent }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name={MEAL_ICONS[mealType]} size={22} color={accent} />
          <Text style={styles.sectionTitle}>{MEAL_LABELS[mealType]}</Text>
        </View>
        <Text style={[styles.sectionTotal, { color: accent }]}>
          {items.length > 0 ? `${Math.round(total)} kcal` : "—"}
        </Text>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyLine}>No items logged yet.</Text>
      ) : (
        items.map((item, idx) => (
          <MealRow
            key={item.id}
            item={item}
            isLast={idx === items.length - 1}
            onDelete={() => void handleDelete(item)}
          />
        ))
      )}
    </View>
  );
}

function MealRow({
  item,
  isLast,
  onDelete,
}: {
  item: MealLogItem;
  isLast?: boolean;
  onDelete: () => void;
}) {
  const d = new Date(item.createdAt);
  const dateStr = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View style={[styles.mealRow, isLast && styles.mealRowLast]}>
      <View style={styles.mealRowMain}>
        <Text style={styles.mealFoodName} numberOfLines={2}>
          {item.foodName}
        </Text>
        <Text style={styles.mealMeta}>
          {dateStr} · {timeStr}
        </Text>
      </View>
      <Text style={styles.mealCalories}>{Math.round(item.calories)} kcal</Text>
      <TouchableOpacity
        onPress={onDelete}
        style={styles.deleteBtn}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.foodName}`}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );
}

export function FoodHistoryScreen() {
  const insets = useSafeAreaInsets();
  const {
    logs,
    activeFilter,
    setActiveFilter,
    refreshLogs,
    loading,
    error,
    clearError,
  } = useMealLogs();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.heading}>Food history</Text>
        <Text style={styles.subheading}>
          {logs.length === 0
            ? "No diary logs yet for this timeframe."
            : "Your API-backed meals grouped by breakfast, lunch, and dinner."}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refreshLogs(activeFilter)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const selected = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterBtn, selected && styles.filterBtnActive]}
                onPress={() => {
                  clearError();
                  setActiveFilter(filter);
                  void refreshLogs(filter);
                }}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    selected && styles.filterBtnTextActive,
                  ]}
                >
                  {filter[0].toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {MEAL_ORDER.map((meal) => (
          <MealSection key={meal} mealType={meal} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
  },
  heading: {
    fontSize: FontSize.xl + 4,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  sectionTotal: {
    fontSize: FontSize.sm,
    fontWeight: "800",
  },
  emptyLine: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mealRowLast: {
    borderBottomWidth: 0,
  },
  mealRowMain: {
    flex: 1,
    marginRight: Spacing.md,
  },
  mealFoodName: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
  },
  mealMeta: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.placeholder,
    marginTop: 4,
  },
  mealCalories: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
  deleteBtn: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  filterBtnText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterBtnTextActive: {
    color: Colors.primary,
  },
  errorBanner: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: `${Colors.error}44`,
    backgroundColor: `${Colors.error}12`,
    padding: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
