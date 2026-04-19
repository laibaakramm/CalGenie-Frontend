import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../store/authStore";
import {
  isAuthenticatedApiToken,
  useDashboardOverview,
} from "../store/dashboardOverviewStore";
import { useMealLogs } from "../store/mealLogStore";
import type { RootStackParamList } from "../types";
import { BorderRadius, Colors, FontSize, Spacing } from "../utils/theme";

function formatRecentTime(raw: number): string {
  const date = new Date(raw);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (today.getTime() - targetDay.getTime()) / (24 * 60 * 60 * 1000),
  );
  const timeText = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  if (diffDays === 0) return `Today, ${timeText}`;
  if (diffDays === 1) return `Yesterday, ${timeText}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeText}`;
}

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token, user, dailyCalorieGoal } = useAuth();
  const { logs, todayTotalCalories } = useMealLogs();
  const {
    overview,
    loading: dashboardLoading,
    savingGoal,
    error: dashboardError,
    refreshDashboard,
    saveGoalToApi,
  } = useDashboardOverview();
  const [refreshing, setRefreshing] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goalSaveError, setGoalSaveError] = useState<string | null>(null);
  const [goalSaveMessage, setGoalSaveMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard]),
  );

  const displayGoal =
    overview != null && overview.dailyGoal > 0
      ? overview.dailyGoal
      : (dailyCalorieGoal ?? null);

  const useServerSummary = isAuthenticatedApiToken(token) && overview != null;

  const consumedCalories = useServerSummary
    ? overview.totalConsumed
    : todayTotalCalories;

  const remainingCalories =
    displayGoal != null
      ? useServerSummary
        ? overview.remaining
        : Math.max(0, displayGoal - todayTotalCalories)
      : null;

  const progressPercentage = useServerSummary
    ? overview.progressPercentage
    : displayGoal != null && displayGoal > 0
      ? Math.min(100, Math.round((consumedCalories / displayGoal) * 100))
      : 0;

  const overGoal = displayGoal != null && consumedCalories > displayGoal;
  const ringColor = overGoal ? Colors.error : Colors.primary;
  const recentThreeMeals = useMemo(() => logs.slice(0, 3), [logs]);
  const firstName = useMemo(() => {
    const full = user?.name?.trim();
    if (!full) return "User";
    return full.split(/\s+/)[0] ?? "User";
  }, [user?.name]);

  useEffect(() => {
    if (displayGoal != null && displayGoal > 0) {
      setGoalInput(String(Math.round(displayGoal)));
    }
  }, [displayGoal]);

  const onRefreshDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshDashboard();
    } finally {
      setRefreshing(false);
    }
  }, [refreshDashboard]);

  const onSaveGoal = useCallback(async () => {
    const nextGoal = Number(goalInput.trim());
    if (!Number.isFinite(nextGoal) || nextGoal <= 0) {
      setGoalSaveMessage(null);
      setGoalSaveError("Enter a valid daily goal greater than 0.");
      return;
    }
    setGoalSaveError(null);
    setGoalSaveMessage(null);
    try {
      await saveGoalToApi(Math.round(nextGoal));
      setGoalSaveMessage("Daily goal updated.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save goal.";
      setGoalSaveError(message);
    }
  }, [goalInput, saveGoalToApi]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {firstName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.welcomeText}>WELCOME BACK</Text>
            <Text style={styles.heading}>Hi, {firstName}</Text>
          </View>
          {isAuthenticatedApiToken(token) && dashboardLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefreshDashboard}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.circleCard}>
          <View style={styles.circleOuter}>
            <View style={[styles.calorieCircle, { borderColor: ringColor }]}>
              <Text style={styles.circleLabel}>CALORIES</Text>
              <Text style={styles.circleCalories}>
                {Math.round(consumedCalories)}
              </Text>
              <Text style={styles.circleUnits}>
                of {displayGoal != null ? Math.round(displayGoal) : 0} KCAL
              </Text>
            </View>
          </View>
          <Text style={[styles.goalStatusText, { color: ringColor }]}>
            {overGoal ? "Goal exceeded" : `${progressPercentage}% complete`}
          </Text>
        </View>

        <View style={styles.goalEditorCard}>
          <View style={styles.goalEditHeader}>
            <Text style={styles.goalEditorTitle}>Edit daily goal</Text>
            <Text style={styles.goalCurrentText}>
              Current: {displayGoal != null ? Math.round(displayGoal) : 0} kcal
            </Text>
          </View>
          <TextInput
            value={goalInput}
            onChangeText={(text) => {
              setGoalInput(text);
              setGoalSaveError(null);
              setGoalSaveMessage(null);
            }}
            keyboardType="number-pad"
            placeholder="e.g. 2300"
            placeholderTextColor={Colors.placeholder}
            style={styles.goalInput}
            accessibilityLabel="Daily calorie goal input"
          />
          <TouchableOpacity
            style={[
              styles.goalSaveButton,
              savingGoal && styles.goalSaveButtonDisabled,
            ]}
            onPress={onSaveGoal}
            disabled={savingGoal}
            accessibilityRole="button"
            accessibilityLabel="Save daily calorie goal"
          >
            <Text style={styles.goalSaveButtonText}>
              {savingGoal ? "Saving..." : "Save goal"}
            </Text>
          </TouchableOpacity>
          {goalSaveError ? (
            <Text style={styles.goalSaveErrorText}>{goalSaveError}</Text>
          ) : null}
          {goalSaveMessage ? (
            <Text style={styles.goalSaveSuccessText}>{goalSaveMessage}</Text>
          ) : null}
        </View>

        <View style={styles.recentHeaderRow}>
          <Text style={styles.recentTitle}>
            Recent Logs ({recentThreeMeals.length})
          </Text>
        </View>
        {recentThreeMeals.length === 0 ? (
          <View style={styles.recentCard}>
            <Text style={styles.emptyRecent}>No meals logged yet.</Text>
          </View>
        ) : (
          recentThreeMeals.map((item) => (
            <View key={item.id} style={styles.recentCard}>
              <View style={styles.recentThumb}>
                <Ionicons
                  name="restaurant-outline"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.recentMeta}>
                <Text style={styles.recentMealName} numberOfLines={1}>
                  {item.foodName}
                </Text>
                <Text style={styles.recentMealTime}>
                  {formatRecentTime(item.createdAt)}
                </Text>
              </View>
              <View style={styles.recentCaloriesWrap}>
                <Text style={styles.recentMealCalories}>
                  {Math.round(item.calories)}
                </Text>
                <Text style={styles.recentMealUnits}>KCAL</Text>
              </View>
            </View>
          ))
        )}

        {isAuthenticatedApiToken(token) && dashboardError ? (
          <View style={styles.dashboardErrorBanner}>
            <Text style={styles.dashboardErrorText}>{dashboardError}</Text>
            <TouchableOpacity
              onPress={onRefreshDashboard}
              accessibilityRole="button"
              accessibilityLabel="Retry loading dashboard"
            >
              <Text style={styles.dashboardErrorRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Consumed</Text>
          <Text style={styles.summaryValue}>
            {Math.round(consumedCalories)} kcal
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Remaining</Text>
          <Text style={styles.summaryValue}>
            {remainingCalories != null ? Math.round(remainingCalories) : 0} kcal
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.floatingScanButton,
          { bottom: Math.max(insets.bottom + Spacing.md, Spacing.lg) },
        ]}
        onPress={() => navigation.navigate("Scanning")}
        accessibilityRole="button"
        accessibilityLabel="Open scanning screen"
      >
        <Ionicons name="camera" size={28} color={Colors.black} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0B",
  },
  header: {
    paddingHorizontal: Spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  avatarText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  headerTextWrap: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 10,
    color: "#888888",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  heading: {
    fontSize: FontSize.xl + 4,
    fontWeight: "700",
    color: Colors.white,
  },
  circleOuter: {
    width: 270,
    height: 270,
    borderRadius: BorderRadius.full,
    borderWidth: 22,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  circleCard: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  calorieCircle: {
    width: 205,
    height: 205,
    borderRadius: BorderRadius.full,
    borderWidth: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  circleLabel: {
    fontSize: 12,
    color: "#A0A0A0",
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  circleCalories: {
    fontSize: FontSize.xl + 16,
    fontWeight: "800",
    color: Colors.white,
  },
  circleUnits: {
    fontSize: FontSize.sm,
    color: "#98A09A",
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  goalStatusText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    fontWeight: "700",
  },
  recentHeaderRow: {
    marginBottom: Spacing.sm,
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
  },
  recentTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.white,
  },
  emptyRecent: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: "#A0A0A0",
  },
  recentThumb: {
    width: 54,
    height: 54,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#303030",
  },
  recentMeta: {
    flex: 1,
    gap: 2,
  },
  recentMealName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.white,
  },
  recentMealTime: {
    fontSize: FontSize.sm,
    color: "#B1B1B1",
    fontWeight: "500",
  },
  recentCaloriesWrap: {
    alignItems: "flex-end",
  },
  recentMealCalories: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.white,
    lineHeight: 28,
  },
  recentMealUnits: {
    fontSize: 12,
    color: "#B1B1B1",
    fontWeight: "700",
  },
  goalEditorCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
  },
  goalEditHeader: {
    marginBottom: Spacing.sm,
  },
  goalEditorTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.white,
  },
  goalCurrentText: {
    marginTop: 2,
    color: "#A0A0A0",
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  goalInput: {
    borderWidth: 1,
    borderColor: "#2F2F2F",
    borderRadius: BorderRadius.md,
    backgroundColor: "#0D0D0D",
    color: Colors.white,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  goalSaveButton: {
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm + 2,
  },
  goalSaveButtonDisabled: {
    opacity: 0.7,
  },
  goalSaveButtonText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: "700",
  },
  goalSaveErrorText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.error,
  },
  goalSaveSuccessText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.primary,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: "#A0A0A0",
  },
  summaryValue: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.white,
  },
  dashboardErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.error}12`,
    borderWidth: 1,
    borderColor: `${Colors.error}44`,
    marginBottom: Spacing.lg,
  },
  dashboardErrorText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.error,
    lineHeight: 20,
  },
  dashboardErrorRetry: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
  floatingScanButton: {
    position: "absolute",
    right: Spacing.lg,
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: "#58F592",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#58F592",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 } as ViewStyle["shadowOffset"],
    shadowRadius: 16,
    elevation: 8,
  },
});
