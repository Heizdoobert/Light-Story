package com.example.webtruyen.Backend.repository;

import org.springframework.data.jpa.repository.JpaRepository; 
import org.springframework.stereotype.Repository;
import com.example.webtruyen.Backend.model.Role; 

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {

}