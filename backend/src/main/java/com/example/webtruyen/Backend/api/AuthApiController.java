package com.example.webtruyen.Backend.api;


import com.example.webtruyen.Backend.dto.request.AuthRequest;
import com.example.webtruyen.Backend.dto.response.AuthResponse;
import com.example.webtruyen.Backend.security.JwtUtils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthApiController {
    
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private AuthenticationManager authenticationManager;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody AuthRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
            );
            String jwt = jwtUtils.generateToken(authentication.getName());
            
            return ResponseEntity.ok(new AuthResponse(jwt, authentication.getName(), "Đăng nhập thành công!"));
            
        } catch (AuthenticationException e) {
            return ResponseEntity.status(401).body("Tài khoản hoặc mật khẩu không chính xác!");
        }
    }
}