package com.example.webtruyen.Backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.webtruyen.Backend.model.Genre;
import com.example.webtruyen.Backend.service.GenreService;

@Controller
@RequestMapping("/AdminHome/genres")
public class GenreController {

    @Autowired
    private GenreService genreService;

    @GetMapping
    public String listGenres(Model model) {
        model.addAttribute("genres", genreService.getAllGenres());
        return "genre/genreIndex";
    }

    @GetMapping("/add")
    public String showAddForm(Model model) {
        model.addAttribute("genre", new Genre());
        model.addAttribute("pageTitle", "Thêm Thể Loại Mới");
        return "genre/genreForm";
    }

    @GetMapping("/edit/{id}")
    public String showEditForm(@PathVariable Long id, Model model) {
        Genre genre = genreService.getGenreById(id);
        model.addAttribute("genre", genre);
        model.addAttribute("pageTitle", "Sửa Thể Loại: " + genre.getName());
        return "genre/genreForm";
    }

    @PostMapping("/save")
    public String saveGenre(@ModelAttribute("genre") Genre genre, Model model) {
        if (genreService.existsByName(genre.getName())) {
            Genre existing = genre.getId() != null ? genreService.getGenreById(genre.getId()) : null;
            if (existing == null || !existing.getName().equals(genre.getName())) {
                model.addAttribute("errorMessage", "Tên thể loại '" + genre.getName() + "' đã tồn tại!");
                model.addAttribute("pageTitle", genre.getId() == null ? "Thêm Thể Loại Mới" : "Sửa Thể Loại");
                return "genre/form";
            }
        }
        
        genreService.saveGenre(genre);
        return "redirect:/AdminHome/genres";
    }

    @GetMapping("/delete/{id}")
    public String deleteGenre(@PathVariable Long id) {
        genreService.deleteGenre(id);
        return "redirect:/AdminHome/genres";
    }


    
}
