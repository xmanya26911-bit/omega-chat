// Google Drive sync service
// Uses the user's OAuth access token to save/load sessions
// via the Google Drive REST API v3.

import { getAccessToken } from "./access-token";

const DRIVE_FOLDER = "omega-cloud";
const SESSIONS_FILE = "omega_sessions_v1.json";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    getAccessToken() ||
    (document.cookie.match(/\bomega_at=([^;]*)/) || [])[1] ||
    null
  );
}

async function driveFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  if (!token) throw new Error("No access token — sign in first");
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/** Find the omega-cloud folder, creating it if missing. */
async function ensureDriveFolder(): Promise<string> {
  // Look for existing folder
  const q = encodeURIComponent(
    `name='${DRIVE_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`
  );
  const data = await res.json();
  if (data.files?.length) return data.files[0].id;

  // Create folder
  const create = await driveFetch(
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: DRIVE_FOLDER,
        mimeType: "application/vnd.google-apps.folder",
      }),
    }
  );
  const created = await create.json();
  return created.id;
}

/** Find the sessions file in the drive folder. */
async function findSessionsFile(
  folderId: string
): Promise<{ id: string; name: string } | null> {
  const q = encodeURIComponent(
    `name='${SESSIONS_FILE}' and '${folderId}' in parents and trashed=false`
  );
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`
  );
  const data = await res.json();
  return data.files?.[0] || null;
}

/** Save data to Google Drive. Creates or updates the sessions JSON file. */
export async function saveToDrive(data: unknown): Promise<boolean> {
  try {
    const folderId = await ensureDriveFolder();
    const existing = await findSessionsFile(folderId);
    const body = JSON.stringify(data, null, 2);
    const blob = new Blob([body], { type: "application/json" });

    if (existing) {
      // Update existing file
      await driveFetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        }
      );
    } else {
      // Create new file
      const metadata = JSON.stringify({
        name: SESSIONS_FILE,
        parents: [folderId],
      });
      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob([metadata], { type: "application/json" })
      );
      formData.append("file", blob);

      await driveFetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          body: formData,
        }
      );
    }
    return true;
  } catch (err) {
    console.error("Drive save failed:", err);
    return false;
  }
}

/** Load data from Google Drive. Returns null if no file or error. */
export async function loadFromDrive<T = unknown>(): Promise<T | null> {
  try {
    const folderId = await ensureDriveFolder();
    const existing = await findSessionsFile(folderId);
    if (!existing) return null;

    const res = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error("Drive load failed:", err);
    return null;
  }
}

/** Check if Drive is connected (token exists + API reachable). */
export async function checkDriveConnection(): Promise<boolean> {
  try {
    const token = getToken();
    if (!token) return false;
    const res = await driveFetch(
      "https://www.googleapis.com/drive/v3/about?fields=user"
    );
    return res.ok;
  } catch {
    return false;
  }
}
