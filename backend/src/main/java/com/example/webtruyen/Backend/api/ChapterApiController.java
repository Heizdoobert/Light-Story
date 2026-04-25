package com.example.webtruyen.Backend.api;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.webtruyen.Backend.dto.response.ApiResponse;
import com.example.webtruyen.Backend.dto.response.ChapterDetailResponse;
import com.example.webtruyen.Backend.dto.response.ChapterListResponse;
import com.example.webtruyen.Backend.dto.response.ChapterNavResponse;
import com.example.webtruyen.Backend.model.Chapter;
import com.example.webtruyen.Backend.repository.ChapterRepository;

@RestController
@RequestMapping("/api")
public class ChapterApiController {
    @Autowired
    private ChapterRepository chapterRepository;

    @GetMapping("/stories/{storyId}/chapters")
    public ResponseEntity<ApiResponse<List<ChapterListResponse>>> getChaptersByStory(@PathVariable Long storyId) {
        
        List<Chapter> chapters = chapterRepository.findByStoryIdOrderByChapterNumberAsc(storyId);
        
        List<ChapterListResponse> responseList = chapters.stream()
                .map(chapter -> new ChapterListResponse(
                        chapter.getId(),
                        chapter.getChapterNumber(),
                        chapter.getTitle(),
                        chapter.getCreatedAt()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(new ApiResponse<>(200, "Lấy mục lục thành công", responseList));
    }

    // API 2: ĐỌC CHI TIẾT 1 CHƯƠNG (Kèm logic Next/Prev)
    @GetMapping("/stories/{storyId}/chapters/{chapterNumber}")
    public ResponseEntity<?> getChapterDetail(
            @PathVariable Long storyId,
            @PathVariable Integer chapterNumber) {
        
       return chapterRepository.findByStoryIdAndChapterNumber(storyId, chapterNumber).map(chapter ->{


        ChapterNavResponse prevNav = chapterRepository
                    .findFirstByStoryIdAndChapterNumberLessThanOrderByChapterNumberDesc(storyId, chapterNumber)
                    .map(c -> new ChapterNavResponse(c.getId(), c.getChapterNumber()))
                    .orElse(null);
        
        ChapterNavResponse nextNav = chapterRepository
                    .findFirstByStoryIdAndChapterNumberGreaterThanOrderByChapterNumberAsc(storyId, chapterNumber)
                    .map(c -> new ChapterNavResponse(c.getId(), c.getChapterNumber()))
                    .orElse(null);
        
        ChapterDetailResponse detail = new ChapterDetailResponse(
                    chapter.getId(),
                    chapter.getChapterNumber(),
                    chapter.getTitle(),
                    chapter.getContent(),
                    chapter.getImageUrls(), 
                    storyId,
                    prevNav,
                    nextNav  
            );

            return ResponseEntity.ok(new ApiResponse<>(200,"Lấy nội dung chương thành công",detail));
       }).orElseGet(()->ResponseEntity.status(404)
        .body(new ApiResponse<>(404, "Không tìm thấy chương này!", null)));
    }
}
