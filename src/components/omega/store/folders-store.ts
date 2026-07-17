"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createUserStorage } from "@/lib/user-storage";

export interface ChatFolder {
  id: string;
  name: string;
  sessionIds: string[];
  createdAt: number;
}

interface FoldersState {
  folders: Record<string, ChatFolder>;
  order: string[];

  createFolder: (name: string) => string;
  deleteFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
  moveToFolder: (sessionId: string, folderId: string | null) => void;
  getFolderName: (id: string) => string;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useFoldersStore = create<FoldersState>()(
  persist(
    (set, get) => ({
      folders: {},
      order: [],

      createFolder: (name) => {
        const id = uid();
        set((s) => ({
          folders: { ...s.folders, [id]: { id, name, sessionIds: [], createdAt: Date.now() } },
          order: [...s.order, id],
        }));
        return id;
      },

      deleteFolder: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.folders;
          return { folders: rest, order: s.order.filter((x) => x !== id) };
        });
      },

      renameFolder: (id, name) =>
        set((s) => ({
          folders: s.folders[id]
            ? { ...s.folders, [id]: { ...s.folders[id], name } }
            : s.folders,
        })),

      moveToFolder: (sessionId, folderId) =>
        set((s) => {
          // Remove from all folders
          const folders = { ...s.folders };
          for (const f of Object.values(folders)) {
            f.sessionIds = f.sessionIds.filter((x) => x !== sessionId);
          }
          // Add to target folder
          if (folderId && folders[folderId]) {
            folders[folderId] = {
              ...folders[folderId],
              sessionIds: [...folders[folderId].sessionIds, sessionId],
            };
          }
          return { folders };
        }),

      getFolderName: (id) => get().folders[id]?.name || "",
    }),
    { name: "omega_folders_v1", storage: createUserStorage() }
  )
);
