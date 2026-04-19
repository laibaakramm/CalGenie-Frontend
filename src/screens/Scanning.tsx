import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  isUserCalibrated,
  setUserCalibrated,
} from "../services/calibrationStorage";
import {
  analyzeFoodFromImage,
  type PickedImage,
  submitReferenceCalibration,
} from "../services/foodDetectionService";
import { useAuth } from "../store/authStore";
import {
  MEAL_LABELS,
  MEAL_ORDER,
  type MealType,
  useMealLogs,
} from "../store/mealLogStore";
import { BorderRadius, FontSize, Spacing } from "../utils/theme";

const BG = "#121212";
const SHEET = "#1E1E1E";
const GREEN = "#50C878";
const CORAL = "#ff9587";

const DEFAULT_CALIBRATION_REFERENCE = "credit_card" as const;

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
  const [editFoodName, setEditFoodName] = useState("");
  const [editCaloriesText, setEditCaloriesText] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [hasCompletedCalibration, setHasCompletedCalibration] = useState(false);
  const [calibrationHydrated, setCalibrationHydrated] = useState(false);

  const firstName = useMemo(() => {
    const n = user?.name?.trim();
    if (!n) return "User";
    return n.split(/\s+/)[0] ?? "User";
  }, [user?.name]);

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
    setEditFoodName("");
    setEditCaloriesText("");
  }, []);

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
          setEditFoodName("");
          setEditCaloriesText("");
          Alert.alert(
            "No result",
            "Could not detect food calories from this image.",
          );
          return;
        }
        setDetectedCalories(res.calories);
        setDetectedFoodName(res.foodName);
        setEditFoodName(res.foodName);
        setEditCaloriesText(String(res.calories));
      } catch (e) {
        if (cancelled) return;
        setDetectedCalories(null);
        setDetectedFoodName(null);
        setEditFoodName("");
        setEditCaloriesText("");
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
  }, [
    pickedImage,
    calibrationHydrated,
    user?.id,
    hasCompletedCalibration,
    clearImage,
  ]);

  const showConfirmSheet =
    hasCompletedCalibration &&
    pickedImage?.uri &&
    !scanBusy &&
    detectedCalories != null &&
    detectedFoodName != null;

  const pickMealAndAdd = useCallback(
    (mealType: MealType) => {
      const name = editFoodName.trim() || detectedFoodName || "";
      const cals = Math.round(Number(editCaloriesText));
      if (!name || !Number.isFinite(cals) || cals < 0) {
        Alert.alert("Invalid details", "Enter a food name and valid calories.");
        return;
      }
      void (async () => {
        try {
          await addMealLog(mealType, name, cals);
          Alert.alert("Logged", `Added to ${MEAL_LABELS[mealType]}.`);
          clearImage();
        } catch (e) {
          Alert.alert(
            "Unable to save log",
            e instanceof Error ? e.message : "Try again in a moment.",
          );
        }
      })();
    },
    [addMealLog, clearImage, detectedFoodName, editCaloriesText, editFoodName],
  );

  const onAddToDiary = useCallback(() => {
    Alert.alert("Add to diary", "Which meal?", [
      ...MEAL_ORDER.map((meal) => ({
        text: MEAL_LABELS[meal],
        onPress: () => pickMealAndAdd(meal),
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  }, [pickMealAndAdd]);

  const controlsDisabled = !user?.id || !calibrationHydrated || scanBusy;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {firstName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.headerTitle}>CalGenie</Text>
          {/* <TouchableOpacity
            style={styles.bellWrap}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color="#E8E8E8" />
            <View style={styles.bellDot} />
          </TouchableOpacity> */}
        </View>

        {!calibrationHydrated ? (
          <Text style={styles.hint}>Loading calibration state...</Text>
        ) : !user?.id ? (
          <Text style={styles.hint}>
            Sign in with an account that returns a user id to enable scanning.
          </Text>
        ) : !hasCompletedCalibration ? (
          <Text style={styles.hint}>
            First image calibrates with a card-sized reference in frame.
          </Text>
        ) : null}

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[
              styles.topActionBtn,
              controlsDisabled && styles.topActionBtnDisabled,
            ]}
            onPress={pickFromCamera}
            disabled={controlsDisabled}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={22} color={GREEN} />
            <Text style={styles.topActionLabel}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.topActionBtn,
              controlsDisabled && styles.topActionBtnDisabled,
            ]}
            onPress={pickFromLibrary}
            disabled={controlsDisabled}
            activeOpacity={0.85}
          >
            <Ionicons name="image-outline" size={22} color={GREEN} />
            <Text style={styles.topActionLabel}>Upload Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewBlock}>
          <View style={styles.previewInner}>
            {pickedImage?.uri ? (
              <Image
                source={{ uri: pickedImage.uri }}
                style={styles.previewImage}
                contentFit="cover"
                transition={200}
                accessibilityLabel="Selected meal image"
              />
            ) : (
              <View style={styles.previewEmpty}>
                <Ionicons name="scan-outline" size={40} color="#4A4A4A" />
                <Text style={styles.previewEmptyText}>
                  Take a photo or upload from your library
                </Text>
              </View>
            )}
            <View style={styles.scanFrame} pointerEvents="none" />
            {scanBusy ? (
              <View style={styles.scanOverlay} pointerEvents="none">
                <Text style={styles.scanOverlayText}>
                  SCANNING... PLEASE WAIT
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {showConfirmSheet ? (
          <View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm,
              },
            ]}
          >
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Confirm Details</Text>
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>98% MATCH</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>FOOD NAME</Text>
            <View style={styles.fieldRow}>
              <TextInput
                value={editFoodName}
                onChangeText={setEditFoodName}
                placeholder="Food name"
                placeholderTextColor="#6B6B6B"
                style={styles.fieldInput}
                editable={!scanBusy}
              />
              <Ionicons name="pencil" size={18} color="#CFCFCF" />
            </View>

            <Text style={styles.fieldLabel}>ESTIMATED CALORIES</Text>
            <View style={styles.fieldRow}>
              <View style={styles.caloriesInputRow}>
                <TextInput
                  value={editCaloriesText}
                  onChangeText={setEditCaloriesText}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#6B6B6B"
                  style={styles.caloriesNumber}
                  editable={!scanBusy}
                />
                <Text style={styles.caloriesUnit}>kcal</Text>
              </View>
              <Ionicons name="pencil" size={18} color="#CFCFCF" />
            </View>

            <TouchableOpacity
              style={styles.discardBtn}
              onPress={clearImage}
              activeOpacity={0.85}
            >
              <Text style={styles.discardBtnText}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={onAddToDiary}
              activeOpacity={0.9}
            >
              <Text style={styles.addBtnText}>Add to Diary</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingBottom: Math.max(insets.bottom, Spacing.md) }}>
            {scanBusy ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color={GREEN} />
                <Text style={styles.inlineLoadingText}>
                  Processing image...
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
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
  headerTitle: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: FontSize.lg + 2,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
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
  hint: {
    fontSize: FontSize.sm,
    color: "#9A9A9A",
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  topActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  topActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: `${GREEN}55`,
  },
  topActionBtnDisabled: {
    opacity: 0.45,
  },
  topActionLabel: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: "#E8E8E8",
  },
  previewBlock: {
    flex: 1,
    minHeight: 280,
    marginBottom: Spacing.md,
  },
  previewInner: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    backgroundColor: "#0D0D0D",
    minHeight: 280,
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  previewEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  previewEmptyText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: "#7A7A7A",
    textAlign: "center",
    fontWeight: "600",
  },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    margin: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: `${GREEN}99`,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
  },
  scanOverlayText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  sheet: {
    backgroundColor: SHEET,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginHorizontal: -Spacing.lg,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  matchBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: `${GREEN}22`,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: 0.3,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8E8E8E",
    letterSpacing: 1.4,
    marginBottom: Spacing.sm,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  fieldInput: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: "#FFFFFF",
    paddingVertical: 4,
  },
  caloriesInputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  caloriesNumber: {
    fontSize: FontSize.xl + 4,
    fontWeight: "800",
    color: GREEN,
    minWidth: 48,
    paddingVertical: 0,
  },
  caloriesUnit: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  discardBtn: {
    borderRadius: BorderRadius.lg,
    backgroundColor: "#3A3A3A",
    paddingVertical: Spacing.md + 2,
    alignItems: "center",
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: `${CORAL}55`,
  },
  discardBtnText: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: "#F0F0F0",
  },
  addBtn: {
    borderRadius: BorderRadius.lg,
    backgroundColor: GREEN,
    paddingVertical: Spacing.md + 2,
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  addBtnText: {
    fontSize: FontSize.md,
    fontWeight: "900",
    color: "#0A0A0A",
  },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  inlineLoadingText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: GREEN,
  },
});
