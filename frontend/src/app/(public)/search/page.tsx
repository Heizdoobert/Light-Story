import type { Metadata } from "next";
import { SearchPageContent } from "@/components/comics/SearchPageContent";

export const metadata: Metadata = {
  title: "Tìm kiếm truyện - Light Story",
  description:
    "Tìm kiếm và khám phá truyện tranh tại Light Story — theo từ khóa, thể loại, sắp xếp mới nhất.",
};

export default function SearchPage() {
  return <SearchPageContent />;
}
