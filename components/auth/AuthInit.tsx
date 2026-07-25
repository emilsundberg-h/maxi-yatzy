"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";

export function AuthInit() {
  useEffect(() => {
    useAuthStore.getState().init();
  }, []);
  return null;
}
