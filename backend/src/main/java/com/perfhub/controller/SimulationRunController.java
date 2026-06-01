package com.perfhub.controller;

import com.perfhub.dto.PagedRunsResponse;
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

    // ── Liste sans pagination (conservée pour Dashboard + Campagnes) ──────────
    @GetMapping
    public ResponseEntity<List<SimulationRun>> findAll() {
        return ResponseEntity.ok(executionService.findAll());
    }

    // ── Liste paginée avec filtres — utilisée par RunsHistoryPage ────────────
    /**
     * GET /api/runs/paged?page=0&size=10&status=SUCCESS&search=HomePage
     *
     * @param page   page courante (0-based, défaut 0)
     * @param size   éléments par page (défaut 10)
     * @param status filtre statut optionnel
     * @param search filtre texte libre optionnel
     */
    @GetMapping("/paged")
    public ResponseEntity<PagedRunsResponse> findAllPaged(
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "10") int    size,
            @RequestParam(required = false)    String status,
            @RequestParam(required = false)    String search) {
        return ResponseEntity.ok(executionService.findAllPaged(page, size, status, search));
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

    // ── Lancement ─────────────────────────────────────────────────────────────
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

    // ── Annulation ────────────────────────────────────────────────────────────
    /**
     * POST /api/runs/{id}/cancel
     * Annule un run RUNNING ou PENDING.
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','PERF_LEAD','PERF_ENGINEER')")
    public ResponseEntity<?> cancel(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(executionService.cancelRun(id));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", e.getMessage()));
        }
    }

    // ── Relancer ──────────────────────────────────────────────────────────────
    /**
     * POST /api/runs/{id}/rerun
     * Crée un nouveau run avec les mêmes paramètres que l'original.
     */
    @PostMapping("/{id}/rerun")
    @PreAuthorize("hasAnyRole('ADMIN','PERF_LEAD','PERF_ENGINEER')")
    public ResponseEntity<SimulationRun> rerun(
            @PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(executionService.rerunRun(id, principal.getName()));
    }
}