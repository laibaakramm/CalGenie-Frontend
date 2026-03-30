export interface DetectedFoodResult {
  calories: number;
  foodName: string;
}

/**
 * Placeholder for YOLO-based food detection.
 * When the backend/model is connected, replace the implementation to call it.
 */
export async function detectCaloriesFromImage(
  _imageUri: string,
): Promise<DetectedFoodResult | null> {
  return null;
}

