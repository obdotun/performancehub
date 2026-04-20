package com.perfhub.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "run_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RunLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    private SimulationRun run;

    @Column(columnDefinition = "TEXT")
    private String line;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}