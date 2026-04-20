package com.perfhub.repository;

import com.perfhub.entity.SimulationRun;
import com.perfhub.enums.RunStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SimulationRunRepository extends JpaRepository<SimulationRun, Long> {
    List<SimulationRun> findByProjectIdOrderByStartedAtDesc(Long projectId);
    List<SimulationRun> findByStatus(RunStatus status);

    @Query("SELECT r FROM SimulationRun r ORDER BY r.startedAt DESC")
    List<SimulationRun> findAllOrderByStartedAtDesc();
}
