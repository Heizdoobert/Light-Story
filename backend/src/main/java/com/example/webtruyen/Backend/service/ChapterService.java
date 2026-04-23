package com.example.webtruyen.Backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.webtruyen.Backend.model.Chapter;
import com.example.webtruyen.Backend.model.Story;
import com.example.webtruyen.Backend.repository.ChapterRepository;
import com.example.webtruyen.Backend.repository.StoryRepository;

import jakarta.transaction.Transactional;

@Service
@Transactional
public class ChapterService {

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private StoryRepository storyRepository;

    public List<Chapter> getChaptersByStoryId(Long storyId){
        return chapterRepository.findByStoryIdOrderByChapterNumberAsc(storyId);

    }

    public Chapter getChapterById(Long id){
        Optional<Chapter> optional = chapterRepository.findById(id);
        if(optional.isPresent()){
            return optional.get();
        }
        throw new RuntimeException("Không tìm thấy chương trình với Id " + id);
    }
    
    public boolean isChapterNumberExists(Long storyId, Integer chapNumber){
        return chapterRepository.existsByStoryIdAndChapterNumber(storyId, chapNumber);
    }

    public Chapter saveChapter(Chapter chapter){
        Chapter saveChapter = chapterRepository.save(chapter);
        Story story = saveChapter.getStory();
        if(story != null){
            story.setUpdatedAt(java.time.LocalDateTime.now());
            storyRepository.save(story);
        }
        return saveChapter;
    }

    public void deleteChapter(Long id){
        chapterRepository.deleteById(id);
    }
}
