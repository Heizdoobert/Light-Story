package com.example.webtruyen.Backend.service;

import com.example.webtruyen.Backend.model.Author;
import com.example.webtruyen.Backend.repository.AuthorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AuthorService {
    @Autowired
    private AuthorRepository authorRepository;

    public List<Author> getAllAuthors() {
        return authorRepository.findAll();
    }
    
    public Author getAuthorById(Long id) {
        return authorRepository.findById(id).orElse(null);
    }
    
    public Author saveAuthor(Author author) {
    return authorRepository.save(author);
    }
}