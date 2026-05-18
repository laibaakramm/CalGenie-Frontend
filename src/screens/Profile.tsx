import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomButton, CustomInput } from "../components";
import { updateProfile } from "../services/authService";
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
    if (!Number.isFinite(ageNum) || ageNum <= 0) nextErrors.age = "Enter a valid age";
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
        setErrors({ general: e instanceof Error ? e.message : "Failed to sync profile to server" });
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
          <CustomInput
            label="GENDER"
            value={gender}
            onChangeText={setGender}
            placeholder="male or female"
            error={errors.gender}
            variant="dark"
          />

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

          {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}
          {saveMessage ? <Text style={styles.successText}>{saveMessage}</Text> : null}
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
});
