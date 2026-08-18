import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { normalizeName } from "@/lib/utils/slug";
import { Tag } from "lucide-react";

export default async function GenresIndexPage() {
  const db = getServerSupabase();
  let categories: { id: string; name: string }[] = [];

  if (db) {
    const { data } = await db.from("categories").select("id, name").order("name");
    categories = (data ?? []) as { id: string; name: string }[];
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-3">
            <Tag className="text-primary" size={32} />
            Danh Sách Thể Loại
          </h1>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Khám phá các bộ truyện tranh theo thể loại yêu thích của bạn.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
            Chưa có thể loại nào.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const slug = normalizeName(cat.name);
              return (
                <Link
                  key={cat.id}
                  href={`${ROUTES.GENRES}/${slug}`}
                  className="group flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-primary transition-all duration-300"
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors truncate">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
