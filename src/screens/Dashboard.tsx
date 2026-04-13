import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalorieEstimateCard, CustomButton } from "../components";
import {
  detectCaloriesFromImage,
  scanIndianFood,
} from "../services/foodDetectionService";
import { useAuth } from "../store/authStore";
import type { RootStackParamList } from "../types";
import { BorderRadius, Colors, FontSize, Spacing } from "../utils/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [detectedCalories, setDetectedCalories] = useState<number | null>(null);
  const [detectedFoodName, setDetectedFoodName] = useState<string | null>(null);

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
  );
  const remainingCalories =
    dailyCalorieGoal != null
      ? Math.max(0, dailyCalorieGoal - consumedCalories)
      : null;

  const saveDailyGoal = () => {
    setGoalError(undefined);
    const num = Number(goalInput);
    if (!Number.isFinite(num) || num <= 0) {
      setGoalError("Enter a valid daily calorie goal");
      return;
    }
    setDailyCalorieGoal(num);
  };

  return (
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
          <TouchableOpacity
            onPress={clearImage}
            style={styles.deleteBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Remove image"
          >
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={styles.deleteBtnPlaceholder} />
        )}
      </View>
      <View style={styles.previewWrap}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            contentFit="contain"
            transition={200}
            accessibilityLabel="Selected image preview"
          />
        ) : (
          <Text style={styles.placeholder}>
            {Platform.OS === "web"
              ? "No image yet — use the buttons above."
              : "No image yet — take a photo or upload one."}
          </Text>
        )}
      </View>

      <CalorieEstimateCard
        calories={detectedCalories}
        foodName={detectedFoodName}
      />

      {dailyCalorieGoal == null ? (
        <View style={styles.goalCard}>
          <Text style={styles.goalTitleText}>Set your daily calorie goal</Text>
          <Text style={styles.goalHint}>
            This is required to show consumed/remaining calories.
          </Text>

          <TextInput
            style={styles.goalTextInput}
            value={goalInput}
            onChangeText={setGoalInput}
            placeholder="e.g. 2000"
            placeholderTextColor={Colors.placeholder}
            keyboardType="numeric"
          />

          {goalError ? (
            <Text style={styles.goalErrorText}>{goalError}</Text>
          ) : null}

          <View style={{ marginTop: Spacing.sm }}>
            <CustomButton
              title="Save goal"
              onPress={saveDailyGoal}
              variant="primary"
              style={{ width: "100%" }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Daily goal</Text>
            <Text style={styles.summaryValue}>{dailyCalorieGoal} kcal</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Consumed</Text>
            <Text style={styles.summaryValue}>{consumedCalories} kcal</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={styles.summaryValue}>
              {remainingCalories ?? 0} kcal
            </Text>
          </View>
        </View>
      )}

      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Food history</Text>
        {foodHistory.length === 0 ? (
          <Text style={styles.historyEmpty}>No foods consumed yet.</Text>
        ) : (
          foodHistory.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyItemLeft}>
                <Text style={styles.historyFoodName} numberOfLines={1}>
                  {item.foodName}
                </Text>
                <Text style={styles.historyTime}>
                  {new Date(item.createdAt).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.historyCalories}>{item.calories} kcal</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
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
    marginBottom: Spacing.xl,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  actionBtn: {
    width: "100%",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  previewLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  deleteBtnPlaceholder: {
    width: 22 + Spacing.xs * 2,
    height: 22 + Spacing.xs * 2,
  },
  previewWrap: {
    minHeight: 280,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    minHeight: 280,
    aspectRatio: 1,
  },
  placeholder: {
    fontSize: FontSize.md,
    color: Colors.placeholder,
    textAlign: "center",
    padding: Spacing.lg,
  },
  goalCard: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalTitleText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  goalHint: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  goalTextInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  goalErrorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  summaryCard: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
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
  historyCard: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  historyTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  historyEmpty: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyItemLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  historyFoodName: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
  },
  historyTime: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.placeholder,
    marginTop: 2,
  },
  historyCalories: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
});
