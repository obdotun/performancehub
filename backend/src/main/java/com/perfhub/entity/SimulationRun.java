package com.perfhub.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.perfhub.enums.RunStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "simulation_runs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulationRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Sérialise uniquement id et name du projet pour éviter la boucle infinie
    @JsonIgnoreProperties({"runs", "localPath", "hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private GatlingProject project;

    @Column(nullable = false)
    private String simulationClass;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RunStatus status = RunStatus.PENDING;

    private String reportPath;
    private String errorMessage;
    private Long durationSeconds;
    private Long totalRequests;
    private Long failedRequests;
    private Long meanResponseTime;
    private String launchedBy;

    /** Nombre d'utilisateurs configurés pour ce run */
    private Integer users;

    /** Durée de montée en charge en secondes */
    private Integer rampDuration;

    @Column(nullable = false, updatable = false)
    private LocalDateTime startedAt;

    private LocalDateTime finishedAt;

    @JsonIgnore
    @OneToMany(mappedBy = "run", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RunLog> logs;

    @PrePersist
    void prePersist() { this.startedAt = LocalDateTime.now(); }
}