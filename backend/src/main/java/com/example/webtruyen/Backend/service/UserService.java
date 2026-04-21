package com.example.webtruyen.Backend.service;

import com.example.webtruyen.Backend.model.Role;
import com.example.webtruyen.Backend.model.User;
import com.example.webtruyen.Backend.repository.RoleRepository; 
import com.example.webtruyen.Backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository; 

    @Autowired
    private PasswordEncoder passwordEncoder; 

    @Transactional 
    public String registerUser(String username, String email, String rawPassword) {
        if (userRepository.findByUsername(username) != null) {
            return "Tên đăng nhập đã tồn tại!";
        }

        if (userRepository.findByEmail(email) != null) {
            return "Email này đã được sử dụng bởi tài khoản khác!";
        }

        try {
            User newUser = new User();
            newUser.setUsername(username);
            newUser.setEmail(email);

            Role clientRole = roleRepository.findById(2) 
                    .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy quyền truy cập mặc định!"));
            
            newUser.setRole(clientRole);

            String hashedPassword = passwordEncoder.encode(rawPassword);
            newUser.setPassword(hashedPassword);
            
            userRepository.save(newUser);
            return "SUCCESS";
        } catch (Exception e) {
            e.printStackTrace();
            return "Có lỗi xảy ra: " + e.getMessage();
        }
    }
}