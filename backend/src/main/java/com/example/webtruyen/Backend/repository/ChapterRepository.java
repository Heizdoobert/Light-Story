package com.example.webtruyen.Backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.webtruyen.Backend.model.Chapter;

public interface ChapterRepository extends JpaRepository<Chapter , Long> {
    List<Chapter> findByStoryIdOrderByChapterNumberAsc(Long storyId);
    boolean existsByStoryIdAndChapterNumber(Long storyId, Integer chapterNumber);
}
