package com.example.webtruyen.Backend.controller;

import com.example.webtruyen.Backend.model.Author;
import com.example.webtruyen.Backend.model.Story;
import com.example.webtruyen.Backend.service.StoryService;
import com.example.webtruyen.Backend.service.AuthorService;
import com.example.webtruyen.Backend.service.GenreService;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Controller
@RequestMapping("/AdminHome/stories")
public class StoryController {

    @Autowired
    private StoryService storyService;
    @Autowired
    private AuthorService authorService;
    @Autowired
    private GenreService genreService;

    // ... các code import giữ nguyên ...

    @GetMapping
    public String listStories(Model model, 
                              @RequestParam(value = "keyword", required = false) String keyword,
                              @AuthenticationPrincipal UserDetails userDetails) {
        
        if (userDetails != null) {
            model.addAttribute("username", userDetails.getUsername());
        }

        if (keyword != null && !keyword.trim().isEmpty()) {
            model.addAttribute("stories", storyService.searchStories(keyword));
            model.addAttribute("keyword", keyword); 
        } else {
            model.addAttribute("stories", storyService.getAllStories());
        }
        
        return "index";
    }

    @GetMapping("/add")
    public String showAddForm(Model model) {
        model.addAttribute("story", new Story()); 
        model.addAttribute("authors", authorService.getAllAuthors());
        model.addAttribute("allGenres", genreService.getAllGenres());
        model.addAttribute("pageTitle", "Thêm truyện mới");
        return "story/form";
    }

    @GetMapping("/edit/{id}")
    public String showEditForm(@PathVariable Long id, Model model) throws IOException {
        model.addAttribute("story", storyService.getStoryById(id)); 
        model.addAttribute("authors", authorService.getAllAuthors());
        model.addAttribute("allGenres", genreService.getAllGenres());
        model.addAttribute("pageTitle", "Chỉnh sửa truyện");
        return "story/form";
    }

    
    @PostMapping("/save")
    public String saveStory(@ModelAttribute("story") Story story, 
                        @RequestParam("imageFile") MultipartFile multipartFile,
                        @RequestParam(value = "newAuthorName", required = false) String newAuthorName) throws IOException { 
    
    
    //Thêm tác giả
    if(newAuthorName != null && !newAuthorName.trim().isEmpty() ){
        Author newAuthor = new Author();
        newAuthor.setName(newAuthorName.trim());
        newAuthor = authorService.saveAuthor(newAuthor);
        story.setAuthor(newAuthor);
    }

    //Thêm ảnh                        
    String uploadDir = "img/";
    if (!multipartFile.isEmpty()) {
        String fileName = System.currentTimeMillis() + "_" + StringUtils.cleanPath(multipartFile.getOriginalFilename());
        if (story.getId() != null) {
            Story oldStory = storyService.getStoryById(story.getId());
            if (oldStory.getCoverUrl() != null && !oldStory.getCoverUrl().isEmpty()) {
                String oldFileName = oldStory.getCoverUrl().replace("/img/", "");
                Path oldFilePath = Paths.get(uploadDir + oldFileName);
                Files.deleteIfExists(oldFilePath);
            }
        }
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath); 
        }
        try (InputStream inputStream = multipartFile.getInputStream()) {
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
        }

        story.setCoverUrl("/img/" + fileName);
    }


        if (story.getId() != null) {
            storyService.updateStory(story.getId(), story);
        } else {
            storyService.createStory(story);
        }

        return "redirect:/AdminHome/stories";
    }
    
    public String deleteStory(@PathVariable Long id) throws IOException {
        Story storyToDelete = storyService.getStoryById(id);
    
        if (storyToDelete.getCoverUrl() != null && !storyToDelete.getCoverUrl().isEmpty()) {
            String fileName = storyToDelete.getCoverUrl().replace("/img/", "");
            Path filePath = Paths.get("img/" + fileName);
            Files.deleteIfExists(filePath);
        }
        storyService.deleteStory(id);
        return "redirect:/AdminHome/stories";
    }
    
}