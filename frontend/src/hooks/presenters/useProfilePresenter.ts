"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function useProfilePresenter() {
  const { user, profile } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return {
    user,
    profile,
    isEditModalOpen,
    setIsEditModalOpen,
  };
}
