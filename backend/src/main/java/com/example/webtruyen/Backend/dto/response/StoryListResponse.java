package com.example.webtruyen.Backend.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StoryListResponse {
    private Long id;
    private String title;
    private String coverUrl;
    private String authorName;
    private String status;
    private List<String> genres; 
    private Long viewCount;          
    private Double rating;
    
}
