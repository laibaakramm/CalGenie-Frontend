
export interface DetectedFoodResult {
  calories: number;
  foodName: string;
}

export interface FoodDetection {
  foodName: string;
  confidence: number;
  weightGrams: number;
  calories: number;
  cuisine: string;
}

export interface IndianScanResult {
  success: boolean;
  totalCalories: number;
  detections: FoodDetection[];
  cuisine: string;
}

/**
 * Placeholder — not used yet
 */
export async function detectCaloriesFromImage(
  _imageUri: string,
): Promise<DetectedFoodResult | null> {
  return null;
}

/**
 * Sends food image to Indian food detection endpoint
 * POST /api/indian-scan
 */
export async function scanIndianFood(
  imageUri: string,
  userId: number,
  token: string,
): Promise<IndianScanResult> {
  const formData = new FormData();

  // Convert blob URL to file for web
  const response = await fetch(imageUri);
  const blob = await response.blob();
  formData.append("image", blob, "food.jpg");
  formData.append("userId", userId.toString());

  const res = await fetch("http://192.168.18.43:5000/api/indian-scan", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Scan failed");
  }

  return res.json();
}
