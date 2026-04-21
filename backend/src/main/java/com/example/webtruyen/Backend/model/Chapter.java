package com.example.webtruyen.Backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "chapters", uniqueConstraints = {@UniqueConstraint(name = "unique_chapter", columnNames = {"story_id", "chapter_number"})})
@Getter @Setter
@NoArgsConstructor
public class Chapter {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @Column(name = "story_id", insertable = false, updatable = false)
    private Long storyId;

    @Column(name = "chapter_number", nullable = false)
    private Integer chapterNumber;
    
    @Column(name = "title")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    // Lưu mảng JSON chứa các link ảnh (nếu là truyện tranh)
    @Column(name = "image_urls", columnDefinition = "LONGTEXT")
    private String imageUrls; 
    
    @Column(name = "view_count")
    private Long viewCount = 0L;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Chapter(Long storyId, Integer chapterNumber, String title, String content) {
        this.storyId = storyId;
        this.chapterNumber = chapterNumber;
        this.title = title;
        this.content = content;
    }
}
