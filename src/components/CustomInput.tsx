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
import { BorderRadius, Colors, FontSize, Spacing } from "../utils/theme";

export interface CustomInputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  type?: InputType;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
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
  ...rest
}: CustomInputProps) {
  const isPassword = type === "password" || secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
          ]}
          placeholder={placeholder ?? getPlaceholder(type)}
          placeholderTextColor={Colors.placeholder}
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
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
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
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
