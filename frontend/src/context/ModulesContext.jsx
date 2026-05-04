/**
 * ModulesContext — single source of truth for all module data.
 *
 * Why a Context instead of calling useModules() in each component?
 * useModules() reads from localStorage independently in every component
 * that calls it. So when UploadModulePage adds a module, AppShell's
 * copy doesn't re-render — it's a separate useState instance.
 *
 * With a Context, there is ONE useState at the top of the tree.
 * Any component that calls useModulesContext() shares the same state,
 * so adding a module in the upload page instantly updates the sidebar.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { MODULES as STATIC_MODULES } from "../lib/modulesData";

const STORAGE_KEY = "cyber-vidya-uploaded-modules";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(modules) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
  } catch (e) {
    console.error("Failed to save modules", e);
  }
}

const ModulesContext = createContext(null);

export function ModulesProvider({ children }) {
  const [uploadedModules, setUploadedModules] = useState(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(uploadedModules);
  }, [uploadedModules]);

  const addModule = useCallback((mod) => {
    setUploadedModules((prev) => {
      const filtered = prev.filter((m) => m.id !== mod.id);
      return [...filtered, mod];
    });
  }, []);

  const removeModule = useCallback((id) => {
    setUploadedModules((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const allModules = [...STATIC_MODULES, ...uploadedModules];

  return (
    <ModulesContext.Provider value={{ allModules, uploadedModules, addModule, removeModule }}>
      {children}
    </ModulesContext.Provider>
  );
}

/** Use this everywhere instead of useModules() */
export function useModulesContext() {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error("useModulesContext must be used inside <ModulesProvider>");
  return ctx;
}
