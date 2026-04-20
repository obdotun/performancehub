package com.perfhub.controller;

import com.perfhub.dto.RunRequest;
import com.perfhub.entity.RunLog;
import com.perfhub.entity.SimulationRun;
import com.perfhub.service.GatlingExecutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/runs")
@RequiredArgsConstructor
public class SimulationRunController {

    private final GatlingExecutionService executionService;

    @GetMapping
    public ResponseEntity<List<SimulationRun>> findAll() {
        return ResponseEntity.ok(executionService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SimulationRun> findById(@PathVariable Long id) {
        return ResponseEntity.ok(executionService.findById(id));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<SimulationRun>> findByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(executionService.findByProject(projectId));
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<List<RunLog>> getLogs(@PathVariable Long id) {
        return ResponseEntity.ok(executionService.getLogsForRun(id));
    }

    /**
     * Lance une simulation Gatling.
     * Crée d'abord le run (commit synchrone), puis déclenche l'async.
     */
    @PostMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN','PERF_LEAD','PERF_ENGINEER')")
    public ResponseEntity<SimulationRun> launch(
            @PathVariable Long projectId,
            @RequestBody RunRequest req,
            Principal principal) {

        SimulationRun run = executionService.createRun(projectId, req, principal.getName());
        executionService.executeAsync(run.getId(), projectId, req);
        return ResponseEntity.ok(run);
    }
}
