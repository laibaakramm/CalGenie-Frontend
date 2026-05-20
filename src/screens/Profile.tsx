import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomButton, CustomInput } from "../components";
import { DEFAULT_GENDER_OPTIONS, updateProfile } from "../services/authService";
import { setUserCalibrated } from "../services/calibrationStorage";
import { submitReferenceCalibration } from "../services/foodDetectionService";
import { useAuth } from "../store/authStore";
import { Design } from "../utils/designSystem";
import { BorderRadius, FontSize, Spacing } from "../utils/theme";

function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function getWeightSuggestionFromBmi(bmi: number): string {
  if (bmi < 18.5) return "Gain weight";
  if (bmi < 25) return "Maintain weight";
  return "Lose weight";
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, token, updateUser, clearSession } = useAuth();
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [profileCalImage, setProfileCalImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [calLoading, setCalLoading] = useState(false);

  const genderOptions = DEFAULT_GENDER_OPTIONS;

  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);

  const getGenderLabel = (val: string) => {
    const option = genderOptions.find(
      (o) => o.value?.toUpperCase() === val?.toUpperCase(),
    );
    return option ? option.label : val;
  };

  const pickProfileCalibrationImage = async () => {
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
      setProfileCalImage(result.assets[0]);
    }
  };

  const handleAddCalibration = async () => {
    if (!profileCalImage || !user?.id) return;
    setCalLoading(true);
    try {
      const res = await submitReferenceCalibration(
        {
          uri: profileCalImage.uri,
          mimeType: profileCalImage.mimeType ?? null,
          fileName: profileCalImage.fileName ?? null,
        },
        user.id,
        "credit_card",
      );
      await setUserCalibrated(user.id);
      updateUser({ calibration: res.calibration });
      setProfileCalImage(null);
      Alert.alert("Calibration Added", "Camera calibrated successfully!");
    } catch (e) {
      Alert.alert(
        "Calibration Failed",
        e instanceof Error ? e.message : "Failed to calibrate.",
      );
    } finally {
      setCalLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setWeight(user.weight != null ? String(user.weight) : "");
    setHeight(user.height != null ? String(user.height) : "");
    setAge(user.age != null ? String(user.age) : "");
    setGender(user.gender != null ? String(user.gender) : "");
  }, [user]);

  const computed = useMemo(() => {
    const weightNum = Number(weight);
    const heightNum = Number(height);
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      return { bmi: 0, bmiCategory: "Unknown", suggestion: "Maintain weight" };
    }
    if (!Number.isFinite(heightNum) || heightNum <= 0) {
      return { bmi: 0, bmiCategory: "Unknown", suggestion: "Maintain weight" };
    }

    const bmi = weightNum / (heightNum / 100) ** 2;
    const bmiCategory = getBmiCategory(bmi);
    return {
      bmi,
      bmiCategory,
      suggestion: getWeightSuggestionFromBmi(bmi),
    };
  }, [height, weight]);

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    const ageNum = Number(age);
    const weightNum = Number(weight);
    const heightNum = Number(height);
    const normalizedGender = gender.trim().toLowerCase();

    if (!name.trim()) nextErrors.name = "Name is required";
    if (!Number.isFinite(ageNum) || ageNum <= 0)
      nextErrors.age = "Enter a valid age";
    if (!Number.isFinite(weightNum) || weightNum <= 0)
      nextErrors.weight = "Enter a valid weight";
    if (!Number.isFinite(heightNum) || heightNum <= 0)
      nextErrors.height = "Enter a valid height";
    if (normalizedGender !== "male" && normalizedGender !== "female") {
      nextErrors.gender = "Gender must be male or female";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSaveMessage(null);
      return;
    }

    const updates = {
      name: name.trim(),
      age: ageNum,
      weight: weightNum,
      height: heightNum,
      gender: normalizedGender,
      bmi: computed.bmi,
      bmiCategory: computed.bmiCategory,
    };

    if (token) {
      setLoading(true);
      try {
        await updateProfile(token, updates);
      } catch (e) {
        setErrors({
          general:
            e instanceof Error ? e.message : "Failed to sync profile to server",
        });
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    updateUser(updates);
    setSaveMessage("Profile updated successfully");
  };

  const handleLogout = () => {
    clearSession();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.heading}>Profile</Text>
        <Text style={styles.subheading}>
          Edit your details — boundaries use tone, not harsh lines.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Health snapshot</Text>
          <Text style={styles.introBody}>
            Save to sync your profile and refresh BMI from height and weight.
          </Text>
        </View>

        <View style={styles.card}>
          <CustomInput
            label="NAME"
            value={name}
            onChangeText={setName}
            error={errors.name}
            variant="dark"
          />
          <CustomInput
            label="WEIGHT (KG)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            error={errors.weight}
            variant="dark"
          />
          <CustomInput
            label="HEIGHT (CM)"
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
            error={errors.height}
            variant="dark"
          />
          <CustomInput
            label="AGE"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            error={errors.age}
            variant="dark"
          />
          <View style={{ zIndex: 1000, position: "relative" }}>
            <TouchableOpacity
              onPress={() => setIsGenderDropdownOpen((p) => !p)}
              activeOpacity={0.7}
            >
              <View pointerEvents="none">
                <CustomInput
                  label="GENDER"
                  value={getGenderLabel(gender)}
                  editable={false}
                  placeholder="Select Gender"
                  error={errors.gender}
                  rightIcon={
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={Design.onSurfaceVariant}
                    />
                  }
                  variant="dark"
                />
              </View>
            </TouchableOpacity>
            {isGenderDropdownOpen && (
              <View style={styles.dropdownContainer}>
                {genderOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setGender(opt.value);
                      setIsGenderDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        gender?.toUpperCase() === opt.value?.toUpperCase() &&
                          styles.dropdownItemTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {gender?.toUpperCase() === opt.value?.toUpperCase() && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={Design.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.metricsSectionLabel}>VITALITY METRIC</Text>
          <View style={styles.metricsCard}>
            <MetricRow
              label="BMI"
              value={computed.bmi > 0 ? computed.bmi.toFixed(1) : "—"}
              emphasize
            />
            <View style={styles.metricGap} />
            <MetricRow label="Category" value={computed.bmiCategory} />
            <View style={styles.metricGap} />
            <MetricRow label="Suggestion" value={computed.suggestion} isLast />
          </View>

          <Text style={styles.metricsSectionLabel}>CAMERA CALIBRATION</Text>
          {user?.calibration ? (
            <View style={styles.calibrationAddedCard}>
              <View style={styles.calibrationHeader}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#50C878"
                />
                <Text style={styles.calibrationAddedTitle}>
                  Calibration Permanent
                </Text>
              </View>
              <Text style={styles.calibrationAddedBody}>
                Your camera has been successfully calibrated for accurate food
                volume and calorie estimation.
              </Text>
            </View>
          ) : (
            <View style={styles.calibrationCard}>
              <Text style={styles.calibrationTitle}>
                Add Camera Calibration
              </Text>
              <Text style={styles.calibrationBody}>
                To accurately measure food volume and calories, upload an image
                with a credit card-sized reference object in the frame.
              </Text>

              <TouchableOpacity
                style={styles.profileUploadBtn}
                onPress={pickProfileCalibrationImage}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color={Design.primary}
                />
                <Text style={styles.profileUploadBtnText}>
                  {profileCalImage
                    ? "Change Image"
                    : "Select Calibration Image"}
                </Text>
              </TouchableOpacity>

              {profileCalImage && (
                <View style={styles.previewContainer}>
                  <Image
                    source={{ uri: profileCalImage.uri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <CustomButton
                    title="Add Calibration"
                    onPress={handleAddCalibration}
                    loading={calLoading}
                    disabled={calLoading}
                    style={styles.addCalButton}
                    textStyle={styles.addCalButtonText}
                  />
                </View>
              )}
            </View>
          )}

          {errors.general ? (
            <Text style={styles.errorText}>{errors.general}</Text>
          ) : null}
          {saveMessage ? (
            <Text style={styles.successText}>{saveMessage}</Text>
          ) : null}
          <CustomButton
            title="Save profile"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
            textStyle={styles.saveButtonText}
          />

          <CustomButton
            title="Logout"
            onPress={handleLogout}
            style={styles.logoutButton}
            textStyle={styles.logoutButtonText}
            variant="outline"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function MetricRow({
  label,
  value,
  emphasize = false,
  isLast = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.metricRow, isLast && styles.metricRowLast]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[styles.metricValue, emphasize && styles.metricValueEmphasis]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.surface,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: Design.secondary,
    letterSpacing: 1.6,
    marginBottom: Spacing.xs,
  },
  heading: {
    fontSize: FontSize.xl + 8,
    fontWeight: "800",
    color: Design.display,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Design.onSurfaceVariant,
    marginTop: Spacing.sm,
    maxWidth: 320,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  introCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Design.surfaceContainerHigh,
    marginBottom: Spacing.lg,
  },
  introTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Design.display,
    marginBottom: Spacing.xs,
  },
  introBody: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    color: Design.onSurfaceVariant,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Design.surfaceContainerLow,
    marginBottom: Spacing.lg,
  },
  metricsSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Design.onSurfaceVariant,
    letterSpacing: 1.4,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metricsCard: {
    borderRadius: BorderRadius.lg,
    backgroundColor: Design.surfaceContainerHigh,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  metricRowLast: {},
  metricGap: {
    height: Spacing.md,
  },
  metricLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Design.onSurfaceVariant,
    flexShrink: 0,
  },
  metricValue: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Design.display,
    textAlign: "right",
    flex: 1,
  },
  metricValueEmphasis: {
    fontSize: FontSize.xl + 2,
    fontWeight: "800",
    color: Design.primaryContainer,
    letterSpacing: -0.5,
  },
  successText: {
    fontSize: FontSize.sm,
    color: Design.primary,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Design.errorSoft,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  saveButton: {
    backgroundColor: Design.primaryContainer,
    borderRadius: BorderRadius.lg,
    minHeight: 52,
  },
  saveButtonText: {
    color: Design.onPrimary,
    fontWeight: "700",
    fontSize: FontSize.md,
  },
  logoutButton: {
    marginTop: Spacing.md,
    borderColor: Design.errorSoft,
    minHeight: 52,
  },
  logoutButtonText: {
    color: Design.errorSoft,
    fontWeight: "700",
    fontSize: FontSize.md,
  },
  calibrationCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Design.surfaceContainerHigh,
    marginBottom: Spacing.md,
  },
  calibrationTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Design.display,
    marginBottom: Spacing.xs,
  },
  calibrationBody: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Design.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  profileUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Design.surfaceContainerHighest,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Design.outlineVariant,
  },
  profileUploadBtnText: {
    color: Design.primary,
    fontWeight: "600",
    fontSize: FontSize.md,
  },
  previewContainer: {
    marginTop: Spacing.md,
    alignItems: "center",
    width: "100%",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  addCalButton: {
    backgroundColor: "#50C878",
    borderRadius: BorderRadius.lg,
    width: "100%",
    minHeight: 48,
  },
  addCalButtonText: {
    color: "#0A0A0A",
    fontWeight: "800",
    fontSize: FontSize.md,
  },
  calibrationAddedCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Design.surfaceContainerHigh,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(80, 200, 120, 0.25)",
  },
  calibrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  calibrationAddedTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: "#50C878",
  },
  calibrationAddedBody: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Design.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  calibrationDetails: {
    backgroundColor: Design.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Design.onSurfaceVariant,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Design.display,
  },
  dropdownContainer: {
    position: "absolute",
    top: 74,
    left: 0,
    right: 0,
    backgroundColor: Design.surfaceContainerHigh,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Design.outlineVariant,
    zIndex: 9999,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Design.outlineVariant,
  },
  dropdownItemText: {
    color: Design.onSurfaceVariant,
    fontSize: FontSize.md,
    fontWeight: "500",
  },
  dropdownItemTextSelected: {
    color: Design.primary,
    fontWeight: "700",
  },
});
