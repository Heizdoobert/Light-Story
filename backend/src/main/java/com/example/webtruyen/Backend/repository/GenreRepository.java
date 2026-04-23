package com.example.webtruyen.Backend.repository;

import com.example.webtruyen.Backend.model.Genre;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GenreRepository extends JpaRepository<Genre, Long> {
    List<String> findByNameContainingIgnoreCase(String name);
    
    boolean existsByName(String name);
}