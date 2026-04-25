package com.example.webtruyen.Backend.api;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.webtruyen.Backend.dto.response.ApiResponse;
import com.example.webtruyen.Backend.dto.response.StoryListResponse;
import com.example.webtruyen.Backend.model.Story;
import com.example.webtruyen.Backend.service.StoryService;

@RestController
@RequestMapping("/api/stories")
public class StoryApiController {
    
    @Autowired
    private StoryService storyService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StoryListResponse>>> getAllStories() {
        
        List<Story> stories = storyService.getAllStories();

        List<StoryListResponse> responsesList = stories.stream()
            .map(story -> {
                List<String> genreNames = story.getGenres() != null 
                            ? story.getGenres().stream().map(genre -> genre.getName()).collect(Collectors.toList())
                            : java.util.Collections.emptyList();
                        
                return new StoryListResponse(
                            story.getId(),
                            story.getTitle(),
                            story.getCoverUrl(),
                            story.getAuthor() != null ? story.getAuthor().getName() : "Đang cập nhật",
                            story.getStatus().name(),
                            genreNames, 
                            story.getViewCount() != null ? story.getViewCount() : 0L,     
                            story.getRating() != null ? story.getRating() : 0.0   
                );  
            }).collect(Collectors.toList());

        ApiResponse<List<StoryListResponse>> apiResponse = new ApiResponse<>(
            200, 
            "Lấy danh sách toàn bộ truyện thành công", 
            responsesList
        );

        return ResponseEntity.ok(apiResponse);
    }
}