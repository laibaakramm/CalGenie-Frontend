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
} from "react-native";
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
import { upsertDailyCalorieGoal } from "../../services/dashboardService";
import { isAuthenticatedApiToken } from "../../store/dashboardOverviewStore";
import { register as registerApi } from "../../services/authService";
import { useAuth } from "../../store/authStore";
import type { RootStackParamList } from "../../types";
import { BorderRadius, Colors, FontSize, Spacing } from "../../utils/theme";

type WeightSuggestion = "Gain" | "Maintain" | "Lose";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const { setSession, setDailyCalorieGoal } = useAuth();

  const [step, setStep] = useState<"profile" | "goal">("profile");
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

    const goalNum = Number(dailyCalorieGoal);
    if (!Number.isFinite(goalNum) || goalNum <= 0) {
      setDailyGoalError("Enter a valid daily calorie goal");
      return;
    }

    try {
      if (isAuthenticatedApiToken(sessionToken)) {
        await upsertDailyCalorieGoal(sessionToken!, goalNum);
      }
      setDailyCalorieGoal(goalNum);
      navigation.replace("MainTabs");
    } catch (e) {
      setApiError(
        e instanceof Error
          ? e.message
          : "Unable to save goal right now. Please try again.",
      );
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Your Account</Text>
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
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
          leftIcon={<UserIcon />}
          autoComplete="name"
        />
        <CustomInput
          label="Email Address"
          type="email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          leftIcon={<MailIcon />}
          autoComplete="email"
        />
        <CustomInput
          label="Password"
          type="password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry={!showPassword}
          leftIcon={<LockIcon />}
          rightIcon={<EyeIcon />}
          onRightIconPress={() => setShowPassword((p) => !p)}
          autoComplete="password-new"
        />
        <CustomInput
          label="Age"
          value={age}
          onChangeText={setAge}
          error={errors.age}
          keyboardType="number-pad"
          placeholder="e.g. 25"
        />
        <CustomInput
          label="Gender"
          value={gender}
          onChangeText={setGender}
          error={errors.gender}
          rightIcon={<DropdownIcon />}
          placeholder="e.g. Male"
        />
        <CustomInput
          label="Height (cm)"
          value={height}
          onChangeText={setHeight}
          error={errors.height}
          keyboardType="number-pad"
          placeholder="e.g. 175"
        />
        <CustomInput
          label="Weight (kg)"
          value={weight}
          onChangeText={setWeight}
          error={errors.weight}
          keyboardType="decimal-pad"
          placeholder="e.g. 70"
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
              label="Daily calorie goal (kcal)"
              value={dailyCalorieGoal}
              onChangeText={setDailyCalorieGoalInput}
              error={dailyGoalError}
              keyboardType="numeric"
              placeholder="e.g. 2000"
            />
          </View>
        ) : null}

        {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}

        <View style={styles.scrollBottomPadding} />
      </ScrollView>

      <View style={styles.fixedFooter}>
        <CustomButton
          title={
            step === "profile" ? "Create Account" : "Continue to Dashboard"
          }
          onPress={handlePrimaryAction}
          style={styles.createButton}
          rightIcon={<ArrowRightIcon size={18} />}
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
    backgroundColor: Colors.background,
  },
  header: {
    marginTop: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
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
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  goalTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  profileHintWrap: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileHint: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    fontWeight: "500",
  },
  goalStepWrap: {
    marginTop: Spacing.lg,
  },
  bmiCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  bmiValue: {
    fontSize: FontSize.xl + 4,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  bmiUnit: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  bmiCategoryText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  suggestionText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
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
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl + Spacing.md,
    backgroundColor: Colors.background,
  },
  createButton: {
    backgroundColor: Colors.primary,
  },
});
