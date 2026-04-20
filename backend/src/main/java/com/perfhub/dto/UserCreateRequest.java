package com.perfhub.dto;

import com.perfhub.enums.UserRole;
import lombok.Data;

@Data
public class UserCreateRequest {
    private String username;
    private String fullName;
    private UserRole role;
}
