import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalorieEstimateCard, CustomButton } from "../components";
import {
  analyzeFoodFromImage,
  type PickedImage,
  submitReferenceCalibration,
} from "../services/foodDetectionService";
import { isUserCalibrated, setUserCalibrated } from "../services/calibrationStorage";
import {
  MEAL_LABELS,
  MEAL_ORDER,
  type MealType,
  useMealLogs,
} from "../store/mealLogStore";
import { useAuth } from "../store/authStore";
import { BorderRadius, Colors, FontSize, Spacing } from "../utils/theme";

const DEFAULT_CALIBRATION_REFERENCE = "credit_card" as const;

const MEAL_CARD_ICONS: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny",
  lunch: "restaurant",
  dinner: "moon",
};

const MEAL_CARD_COLORS: Record<MealType, string> = {
  breakfast: "#F59E0B",
  lunch: "#3B82F6",
  dinner: "#6366F1",
};

function assetToPickedImage(asset: ImagePicker.ImagePickerAsset): PickedImage {
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    fileName: asset.fileName ?? null,
  };
}

export function ScanningScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addMealLog } = useMealLogs();

  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [detectedCalories, setDetectedCalories] = useState<number | null>(null);
  const [detectedFoodName, setDetectedFoodName] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [hasCompletedCalibration, setHasCompletedCalibration] = useState(false);
  const [calibrationHydrated, setCalibrationHydrated] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setHasCompletedCalibration(false);
      setCalibrationHydrated(true);
      return;
    }
    let cancelled = false;
    setCalibrationHydrated(false);
    isUserCalibrated(user.id).then((done) => {
      if (!cancelled) {
        setHasCompletedCalibration(done);
        setCalibrationHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const clearImage = useCallback(() => {
    setPickedImage(null);
    setDetectedCalories(null);
    setDetectedFoodName(null);
  }, []);

  const pickFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert("Permission needed", "Camera access is required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPickedImage(assetToPickedImage(result.assets[0]));
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
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPickedImage(assetToPickedImage(result.assets[0]));
    }
  }, []);

  useEffect(() => {
    if (!pickedImage?.uri || !calibrationHydrated) return;
    const pick = pickedImage;
    let cancelled = false;

    (async () => {
      if (!user?.id) {
        Alert.alert(
          "Account setup",
          "Your session is missing a user id from the server. Log in again and try scanning.",
        );
        if (!cancelled) setPickedImage(null);
        return;
      }

      setScanBusy(true);
      try {
        if (!hasCompletedCalibration) {
          await submitReferenceCalibration(
            pick,
            user.id,
            DEFAULT_CALIBRATION_REFERENCE,
          );
          if (cancelled) return;
          await setUserCalibrated(user.id);
          setHasCompletedCalibration(true);
          clearImage();
          Alert.alert(
            "Calibration saved",
            "Calibration complete. You can now scan food images.",
          );
          return;
        }

        const res = await analyzeFoodFromImage(pick, user.id);
        if (cancelled) return;
        if (!res) {
          setDetectedCalories(null);
          setDetectedFoodName(null);
          Alert.alert("No result", "Could not detect food calories from this image.");
          return;
        }
        setDetectedCalories(res.calories);
        setDetectedFoodName(res.foodName);
      } catch (e) {
        if (cancelled) return;
        setDetectedCalories(null);
        setDetectedFoodName(null);
        Alert.alert(
          hasCompletedCalibration ? "Scan failed" : "Calibration failed",
          e instanceof Error ? e.message : "Unable to process this image.",
        );
      } finally {
        if (!cancelled) setScanBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pickedImage, calibrationHydrated, user?.id, hasCompletedCalibration, clearImage]);

  const showMealPicker = useMemo(
    () =>
      hasCompletedCalibration &&
      detectedCalories != null &&
      detectedFoodName != null &&
      !scanBusy,
    [hasCompletedCalibration, detectedCalories, detectedFoodName, scanBusy],
  );

  const handleAddToMeal = useCallback(
    async (mealType: MealType) => {
      if (!detectedFoodName || detectedCalories == null) return;
      try {
        await addMealLog(mealType, detectedFoodName, detectedCalories);
        Alert.alert("Logged", `Added to ${MEAL_LABELS[mealType]}.`);
        clearImage();
      } catch (e) {
        Alert.alert(
          "Unable to save log",
          e instanceof Error ? e.message : "Try again in a moment.",
        );
      }
    },
    [addMealLog, detectedCalories, detectedFoodName, clearImage],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.heading}>Scan food</Text>
        <Text style={styles.subheading}>
          {!user?.id
            ? "Sign in with an account that returns user id to enable scanning."
            : !calibrationHydrated
              ? "Loading calibration state..."
              : !hasCompletedCalibration
                ? "First image calibrates with a card-sized reference."
                : "Take or upload a meal photo to estimate calories."}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <View style={styles.actions}>
          <CustomButton
            title="Take photo"
            onPress={pickFromCamera}
            style={styles.actionBtn}
            disabled={!user?.id || !calibrationHydrated || scanBusy}
          />
          <CustomButton
            title="Upload photo"
            onPress={pickFromLibrary}
            variant="outline"
            style={styles.actionBtn}
            disabled={!user?.id || !calibrationHydrated || scanBusy}
          />
        </View>

        {scanBusy ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.busyText}>Processing image...</Text>
          </View>
        ) : null}

        <View style={styles.previewHeader}>
          <Text style={styles.previewLabel}>Preview</Text>
          {pickedImage?.uri ? (
            <TouchableOpacity onPress={clearImage} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={22} color={Colors.error} />
            </TouchableOpacity>
          ) : (
            <View style={styles.deleteBtnPlaceholder} />
          )}
        </View>

        <View style={styles.previewWrap}>
          {pickedImage?.uri ? (
            <Image
              source={{ uri: pickedImage.uri }}
              style={styles.previewImage}
              contentFit="contain"
              transition={200}
              accessibilityLabel="Selected image preview"
            />
          ) : (
            <Text style={styles.placeholder}>
              {Platform.OS === "web"
                ? "No image selected."
                : "Take a photo or upload one."}
            </Text>
          )}
        </View>

        <CalorieEstimateCard calories={detectedCalories} foodName={detectedFoodName} />

        {showMealPicker ? (
          <View style={styles.mealLogSection}>
            <Text style={styles.mealLogSectionTitle}>Add detected food to</Text>
            <View style={styles.mealCardsRow}>
              {MEAL_ORDER.map((meal) => (
                <TouchableOpacity
                  key={meal}
                  style={styles.mealPickCard}
                  onPress={() => void handleAddToMeal(meal)}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.mealPickIconWrap,
                      { backgroundColor: `${MEAL_CARD_COLORS[meal]}18` },
                    ]}
                  >
                    <Ionicons
                      name={MEAL_CARD_ICONS[meal]}
                      size={22}
                      color={MEAL_CARD_COLORS[meal]}
                    />
                  </View>
                  <Text style={styles.mealPickLabel}>{MEAL_LABELS[meal]}</Text>
                  <Text style={styles.mealPickAction}>Tap to add</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.discardBtn} onPress={clearImage}>
              <Text style={styles.discardBtnText}>Discard</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
    fontSize: FontSize.xl + 2,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    width: "100%",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  busyText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.primary,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  previewLabel: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  deleteBtnPlaceholder: {
    width: 28,
    height: 28,
  },
  previewWrap: {
    minHeight: 260,
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
    minHeight: 260,
    aspectRatio: 1,
  },
  placeholder: {
    fontSize: FontSize.md,
    color: Colors.placeholder,
    textAlign: "center",
    padding: Spacing.lg,
  },
  mealLogSection: {
    marginTop: Spacing.lg,
  },
  mealLogSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  mealCardsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  mealPickCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: "center",
  },
  mealPickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  mealPickLabel: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
  },
  mealPickAction: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  discardBtn: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  discardBtnText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
});
