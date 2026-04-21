package com.example.webtruyen.Backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.webtruyen.Backend.model.Chapter;
import com.example.webtruyen.Backend.repository.ChapterRepository;

@Service
public class ChapterService {

    @Autowired
    private ChapterRepository chapterRepository;

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
        return chapterRepository.save(chapter);
    }

    public void deleteChapter(Long id){
        chapterRepository.deleteById(id);
    }
}
