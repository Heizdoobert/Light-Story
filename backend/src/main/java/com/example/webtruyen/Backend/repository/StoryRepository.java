package com.example.webtruyen.Backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.webtruyen.Backend.model.Story;

public interface StoryRepository extends JpaRepository<Story,Long> {
    
    Optional<Story> findBySlug(String slug);
    List<Story> findByStatus(Story.StoryStatus status);

    @Query("SELECT DISTINCT s FROM Story s " +
           "LEFT JOIN s.author a " +
           "LEFT JOIN s.genres g " +
           "WHERE LOWER(s.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(a.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(g.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Story> searchByKeyword(@Param("keyword") String keyword);
}
