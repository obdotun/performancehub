package com.perfhub.dto;

import com.perfhub.enums.CampaignStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CampaignDto {
    private Long             id;
    private String           name;
    private String           description;
    private CampaignStatus   status;
    private LocalDate        targetReleaseDate;
    private String           createdBy;
    private LocalDateTime    createdAt;
    private LocalDateTime    updatedAt;
    private List<RunSummaryDto> runs;
    private List<AttachmentSummaryDto> attachments;

    // Stats calculées
    private long totalRuns;
    private long successRuns;
    private long failedRuns;

    @Data @Builder
    public static class RunSummaryDto {
        private Long   id;
        private String simulationClass;
        private String projectName;
        private String status;
        private String startedAt;
        private Long   meanResponseTime;
        private Long   totalRequests;
        private Long   failedRequests;
    }

    @Data @Builder
    public static class AttachmentSummaryDto {
        private Long   id;
        private String originalFileName;
        private String contentType;
        private Long   fileSize;
        private String note;
        private String uploadedBy;
        private String uploadedAt;
        private String downloadUrl;
    }
}