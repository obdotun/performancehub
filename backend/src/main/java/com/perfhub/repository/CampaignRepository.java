package com.perfhub.repository;

import com.perfhub.entity.Campaign;
import com.perfhub.enums.CampaignStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {
    List<Campaign> findAllByOrderByCreatedAtDesc();
    List<Campaign> findByStatusOrderByCreatedAtDesc(CampaignStatus status);
}