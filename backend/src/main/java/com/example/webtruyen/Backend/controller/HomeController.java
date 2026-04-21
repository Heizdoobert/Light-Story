package com.example.webtruyen.Backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping({"/", "/AdminHome"})
    public String root() {
        return "redirect:/AdminHome/stories";
    }
}