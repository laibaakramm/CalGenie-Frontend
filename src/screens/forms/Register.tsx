import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { submitReferenceCalibration } from "../../services/foodDetectionService";
import { setUserCalibrated } from "../../services/calibrationStorage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRightIcon,
  BackArrowIcon,
  CustomButton,
  CustomInput,
  DropdownIcon,
  EyeIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from "../../components";
import { register as registerApi } from "../../services/authService";
import { upsertDailyCalorieGoal } from "../../services/dashboardService";
import { useAuth } from "../../store/authStore";
import { isAuthenticatedApiToken } from "../../store/dashboardOverviewStore";
import type { RootStackParamList } from "../../types";
import { Design } from "../../utils/designSystem";
import { BorderRadius, FontSize, Spacing } from "../../utils/theme";

type WeightSuggestion = "Gain" | "Maintain" | "Lose";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const { setSession, setDailyCalorieGoal, user } = useAuth();

  const [step, setStep] = useState<"profile" | "goal" | "calibration">("profile");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState<string | null>(null);
  const [bmiSuggestion, setBmiSuggestion] = useState<WeightSuggestion | null>(
    null,
  );

  const [dailyCalorieGoal, setDailyCalorieGoalInput] = useState("");
  const [dailyGoalError, setDailyGoalError] = useState<string | undefined>();
  const [calibrationImage, setCalibrationImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateProfile = (): boolean => {
    const next: Record<string, string> = {};

    const ageNum = Number(age);
    const heightNum = Number(height);
    const weightNum = Number(weight);

    if (!fullName.trim()) next.fullName = "Full name is required";

    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email";

    if (!password) next.password = "Password is required";

    if (!age.trim()) next.age = "Age is required";
    else if (!Number.isFinite(ageNum) || ageNum <= 0)
      next.age = "Enter a valid age";

    if (!gender.trim()) next.gender = "Gender is required";
    else {
      const normalized = gender.trim().toLowerCase();
      const genderValue = normalized.startsWith("m")
        ? "male"
        : normalized.startsWith("f")
          ? "female"
          : normalized;
      if (genderValue !== "male" && genderValue !== "female") {
        next.gender = "Gender must be male or female";
      }
    }

    if (!height.trim()) next.height = "Height is required";
    else if (!Number.isFinite(heightNum) || heightNum <= 0)
      next.height = "Enter a valid height";

    if (!weight.trim()) next.weight = "Weight is required";
    else if (!Number.isFinite(weightNum) || weightNum <= 0)
      next.weight = "Enter a valid weight";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const getSuggestionFromBmiCategory = (category: string): WeightSuggestion => {
    const c = category.trim().toLowerCase();

    if (
      c.includes("gain") ||
      c.includes("under") ||
      c.includes("underweight")
    ) {
      return "Gain";
    }

    if (c.includes("maintain") || c.includes("normal")) {
      return "Maintain";
    }

    if (
      c.includes("lose") ||
      c.includes("over") ||
      c.includes("obese") ||
      c.includes("overweight")
    ) {
      return "Lose";
    }

    return "Maintain";
  };

  const normalizeGenderForApi = (value: string): "male" | "female" => {
    const normalized = value.trim().toLowerCase();
    if (normalized.startsWith("m")) return "male";
    return "female";
  };

  const handlePrimaryAction = async () => {
    setApiError(null);
    setDailyGoalError(undefined);

    if (step === "profile") {
      if (!validateProfile()) return;
      setLoading(true);

      try {
        const res = await registerApi({
          name: fullName.trim(),
          email: email.trim(),
          password,
          weight: Number(weight),
          height: Number(height),
          age: Number(age),
          gender: normalizeGenderForApi(gender),
        });

        setSession(res.token, res.user);
        setSessionToken(res.token);

        setBmi(res.user.bmi);
        setBmiCategory(res.user.bmiCategory);
        setBmiSuggestion(getSuggestionFromBmiCategory(res.user.bmiCategory));

        setStep("goal");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Registration failed";
        setApiError(message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === "goal") {
      const goalNum = Number(dailyCalorieGoal);
      if (!Number.isFinite(goalNum) || goalNum <= 0) {
        setDailyGoalError("Enter a valid daily calorie goal");
        return;
      }

      setLoading(true);
      try {
        if (isAuthenticatedApiToken(sessionToken)) {
          await upsertDailyCalorieGoal(sessionToken!, goalNum);
        }
        setDailyCalorieGoal(goalNum);
        setStep("calibration");
      } catch (e) {
        setApiError(
          e instanceof Error
            ? e.message
            : "Unable to save goal right now. Please try again.",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === "calibration") {
      if (calibrationImage && user?.id) {
        setLoading(true);
        try {
          await submitReferenceCalibration(
            {
              uri: calibrationImage.uri,
              mimeType: calibrationImage.mimeType ?? null,
              fileName: calibrationImage.fileName ?? null,
            },
            user.id,
            "credit_card"
          );
          await setUserCalibrated(user.id);
        } catch (e) {
          Alert.alert("Calibration Failed", e instanceof Error ? e.message : "Failed to calibrate.");
          setLoading(false);
          return;
        }
        setLoading(false);
      }
      navigation.replace("MainTabs");
    }
  };

  const pickCalibrationImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert("Permission needed", "Photo library access is required to upload an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setCalibrationImage(result.assets[0]);
    }
  };

  const goBack = () => {
    navigation.navigate("Login");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <BackArrowIcon color={Design.display} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>GET STARTED</Text>
        <Text style={styles.sectionTitle}>Your Profile</Text>

        <CustomInput
          label="FULL NAME"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
          leftIcon={<UserIcon color={Design.primary} />}
          autoComplete="name"
          variant="dark"
        />
        <CustomInput
          label="EMAIL ADDRESS"
          type="email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          leftIcon={<MailIcon color={Design.primary} />}
          autoComplete="email"
          variant="dark"
        />
        <CustomInput
          label="PASSWORD"
          type="password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry={!showPassword}
          leftIcon={<LockIcon color={Design.primary} />}
          rightIcon={<EyeIcon color={Design.onSurfaceVariant} />}
          onRightIconPress={() => setShowPassword((p) => !p)}
          autoComplete="password-new"
          variant="dark"
        />
        <CustomInput
          label="AGE"
          value={age}
          onChangeText={setAge}
          error={errors.age}
          keyboardType="number-pad"
          placeholder="e.g. 25"
          variant="dark"
        />
        <CustomInput
          label="GENDER"
          value={gender}
          onChangeText={setGender}
          error={errors.gender}
          rightIcon={<DropdownIcon color={Design.onSurfaceVariant} />}
          placeholder="e.g. Male"
          variant="dark"
        />
        <CustomInput
          label="HEIGHT (CM)"
          value={height}
          onChangeText={setHeight}
          error={errors.height}
          keyboardType="number-pad"
          placeholder="e.g. 175"
          variant="dark"
        />
        <CustomInput
          label="WEIGHT (KG)"
          value={weight}
          onChangeText={setWeight}
          error={errors.weight}
          keyboardType="decimal-pad"
          placeholder="e.g. 70"
          variant="dark"
        />
        {step === "profile" ? (
          <View style={styles.profileHintWrap}>
            <Text style={styles.profileHint}>
              After you create your account, we will calculate your BMI and show
              a suggested weight target.
            </Text>
          </View>
        ) : null}

        {step === "goal" ? (
          <View style={styles.goalStepWrap}>
            <Text style={styles.goalTitle}>BMI & Weight Target</Text>

            <View style={styles.bmiCard}>
              <Text style={styles.bmiValue}>
                {bmi != null ? bmi.toFixed(1) : "—"}{" "}
                <Text style={styles.bmiUnit}>BMI</Text>
              </Text>
              <Text style={styles.bmiCategoryText}>
                Category: {bmiCategory ?? "—"}
              </Text>
              <Text style={styles.suggestionText}>
                Suggested: {bmiSuggestion ?? "—"} weight
              </Text>
            </View>

            <CustomInput
              label="DAILY CALORIE GOAL (KCAL)"
              value={dailyCalorieGoal}
              onChangeText={setDailyCalorieGoalInput}
              error={dailyGoalError}
              keyboardType="numeric"
              placeholder="e.g. 2000"
              variant="dark"
            />
          </View>
        ) : null}

        {step === "calibration" ? (
          <View style={styles.goalStepWrap}>
            <Text style={styles.goalTitle}>Calibrate Camera</Text>
            <Text style={styles.profileHint}>
              Upload an image with a credit card to calibrate the app for accurate calorie tracking.
            </Text>
            
            <TouchableOpacity style={styles.uploadBtn} onPress={pickCalibrationImage}>
              <Text style={styles.uploadBtnText}>
                {calibrationImage ? "Change Image" : "Upload Image"}
              </Text>
            </TouchableOpacity>

            {calibrationImage && (
              <Image 
                source={{ uri: calibrationImage.uri }} 
                style={styles.previewImage} 
                resizeMode="cover"
              />
            )}
          </View>
        ) : null}

        {apiError ? (
          <View style={styles.apiErrorBanner}>
            <Text style={styles.errorText}>{apiError}</Text>
          </View>
        ) : null}

        <View style={styles.scrollBottomPadding} />
      </ScrollView>

      <View
        style={[
          styles.fixedFooter,
          { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md },
        ]}
      >
        <CustomButton
          title={
            step === "profile" 
              ? "Create Account" 
              : step === "goal" 
                ? "Continue to Calibration" 
                : calibrationImage 
                  ? "Calibrate & Finish"
                  : "Skip & Finish"
          }
          onPress={handlePrimaryAction}
          style={styles.createButton}
          textStyle={styles.createButtonText}
          rightIcon={<ArrowRightIcon size={18} color={Design.onPrimary} />}
          loading={loading}
          disabled={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Design.surface,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Design.display,
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Design.primary,
    letterSpacing: 1.6,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.xl + 2,
    fontWeight: "800",
    color: Design.display,
    marginBottom: Spacing.lg,
    letterSpacing: -0.3,
  },
  goalTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Design.display,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  profileHintWrap: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Design.surfaceContainerHigh,
  },
  profileHint: {
    color: Design.onSurfaceVariant,
    fontSize: FontSize.sm,
    lineHeight: 22,
    fontWeight: "500",
  },
  goalStepWrap: {
    marginTop: Spacing.lg,
  },
  bmiCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Design.surfaceContainerHigh,
    marginBottom: Spacing.md,
  },
  bmiValue: {
    fontSize: FontSize.xl + 4,
    fontWeight: "800",
    color: Design.display,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  bmiUnit: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Design.onSurfaceVariant,
  },
  bmiCategoryText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Design.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  suggestionText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Design.primaryContainer,
  },
  apiErrorBanner: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Design.surfaceContainerHigh,
  },
  errorText: {
    color: Design.errorSoft,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  goalGap: {
    width: Spacing.sm,
  },
  scrollBottomPadding: {
    height: Spacing.xl,
  },
  fixedFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Design.surfaceContainerLow,
  },
  createButton: {
    backgroundColor: Design.primaryContainer,
    borderRadius: BorderRadius.lg,
    minHeight: 52,
  },
  createButtonText: {
    color: Design.onPrimary,
    fontWeight: "700",
    fontSize: FontSize.md,
  },
  uploadBtn: {
    backgroundColor: Design.surfaceContainerHighest,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Design.outlineVariant,
  },
  uploadBtnText: {
    color: Design.primary,
    fontWeight: "600",
    fontSize: FontSize.md,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
});
