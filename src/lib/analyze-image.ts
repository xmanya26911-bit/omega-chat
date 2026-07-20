"use client";

import { getAccessToken } from "./access-token";

export async function analyzeImage(
  imageData: string,
  prompt: string = "Describe this image in detail"
): Promise<string> {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  const res = await fetch("/api/analyze-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ image: imageData, prompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Analysis failed");
  }

  const data = await res.json();
  return data.description || "";
}
