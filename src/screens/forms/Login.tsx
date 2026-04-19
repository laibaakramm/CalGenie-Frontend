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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomButton, CustomInput } from "../../components";
import { login as loginApi } from "../../services/authService";
import { useAuth } from "../../store/authStore";
import type { RootStackParamList } from "../../types";
import { Design } from "../../utils/designSystem";
import { BorderRadius, FontSize, Spacing } from "../../utils/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { setSession } = useAuth();

  const validate = (): boolean => {
    let valid = true;
    if (!email.trim()) {
      setEmailError("Email is required");
      valid = false;
    } else {
      setEmailError(undefined);
    }
    if (!password) {
      setPasswordError("Password is required");
      valid = false;
    } else {
      setPasswordError(undefined);
    }
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginApi({
        email: email.trim(),
        password,
      });

      setSession(res.token, res.user);
      navigation.replace("MainTabs");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Login failed";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    navigation.navigate("Register");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>WELCOME BACK</Text>
        <Text style={styles.heading}>Sign in</Text>
        <Text style={styles.subheading}>
          Continue your wellness journey with calm, focused tracking.
        </Text>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <CustomInput
          label="EMAIL"
          type="email"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          autoComplete="email"
          variant="dark"
        />
        <CustomInput
          label="PASSWORD"
          type="password"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          autoComplete="password"
          variant="dark"
        />

        <CustomButton
          title="Log in"
          onPress={handleLogin}
          style={styles.primaryButton}
          textStyle={styles.primaryButtonText}
          loading={loading}
          disabled={loading}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={goToRegister} activeOpacity={0.7}>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.surface,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: Design.secondary,
    letterSpacing: 1.8,
    marginBottom: Spacing.sm,
  },
  heading: {
    fontSize: FontSize.xl + 12,
    fontWeight: "800",
    color: Design.display,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: FontSize.md,
    lineHeight: 24,
    color: Design.onSurfaceVariant,
    marginBottom: Spacing.xl,
    maxWidth: 340,
  },
  errorBanner: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Design.surfaceContainerHigh,
  },
  errorText: {
    color: Design.errorSoft,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: Spacing.md,
    backgroundColor: Design.primaryContainer,
    borderRadius: BorderRadius.lg,
    minHeight: 52,
  },
  primaryButtonText: {
    color: Design.onPrimary,
    fontWeight: "700",
    fontSize: FontSize.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
    flexWrap: "wrap",
  },
  footerText: {
    fontSize: FontSize.md,
    color: Design.onSurfaceVariant,
  },
  link: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Design.primary,
  },
});
