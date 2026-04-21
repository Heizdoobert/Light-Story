package com.example.webtruyen.Backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.webtruyen.Backend.model.User;

public interface UserRepository extends JpaRepository<User,Long> {
    User findByUsername(String username);
    User findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

}
