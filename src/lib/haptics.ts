export function tap(intensity: "light" | "medium" | "strong" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const map = { light: 8, medium: 12, strong: 20 };
  navigator.vibrate(map[intensity]);
}
