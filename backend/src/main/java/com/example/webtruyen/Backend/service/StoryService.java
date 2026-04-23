package com.example.webtruyen.Backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.example.webtruyen.Backend.model.Story;
import com.example.webtruyen.Backend.repository.StoryRepository;

@Service
public class StoryService {
    @Autowired
    private StoryRepository storyRepository;

    public List<Story> getAllStories() {
        return storyRepository.findAll(Sort.by(Sort.Direction.DESC,"updatedAt"));
    }

    public Story createStory(Story story) {
        return storyRepository.save(story);
    }

    public Story getStoryById(Long id) {
        return storyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy truyện id: " + id));
    }

    public Story updateStory(Long id, Story storyDetails){
        Story story = getStoryById(id);

        story.setTitle(storyDetails.getTitle());
        story.setSlug(storyDetails.getSlug());
        story.setDescription(storyDetails.getDescription());
        story.setStatus(storyDetails.getStatus());
        story.setCoverUrl(storyDetails.getCoverUrl());
        story.setAuthor(storyDetails.getAuthor());
        story.setGenres(storyDetails.getGenres());
        story.setActive(storyDetails.getActive());
        
        return storyRepository.save(story);
    }
    
    public void deleteStory(Long id) {
        storyRepository.deleteById(id);
    }
    
    public List<Story> searchStories(String keyword) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            return storyRepository.searchByKeyword(keyword.trim());
        }
        return storyRepository.findAll(); 
    }
}
