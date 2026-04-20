package com.perfhub.repository;

import com.perfhub.entity.RunLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RunLogRepository extends JpaRepository<RunLog, Long> {
    List<RunLog> findByRunIdOrderByTimestampAsc(Long runId);
}
