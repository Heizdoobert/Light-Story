package com.example.webtruyen.Backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.webtruyen.Backend.model.Chapter;

public interface ChapterRepository extends JpaRepository<Chapter , Long> {
    List<Chapter> findByStoryIdOrderByChapterNumberAsc(Long storyId);
    boolean existsByStoryIdAndChapterNumber(Long storyId, Integer chapterNumber);
    Optional<Chapter> findFirstByStoryIdAndChapterNumberLessThanOrderByChapterNumberDesc(Long storyId, Integer currentChapterNumber);
    Optional<Chapter> findFirstByStoryIdAndChapterNumberGreaterThanOrderByChapterNumberAsc(Long storyId, Integer currentChapterNumber);
    Optional<Chapter> findByStoryIdAndChapterNumber(Long storyId, Integer chapterNumber);
}
