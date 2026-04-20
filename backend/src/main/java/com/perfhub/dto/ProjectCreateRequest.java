package com.perfhub.dto;

import com.perfhub.enums.ProjectType;
import lombok.Data;

@Data
public class ProjectCreateRequest {
    private String name;
    private String description;
    private ProjectType type;

    // Bitbucket fields
    private String repoUrl;
    private String branch;
    private String username;
    private String token;
}
