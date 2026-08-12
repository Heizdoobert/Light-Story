"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api/apiClient";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";

export interface FormOption {
  id: string;
  name: string;
}

async function fetchOptions(path: string, table: string): Promise<FormOption[]> {
  try {
    const rows = await apiClient.get<FormOption[]>(path);
    if (Array.isArray(rows) && rows.length > 0) return rows;
  } catch {
    // gateway down or empty → fall through to direct table read
  }
  try {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from(table).select("id, name").order("name");
    return (data ?? []) as FormOption[];
  } catch {
    return [];
  }
}

export function useAdminFormOptions() {
  const [categories, setCategories] = useState<FormOption[]>([]);
  const [authors, setAuthors] = useState<FormOption[]>([]);
  const [translators, setTranslators] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [cats, auths, trans] = await Promise.all([
        fetchOptions(ROUTES.API.CATEGORIES, "categories"),
        fetchOptions(ROUTES.API.ADMIN.TAXONOMY("author"), "authors"),
        fetchOptions(ROUTES.API.ADMIN.TRANSLATORS, "translators"),
      ]);
      if (!active) return;
      setCategories(cats);
      setAuthors(auths);
      setTranslators(trans);
      setLoading(false);
      if (cats.length === 0 && auths.length === 0 && trans.length === 0) {
        toast.error("Không thể tải danh sách thể loại, tác giả và dịch giả từ máy chủ");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return { categories, authors, translators, loading };
}
