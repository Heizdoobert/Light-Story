package com.example.webtruyen.Backend.service;

import com.example.webtruyen.Backend.model.Genre;
import com.example.webtruyen.Backend.repository.GenreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class GenreService {
    @Autowired
    private GenreRepository genreRepository;

    public List<Genre> getAllGenres() {
        return genreRepository.findAll();
    }

    public Genre getGenreById(Long id){
        return genreRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy thể loại"));
    }

    public boolean existsByName(String name){
        return genreRepository.existsByName(name);
    }

    public void saveGenre(Genre genre){
        genreRepository.save(genre);
    }

    public void deleteGenre(Long id){
        genreRepository.deleteById(id);
    }
}