package com.perfhub.repository;

import com.perfhub.entity.SimulationRun;
import com.perfhub.enums.RunStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SimulationRunRepository extends JpaRepository<SimulationRun, Long> {

    // ── Existants — conservés intacts ────────────────────────────────────────

    @Query("SELECT r FROM SimulationRun r WHERE r.project.id = :projectId ORDER BY r.startedAt DESC")
    List<SimulationRun> findByProjectIdOrderByStartedAtDesc(@Param("projectId") Long projectId);

    List<SimulationRun> findByStatus(RunStatus status);

    @Query("SELECT r FROM SimulationRun r ORDER BY r.startedAt DESC")
    List<SimulationRun> findAllOrderByStartedAtDesc();

    @Query("SELECT c.id, c.name FROM Campaign c JOIN c.runs r WHERE r.id = :runId")
    List<Object[]> findCampaignsByRunId(@Param("runId") Long runId);

    // ── Nouveaux — pagination ────────────────────────────────────────────────

    /**
     * Pagination + filtres optionnels.
     * status et search null → filtre ignoré.
     */
    @Query(value = """
        SELECT r FROM SimulationRun r
        WHERE (:status IS NULL OR CAST(r.status AS string) = :status)
          AND (:search IS NULL OR
               LOWER(r.simulationClass) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(r.launchedBy)      LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY r.startedAt DESC
        """,
            countQuery = """
        SELECT COUNT(r) FROM SimulationRun r
        WHERE (:status IS NULL OR CAST(r.status AS string) = :status)
          AND (:search IS NULL OR
               LOWER(r.simulationClass) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(r.launchedBy)      LIKE LOWER(CONCAT('%', :search, '%')))
        """)
    Page<SimulationRun> findAllFiltered(
            @Param("status") String status,
            @Param("search") String search,
            Pageable pageable);
}