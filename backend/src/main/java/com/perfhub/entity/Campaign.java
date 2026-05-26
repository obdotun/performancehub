package com.perfhub.entity;

import com.perfhub.enums.CampaignStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "campaigns")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Campaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CampaignStatus status = CampaignStatus.IN_PROGRESS;

    /** Date de mise en production prévue */
    private LocalDate targetReleaseDate;

    private String createdBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    /** Runs associés à cette campagne */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "campaign_runs",
            joinColumns        = @JoinColumn(name = "campaign_id"),
            inverseJoinColumns = @JoinColumn(name = "run_id")
    )
    @Builder.Default
    private List<SimulationRun> runs = new ArrayList<>();

    /** Fichiers attachés à cette campagne */
    @OneToMany(mappedBy = "campaign", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CampaignAttachment> attachments = new ArrayList<>();

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() { this.updatedAt = LocalDateTime.now(); }
}