package com.perfhub.repository;

import com.perfhub.entity.CampaignAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CampaignAttachmentRepository extends JpaRepository<CampaignAttachment, Long> {
    List<CampaignAttachment> findByCampaignIdOrderByUploadedAtDesc(Long campaignId);
}