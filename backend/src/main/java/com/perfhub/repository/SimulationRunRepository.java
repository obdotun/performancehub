package com.perfhub.repository;

import com.perfhub.entity.SimulationRun;
import com.perfhub.enums.RunStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SimulationRunRepository extends JpaRepository<SimulationRun, Long> {
    @Query("SELECT r FROM SimulationRun r WHERE r.project.id = :projectId ORDER BY r.startedAt DESC")
    List<SimulationRun> findByProjectIdOrderByStartedAtDesc(@Param("projectId") Long projectId);

    List<SimulationRun> findByStatus(RunStatus status);

    @Query("SELECT r FROM SimulationRun r ORDER BY r.startedAt DESC")
    List<SimulationRun> findAllOrderByStartedAtDesc();

    /**
     * Retourne les campagnes auxquelles ce run est rattaché.
     * Utilisé pour afficher le badge campagne dans l'historique.
     */
    @Query("SELECT c.id, c.name FROM Campaign c JOIN c.runs r WHERE r.id = :runId")
    List<Object[]> findCampaignsByRunId(@Param("runId") Long runId);

}
