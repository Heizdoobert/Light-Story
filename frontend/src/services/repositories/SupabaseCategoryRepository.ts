import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/entities";

export class SupabaseCategoryRepository {
  async getCategories(): Promise<Category[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Lỗi lấy danh sách thể loại:", error);
      return [];
    }
    return (data ?? []) as Category[];
  }
}
