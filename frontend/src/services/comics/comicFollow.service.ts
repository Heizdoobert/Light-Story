const FOLLOWED_COMICS_STORAGE_KEY = "light-story:followed-comics";

export type FollowedComic = {
  id: string;
  title: string;
  coverUrl?: string;
  author?: string;
  status?: string;
};

function readFollowedComics(): FollowedComic[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(FOLLOWED_COMICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFollowedComics(items: FollowedComic[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      FOLLOWED_COMICS_STORAGE_KEY,
      JSON.stringify(items),
    );
  } catch {
    // Ignore storage failures in non-critical UI flow.
  }
}

export function getFollowedComics(): FollowedComic[] {
  return readFollowedComics();
}

export function isComicFollowed(comicId: string): boolean {
  return getFollowedComics().some((item) => item.id === comicId);
}

export function toggleFollowComic(comic: FollowedComic): boolean {
  const existing = readFollowedComics();
  const nextItems = existing.some((item) => item.id === comic.id)
    ? existing.filter((item) => item.id !== comic.id)
    : [...existing, comic];

  writeFollowedComics(nextItems);
  return nextItems.some((item) => item.id === comic.id);
}
