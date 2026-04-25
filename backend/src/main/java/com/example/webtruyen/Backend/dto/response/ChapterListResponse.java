package com.example.webtruyen.Backend.dto.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChapterListResponse {
    private Long id;
    private Integer chapterNumber;
    private String title;
    private LocalDateTime createdAt;
}
