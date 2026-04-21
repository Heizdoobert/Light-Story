package com.example.webtruyen.Backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.webtruyen.Backend.service.UserService;

@Controller
public class RegisterController {

    @Autowired
    private UserService userService;

    @GetMapping("/register")
    public String showRegisterForm() {
        return "register";
    }

    @PostMapping("/register")
    public String processRegister(@RequestParam("username") String username, 
                                  @RequestParam("email") String email, 
                                  @RequestParam("password") String password, 
                                  Model model) {
        String result = userService.registerUser(username, email, password);

        if ("SUCCESS".equals(result)) {
            return "redirect:/login"; 
        } else {
        model.addAttribute("error", result); 
        model.addAttribute("savedUsername", username);
        model.addAttribute("savedEmail", email);
        
        return "register";
        }
    }
}