package com.perfhub.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "campaign_attachments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(nullable = false)
    private String originalFileName;

    @Column(nullable = false)
    private String storedPath;

    private String contentType;
    private Long   fileSize;

    @Column(columnDefinition = "TEXT")
    private String note;

    private String uploadedBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    void prePersist() { this.uploadedAt = LocalDateTime.now(); }
}