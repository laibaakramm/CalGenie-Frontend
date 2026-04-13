import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = (userId: number) => `@CalGenie/calibrated/${userId}`;

export async function isUserCalibrated(userId: number): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY(userId))) === "1";
  } catch {
    return false;
  }
}

export async function setUserCalibrated(userId: number): Promise<void> {
  await AsyncStorage.setItem(KEY(userId), "1");
}
