package com.example.webtruyen.Backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChapterDetailResponse {
    private Long id;
    private Integer chapterNumber;
    private String title;
    private String content;  
    private String imageUrls;      
    private Long storyId;

    private ChapterNavResponse prevChapter;
    private ChapterNavResponse nextChapter;
}
