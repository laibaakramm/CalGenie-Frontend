import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
<<<<<<< HEAD
=======
import { CalorieEstimateCard, CustomButton } from "../components";
import {
  detectCaloriesFromImage,
  scanIndianFood,
} from "../services/foodDetectionService";
import { useAuth } from "../store/authStore";
>>>>>>> 0b918c53fb16f4bf2777ca949e744a801a66eefd
import type { RootStackParamList } from "../types";
import {
  isAuthenticatedApiToken,
  useDashboardOverview,
} from "../store/dashboardOverviewStore";
import { useAuth } from "../store/authStore";
import { useMealLogs } from "../store/mealLogStore";
import { BorderRadius, Colors, FontSize, Spacing } from "../utils/theme";

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token, user, dailyCalorieGoal } = useAuth();
  const { logs, todayTotalCalories } = useMealLogs();
  const {
    overview,
    loading: dashboardLoading,
    error: dashboardError,
    refreshDashboard,
  } = useDashboardOverview();
  const [refreshing, setRefreshing] = useState(false);

<<<<<<< HEAD
  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard]),
=======
  const [foodHistory, setFoodHistory] = useState<
    Array<{ id: string; calories: number; foodName: string; createdAt: number }>
  >([]);

  const pickFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert(
        "Permission needed",
        "Camera access is required to take a photo.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert(
        "Permission needed",
        "Photo library access is required to upload an image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const clearImage = useCallback(() => {
    setImageUri(null);
    setDetectedCalories(null);
    setDetectedFoodName(null);
  }, []);

  const { dailyCalorieGoal, setDailyCalorieGoal, token, user } = useAuth();

  const handleIndianScan = async () => {
    console.log("token:", token);
    console.log("user:", user);
    console.log("imageUri:", imageUri);
    if (!imageUri) {
      Alert.alert("No image", "Please take a photo or upload one first.");
      return;
    }
    try {
      const result = await scanIndianFood(imageUri, 1, token!);
      console.log("RESULT:", JSON.stringify(result));
      setDetectedCalories(result.totalCalories);
      setDetectedFoodName(result.detections[0]?.foodName ?? "Unknown");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const [goalInput, setGoalInput] = useState("");
  const [goalError, setGoalError] = useState<string | undefined>();

  useEffect(() => {
    if (!imageUri) return;

    let cancelled = false;
    (async () => {
      const res = await detectCaloriesFromImage(imageUri);
      if (cancelled) return;

      if (!res) {
        setDetectedCalories(null);
        setDetectedFoodName(null);
        return;
      }

      setDetectedCalories(res.calories);
      setDetectedFoodName(res.foodName);
      setFoodHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          calories: res.calories,
          foodName: res.foodName,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const consumedCalories = foodHistory.reduce(
    (sum, item) => sum + item.calories,
    0,
>>>>>>> 0b918c53fb16f4bf2777ca949e744a801a66eefd
  );

  const displayGoal =
    overview != null && overview.dailyGoal > 0
      ? overview.dailyGoal
      : dailyCalorieGoal ?? null;

  const useServerSummary =
    isAuthenticatedApiToken(token) && overview != null;

  const consumedCalories = useServerSummary
    ? overview!.totalConsumed
    : todayTotalCalories;

  const remainingCalories =
    displayGoal != null
      ? useServerSummary
        ? overview!.remaining
        : Math.max(0, displayGoal - todayTotalCalories)
      : null;

  const progressPercentage = useServerSummary
    ? overview!.progressPercentage
    : displayGoal != null && displayGoal > 0
      ? Math.min(100, Math.round((consumedCalories / displayGoal) * 100))
      : 0;
  const overGoal = displayGoal != null && consumedCalories > displayGoal;
  const ringColor = overGoal ? Colors.error : Colors.primary;
  const recentThreeMeals = useMemo(() => logs.slice(0, 3), [logs]);

  const onRefreshDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshDashboard();
    } finally {
      setRefreshing(false);
    }
  }, [refreshDashboard]);

  return (
<<<<<<< HEAD
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.heading}>
            Hello {user?.name?.trim() ? user.name : "User"}
          </Text>
=======
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + Spacing.lg,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Dashboard</Text>
      <Text style={styles.subheading}>
        Take a photo or choose from your library
      </Text>

      <View style={styles.actions}>
        <CustomButton
          title="Take photo"
          onPress={pickFromCamera}
          style={styles.actionBtn}
        />
        <CustomButton
          title="Upload image"
          onPress={pickFromLibrary}
          variant="outline"
          style={styles.actionBtn}
        />

        <CustomButton
          title="Scan Indian Food"
          onPress={handleIndianScan}
          variant="primary"
          style={styles.actionBtn}
        />
      </View>

      <View style={styles.previewHeader}>
        <Text style={styles.previewLabel}>Preview</Text>
        {imageUri ? (
>>>>>>> 0b918c53fb16f4bf2777ca949e744a801a66eefd
          <TouchableOpacity
            style={styles.scanIconBtn}
            onPress={() => navigation.navigate("Scanning")}
            accessibilityRole="button"
            accessibilityLabel="Open scanning screen"
          >
            <Ionicons name="camera-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
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
        <View style={[styles.calorieCircle, { borderColor: ringColor }]}>
          <Text style={[styles.circleCalories, { color: ringColor }]}>
            {Math.round(consumedCalories)}
          </Text>
          <Text style={styles.circleUnits}>kcal</Text>
        </View>
        <Text style={styles.goalText}>
          Goal: {displayGoal != null ? Math.round(displayGoal) : 0} kcal
        </Text>
        <Text style={[styles.goalStatusText, { color: ringColor }]}>
          {overGoal ? "Goal exceeded" : "Within goal"}
        </Text>
        <Text style={styles.progressCaption}>{progressPercentage}% of daily goal</Text>
      </View>

      <View style={styles.recentCard}>
        <Text style={styles.recentTitle}>Recent meals</Text>
        {recentThreeMeals.length === 0 ? (
          <Text style={styles.emptyRecent}>No meals logged yet.</Text>
        ) : (
          recentThreeMeals.map((item) => (
            <View key={item.id} style={styles.recentRow}>
              <Text style={styles.recentMealName} numberOfLines={1}>
                {item.foodName}
              </Text>
              <Text style={styles.recentMealCalories}>
                {Math.round(item.calories)} kcal
              </Text>
            </View>
          ))
        )}
      </View>

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
        <Text style={styles.summaryValue}>{Math.round(consumedCalories)} kcal</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Remaining</Text>
        <Text style={styles.summaryValue}>
          {remainingCalories != null ? Math.round(remainingCalories) : 0} kcal
        </Text>
      </View>
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
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  heading: {
    fontSize: FontSize.xl + 2,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
  },
  scanIconBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  circleCard: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  calorieCircle: {
    width: 150,
    height: 150,
    borderRadius: BorderRadius.full,
    borderWidth: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  circleCalories: {
    fontSize: FontSize.xl + 8,
    fontWeight: "800",
  },
  circleUnits: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  goalText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  goalStatusText: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    fontWeight: "700",
  },
  recentCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recentTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyRecent: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  progressCaption: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentMealName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
  },
  recentMealCalories: {
    fontSize: FontSize.sm,
    fontWeight: "700",
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
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
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
});
