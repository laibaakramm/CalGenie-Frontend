import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CustomButton, CustomInput } from "../../components";
import { login as loginApi } from "../../services/authService";
import { useAuth } from "../../store/authStore";
import type { RootStackParamList } from "../../types";
import { Colors, FontSize, Spacing } from "../../utils/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
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
      <View style={styles.content}>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Sign in to continue</Text>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <CustomInput
          label="Email"
          type="email"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          autoComplete="email"
        />
        <CustomInput
          label="Password"
          type="password"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          autoComplete="password"
        />

        <CustomButton
          title="Log in"
          onPress={handleLogin}
          style={styles.button}
          loading={loading}
          disabled={loading}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={goToRegister} activeOpacity={0.7}>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
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
  button: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  link: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
});
