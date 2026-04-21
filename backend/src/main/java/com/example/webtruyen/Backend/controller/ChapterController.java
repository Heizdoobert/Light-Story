package com.example.webtruyen.Backend.controller;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.FileSystemUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.core.type.TypeReference;

import com.example.webtruyen.Backend.model.Chapter;
import com.example.webtruyen.Backend.model.Story;
import com.example.webtruyen.Backend.service.ChapterService;
import com.example.webtruyen.Backend.service.StoryService;
import com.fasterxml.jackson.databind.ObjectMapper;

@Controller
@RequestMapping("/AdminHome/stories/{storyId}/chapters")
public class ChapterController {

    @Autowired
    private ChapterService chapterService;

    @Autowired
    private StoryService storyService;

    @GetMapping
    public String listChapter(@PathVariable Long storyId, Model model) {
        Story story = storyService.getStoryById(storyId);

        model.addAttribute("story", story);
        model.addAttribute("chapters", chapterService.getChaptersByStoryId(storyId));
        
        return "chapter/chapterIndex";
    }

    @GetMapping("/add")
    public String getAddChapter(@PathVariable Long storyId, Model model) {
        Story story = storyService.getStoryById(storyId);
        Chapter chapter = new Chapter();
        chapter.setStory(story);

        model.addAttribute("story", story);
        model.addAttribute("chapter", chapter);
        // Đã sửa lỗi chính tả: pageTile -> pageTitle
        model.addAttribute("pageTitle", "Thêm Chương mới cho truyện: " + story.getTitle());

        return "chapter/chapterForm";
    }

    @GetMapping("/edit/{chapterId}")
    public String showEditForm(@PathVariable Long storyId, @PathVariable Long chapterId, Model model) {
        Story story = storyService.getStoryById(storyId);
        Chapter chapter = chapterService.getChapterById(chapterId);

        model.addAttribute("story", story);
        model.addAttribute("chapter", chapter);
        model.addAttribute("pageTitle", "Sửa Chương " + chapter.getChapterNumber());
        
        // Đã đồng nhất tên file view
        return "chapter/ChapterForm";
    }

    @PostMapping("/save")
    public String saveChapter(@PathVariable Long storyId, 
                              @ModelAttribute("chapter") Chapter chapter,
                              @RequestParam(value = "chapterImages", required = false) MultipartFile[] files,
                              Model model) {
        
        Story story = storyService.getStoryById(storyId);
        chapter.setStory(story); 

        // Logic kiểm tra trùng lặp
        if (chapter.getId() == null) {
            if (chapterService.isChapterNumberExists(storyId, chapter.getChapterNumber())) {
                model.addAttribute("story", story);
                model.addAttribute("chapter", chapter);
                model.addAttribute("pageTitle", "Thêm Chương Mới");
                model.addAttribute("errorMessage", "Lỗi: Số chương " + chapter.getChapterNumber() + " đã tồn tại!");
                return "chapter/chapterForm"; 
            }
        } else {
            Chapter oldChapter = chapterService.getChapterById(chapter.getId());
            if (!oldChapter.getChapterNumber().equals(chapter.getChapterNumber())) {
                if (chapterService.isChapterNumberExists(storyId, chapter.getChapterNumber())) {
                    model.addAttribute("story", story);
                    model.addAttribute("chapter", chapter);
                    model.addAttribute("pageTitle", "Sửa Chương " + oldChapter.getChapterNumber());
                    model.addAttribute("errorMessage", "Lỗi: Số chương " + chapter.getChapterNumber() + " đã bị trùng!");
                    return "chapter/chapterForm"; 
                }
            }
        }

        // Logic xử lý ảnh
        if(files != null && files.length > 0 && !files[0].isEmpty()){
            List<String> imageUrlsList = new ArrayList<>();
            String uploadDir = "img/story_" + storyId + "/chapter_" + chapter.getChapterNumber() + "/";
            Path uploadPath = Paths.get(uploadDir);

            try {
                if(!Files.exists(uploadPath)){
                    Files.createDirectories(uploadPath);
                }
                for(int i = 0 ; i < files.length; i++ ){
                    MultipartFile file = files[i];
                    if (!file.isEmpty()) {
                        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
                        String extension = originalFilename.contains(".") ? originalFilename.substring(originalFilename.lastIndexOf(".")) : ".jpg";
                        
                        String fileName = String.format("%03d", i + 1) + extension; 

                        Path filePath = uploadPath.resolve(fileName);
                        try (InputStream inputStream = file.getInputStream()) {
                            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
                        }
                        
                        imageUrlsList.add("/" + uploadDir + fileName);
                    }
                }

                ObjectMapper mapper = new ObjectMapper();
                String jsonImages = mapper.writeValueAsString(imageUrlsList);
                chapter.setImageUrls(jsonImages);
            
            } catch(Exception e ){
                e.printStackTrace();
            }
        } else if(chapter.getId() != null){
            Chapter oldChapter = chapterService.getChapterById(chapter.getId());
            chapter.setImageUrls(oldChapter.getImageUrls());
        }
        
        chapterService.saveChapter(chapter);
        return "redirect:/AdminHome/stories/" + storyId + "/chapters";
    }

    @GetMapping("/delete/{chapterId}")
    public String deleteChapter(@PathVariable Long storyId, @PathVariable Long chapterId) {
        Chapter chapter = chapterService.getChapterById(chapterId);

        if (chapter != null) {
            String uploadDir = "img/story_" + storyId + "/chapter_" + chapter.getChapterNumber() + "/";
            Path directoryPath = Paths.get(uploadDir);
            try {
                if (Files.exists(directoryPath)) {
                    FileSystemUtils.deleteRecursively(directoryPath);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        chapterService.deleteChapter(chapterId);     
        return "redirect:/AdminHome/stories/" + storyId + "/chapters";
    }

    // 6. Tính năng Xem trước Chương (Preview)
    @GetMapping("/view/{chapterId}")
    public String viewChapter(@PathVariable Long storyId, @PathVariable Long chapterId, Model model) {
        Story story = storyService.getStoryById(storyId);
        Chapter chapter = chapterService.getChapterById(chapterId);

        // Chuyển chuỗi JSON imageUrls thành Danh sách (List) để Thymeleaf hiển thị
        List<String> images = new ArrayList<>();
        if (chapter.getImageUrls() != null && !chapter.getImageUrls().equals("[]")) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                // Ép kiểu từ chuỗi JSON sang List<String>
                images = mapper.readValue(chapter.getImageUrls(), new TypeReference<List<String>>(){});
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        model.addAttribute("story", story);
        model.addAttribute("chapter", chapter);
        model.addAttribute("images", images); 
        return "chapter/view";
    }
}