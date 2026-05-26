package com.perfhub.dto;

import com.perfhub.enums.CampaignStatus;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class CampaignCreateRequest {
    private String       name;
    private String       description;
    private CampaignStatus status;
    private LocalDate    targetReleaseDate;
    private List<Long>   runIds;
}