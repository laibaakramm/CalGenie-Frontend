import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomButton, CustomInput } from "../components";
import { useAuth } from "../store/authStore";
import { BorderRadius, Colors, FontSize, Spacing } from "../utils/theme";

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
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSave = () => {
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

    updateUser({
      name: name.trim(),
      age: ageNum,
      weight: weightNum,
      height: heightNum,
      gender: normalizedGender,
      bmi: computed.bmi,
      bmiCategory: computed.bmiCategory,
    });
    setSaveMessage("Profile updated successfully");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.heading}>Profile</Text>
        <Text style={styles.subheading}>Your health details</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.name}>Your profile</Text>
          <Text style={styles.cardHint}>
            Edit your details and save to recalculate BMI.
          </Text>
        </View>

        <View style={styles.card}>
          <CustomInput
            label="Name"
            value={name}
            onChangeText={setName}
            error={errors.name}
          />
          <CustomInput
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            error={errors.weight}
          />
          <CustomInput
            label="Height (cm)"
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
            error={errors.height}
          />
          <CustomInput
            label="Age"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            error={errors.age}
          />
          <CustomInput
            label="Gender"
            value={gender}
            onChangeText={setGender}
            placeholder="male or female"
            error={errors.gender}
          />
          <View style={styles.metricsCard}>
            <Row
              label="BMI"
              value={computed.bmi > 0 ? computed.bmi.toFixed(1) : "Not available"}
            />
            <Row label="BMI Category" value={computed.bmiCategory} />
            <Row label="Suggestion" value={computed.suggestion} isLast />
          </View>
          {saveMessage ? <Text style={styles.successText}>{saveMessage}</Text> : null}
          <CustomButton title="Save Profile" onPress={handleSave} />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast ? styles.lastRow : null]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
    fontSize: FontSize.xl + 4,
    fontWeight: "700",
    color: Colors.text,
  },
  subheading: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  cardHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  metricsCard: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    textTransform: "capitalize",
  },
  successText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
});

