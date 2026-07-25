import { beforeEach, describe, expect, it } from "vitest";
import {
  getFollowedComics,
  isComicFollowed,
  toggleFollowComic,
} from "./comicFollow.service";

describe("comic follow service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("toggles a comic follow state and stores it in localStorage", () => {
    const comic = {
      id: "comic-1",
      title: "Test Comic",
      coverUrl: "https://img.test/cover.jpg",
      author: "Alice",
      status: "ongoing" as const,
    };

    expect(isComicFollowed(comic.id)).toBe(false);

    const nextState = toggleFollowComic(comic);
    expect(nextState).toBe(true);
    expect(isComicFollowed(comic.id)).toBe(true);

    const followed = getFollowedComics();
    expect(followed).toEqual([
      expect.objectContaining({
        id: comic.id,
        title: comic.title,
        coverUrl: comic.coverUrl,
      }),
    ]);

    const toggledAgain = toggleFollowComic(comic);
    expect(toggledAgain).toBe(false);
    expect(getFollowedComics()).toHaveLength(0);
  });
});
