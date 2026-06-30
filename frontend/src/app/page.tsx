import { fetchComicCatalog } from "@/services/comicCms.service";
import { HomePage } from "./_components/HomePage";
// import { fetchStories } from "@/services/comic.service";

export default async function Page() {
  const comics = await fetchComicCatalog().catch(() => []);

  return <HomePage initialComics={comics} />;
}
