"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createComic, uploadComicCover } from "@/services/comics/comic.service";

export function useCreateComicPresenter() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cover) {
      setPreviewUrl(null);
      return;
    }

    const safeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!safeTypes.includes(cover.type)) {
      alert("Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.");
      setCover(null);
      return;
    }

    const objectUrl = URL.createObjectURL(cover);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [cover]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cover) return alert("Cover image required");
    setLoading(true);

    try {
      const coverUrl = await uploadComicCover(cover);
      const comic = await createComic({ title, description, coverUrl });
      alert(`Comic created: ${comic.title}`);
      router.push(`/comics/${comic.id}/add-chapter?storyId=${comic.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create comic");
    } finally {
      setLoading(false);
    }
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    cover,
    setCover,
    previewUrl,
    loading,
    handleSubmit,
  };
}
