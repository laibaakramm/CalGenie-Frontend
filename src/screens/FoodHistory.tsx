import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
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
import type { FoodLogFilter } from "../services/foodLogService";
import { useAuth } from "../store/authStore";
import {
  MEAL_LABELS,
  MEAL_ORDER,
  type MealLogItem,
  type MealType,
  useMealLogs,
} from "../store/mealLogStore";
import { BorderRadius, FontSize, Spacing } from "../utils/theme";

const BG = "#121212";
const CARD = "#1E1E1E";
const GREEN = "#50C878";
const TEXT_MUTED = "#9A9A9A";

const FILTER_CONFIG: { key: FoodLogFilter; label: string }[] = [
  { key: "daily", label: "Day" },
  { key: "monthly", label: "Month" },
  { key: "yearly", label: "Year" },
];

function dateKeyFromTimestamp(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateHeader(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupLogsByDate(logs: MealLogItem[]) {
  const byKey = new Map<string, MealLogItem[]>();
  for (const log of logs) {
    const key = dateKeyFromTimestamp(log.createdAt);
    const arr = byKey.get(key);
    if (arr) arr.push(log);
    else byKey.set(key, [log]);
  }
  const keys = [...byKey.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((key) => {
    const items = byKey.get(key)!;
    const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);
    const dayTotal = sorted.reduce((s, i) => s + i.calories, 0);
    const displayDate = formatDateHeader(sorted[0].createdAt);
    return { dateKey: key, displayDate, items: sorted, dayTotal };
  });
}

function groupDayItemsByMeal(items: MealLogItem[]): Record<MealType, MealLogItem[]> {
  const g: Record<MealType, MealLogItem[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };
  for (const i of items) {
    g[i.mealType].push(i);
  }
  for (const m of MEAL_ORDER) {
    g[m].sort((a, b) => b.createdAt - a.createdAt);
  }
  return g;
}

function MealEntryRow({
  item,
  onDelete,
}: {
  item: MealLogItem;
  onDelete: () => void;
}) {
  return (
    <View style={styles.mealCard}>
      <View style={styles.thumb}>
        <Ionicons name="restaurant" size={22} color={GREEN} />
      </View>
      <View style={styles.mealMain}>
        <Text style={styles.mealFoodName} numberOfLines={2}>
          {item.foodName}
        </Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={TEXT_MUTED} />
          <Text style={styles.mealTime}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.calCol}>
        <Text style={styles.calValue}>{Math.round(item.calories)}</Text>
        <Text style={styles.calUnit}>KCAL</Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        style={styles.deleteBtn}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.foodName}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color="#C45C5C" />
      </TouchableOpacity>
    </View>
  );
}

export function FoodHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    logs,
    activeFilter,
    setActiveFilter,
    refreshLogs,
    loading,
    error,
    clearError,
    removeMealLog,
  } = useMealLogs();

  const firstName = useMemo(() => {
    const n = user?.name?.trim();
    if (!n) return "U";
    return n.split(/\s+/)[0]?.slice(0, 1).toUpperCase() ?? "U";
  }, [user?.name]);

  const dateGroups = useMemo(() => groupLogsByDate(logs), [logs]);

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
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{firstName}</Text>
        </View>
        <Text style={styles.appName}>CalGenie</Text>
        {/* <TouchableOpacity style={styles.bellWrap} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color="#E8E8E8" />
          <View style={styles.bellDot} />
        </TouchableOpacity> */}
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.progressLabel}>YOUR PROGRESS</Text>
        <Text style={styles.titleConsumption}>Consumption</Text>
        <Text style={styles.titleHistory}>History</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refreshLogs(activeFilter)}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.filterRow}>
          {FILTER_CONFIG.map(({ key, label }) => {
            const selected = activeFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterPill, selected && styles.filterPillActive]}
                onPress={() => {
                  clearError();
                  setActiveFilter(key);
                  void refreshLogs(key);
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.filterPillText, selected && styles.filterPillTextActive]}
                >
                  {label}
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

        {dateGroups.length === 0 && !loading ? (
          <Text style={styles.emptyState}>
            No meals logged for this period yet.
          </Text>
        ) : null}

        {dateGroups.map((group) => {
          const byMeal = groupDayItemsByMeal(group.items);
          return (
            <View key={group.dateKey} style={styles.dateSection}>
              <View style={styles.dateHeaderRow}>
                <Text style={styles.dateHeaderLeft}>{group.displayDate}</Text>
                <View style={styles.dateHeaderRight}>
                  <Text style={styles.dateTotalNum}>
                    {Math.round(group.dayTotal).toLocaleString()}
                  </Text>
                  <Text style={styles.dateTotalSuffix}> KCAL TOTAL</Text>
                </View>
              </View>

              {MEAL_ORDER.map((meal) => {
                const mealItems = byMeal[meal];
                if (mealItems.length === 0) return null;
                return (
                  <View key={`${group.dateKey}-${meal}`} style={styles.mealSubsection}>
                    <Text style={styles.mealSubLabel}>{MEAL_LABELS[meal]}</Text>
                    {mealItems.map((item) => (
                      <MealEntryRow
                        key={item.id}
                        item={item}
                        onDelete={() => void handleDelete(item)}
                      />
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#F5F5F5",
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  appName: {
    flex: 1,
    textAlign: "center",
    fontSize: FontSize.lg + 2,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: -0.2,
  },
  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  titleBlock: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
    letterSpacing: 1.6,
    marginBottom: Spacing.xs,
  },
  titleConsumption: {
    fontSize: FontSize.xl + 10,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 40,
  },
  titleHistory: {
    fontSize: FontSize.xl + 10,
    fontWeight: "800",
    color: GREEN,
    lineHeight: 40,
    marginBottom: Spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterPill: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillActive: {
    backgroundColor: GREEN,
  },
  filterPillText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: TEXT_MUTED,
  },
  filterPillTextActive: {
    color: "#0A0A0A",
  },
  errorBanner: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: "#2A1515",
    padding: Spacing.md,
  },
  errorText: {
    color: "#F0A0A0",
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  emptyState: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  dateSection: {
    marginBottom: Spacing.xl,
  },
  dateHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  dateHeaderLeft: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  dateHeaderRight: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 0,
  },
  dateTotalNum: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: GREEN,
  },
  dateTotalSuffix: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  mealSubsection: {
    marginBottom: Spacing.md,
  },
  mealSubLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B8B8B8",
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  mealCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
  },
  mealMain: {
    flex: 1,
    minWidth: 0,
  },
  mealFoodName: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  mealTime: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: TEXT_MUTED,
  },
  calCol: {
    alignItems: "flex-end",
  },
  calValue: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  calUnit: {
    fontSize: 10,
    fontWeight: "700",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
});
