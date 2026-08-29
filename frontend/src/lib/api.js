export async function predict(formData) {
  const response = await fetch("/api/predict", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Prediction failed (${response.status})`);
  }
  return response.json();
}

export async function fetchHistory() {
  const response = await fetch("/api/history");
  if (!response.ok) {
    throw new Error(`History fetch failed (${response.status})`);
  }
  return response.json();
}
