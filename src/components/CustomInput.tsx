import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import type { InputType } from "../types";
import { Design } from "../utils/designSystem";
import { BorderRadius, Colors, FontSize, Spacing } from "../utils/theme";

export interface CustomInputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  type?: InputType;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  /** Dark charcoal field — aligns with DESIGN.md surfaces */
  variant?: "default" | "dark";
}

const getKeyboardType = (type: InputType): TextInputProps["keyboardType"] => {
  switch (type) {
    case "email":
      return "email-address";
    case "password":
    case "text":
    case "name":
    default:
      return "default";
  }
};

const getAutoCapitalize = (
  type: InputType,
): TextInputProps["autoCapitalize"] => {
  switch (type) {
    case "email":
      return "none";
    case "name":
      return "words";
    default:
      return "sentences";
  }
};

const getPlaceholder = (type: InputType): string => {
  switch (type) {
    case "email":
      return "Email address";
    case "password":
      return "Password";
    case "name":
      return "Full name";
    default:
      return "Enter text";
  }
};

export function CustomInput({
  label,
  type = "text",
  error,
  containerStyle,
  placeholder,
  secureTextEntry,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = "default",
  ...rest
}: CustomInputProps) {
  const isPassword = type === "password" || secureTextEntry;
  const isDark = variant === "dark";

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          isDark && styles.inputRowDark,
          error ? (isDark ? styles.inputErrorDark : styles.inputError) : null,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          style={[
            styles.input,
            isDark && styles.inputDark,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
          ]}
          placeholder={placeholder ?? getPlaceholder(type)}
          placeholderTextColor={isDark ? Design.secondary : Colors.placeholder}
          keyboardType={getKeyboardType(type)}
          autoCapitalize={getAutoCapitalize(type)}
          autoCorrect={type !== "email"}
          secureTextEntry={isPassword}
          accessibilityLabel={label ?? placeholder ?? getPlaceholder(type)}
          {...rest}
        />
        {rightIcon ? (
          onRightIconPress ? (
            <TouchableOpacity
              style={styles.rightIcon}
              onPress={onRightIconPress}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              {rightIcon}
            </TouchableOpacity>
          ) : (
            <View style={styles.rightIcon}>{rightIcon}</View>
          )
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const iconContainerPadding = Spacing.md;

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  labelDark: {
    color: Design.onSurfaceVariant,
    letterSpacing: 0.3,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  inputRowDark: {
    backgroundColor: Design.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Design.outlineVariant,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  inputDark: {
    color: Design.display,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.xs,
  },
  leftIcon: {
    paddingLeft: iconContainerPadding,
    justifyContent: "center",
    alignItems: "center",
  },
  rightIcon: {
    paddingRight: iconContainerPadding,
    justifyContent: "center",
    alignItems: "center",
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputErrorDark: {
    borderColor: Design.errorSoft,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  errorTextDark: {
    color: Design.errorSoft,
  },
});
