package com.perfhub.controller;

import com.perfhub.entity.SimulationRun;
import com.perfhub.repository.SimulationRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.*;

@RestController
@Slf4j
@RequiredArgsConstructor
public class ReportController {

    @Value("${perfhub.storage.reports}")
    private String reportsRoot;

    @Value("${perfhub.storage.projects}")
    private String projectsRoot;

    private final SimulationRunRepository runRepo;

    /**
     * Sert les fichiers du rapport depuis storage/reports/
     * GET /api/reports/run-1/simulation-name/index.html
     */
    @GetMapping("/api/reports/**")
    public ResponseEntity<Resource> serveReport(jakarta.servlet.http.HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        String filePath   = requestUri.replaceFirst("/api/reports/", "");
        return serveFile(Path.of(reportsRoot, filePath));
    }

    /**
     * Sert les fichiers du rapport depuis le répertoire build/ du projet.
     * Fallback pour les anciens runs où le rapport n'avait pas encore été copié.
     * GET /api/project-reports/{runId}/**
     */
    @GetMapping("/api/project-reports/{runId}/**")
    public ResponseEntity<Resource> serveProjectReport(
            @PathVariable Long runId,
            jakarta.servlet.http.HttpServletRequest request) {

        SimulationRun run = runRepo.findById(runId).orElse(null);
        if (run == null) return ResponseEntity.notFound().build();

        String requestUri = request.getRequestURI();
        String filePath   = requestUri.replaceFirst("/api/project-reports/" + runId + "/", "");

        // Chercher dans storage/reports/ d'abord
        Path inStorage = Path.of(reportsRoot, "run-" + runId, filePath);
        if (Files.exists(inStorage)) return serveFile(inStorage);

        // Fallback : dans le répertoire build/ du projet
        if (run.getProject() != null && run.getProject().getLocalPath() != null) {
            Path inBuild = Path.of(run.getProject().getLocalPath(),
                    "build", "reports", "gatling").resolve(filePath);
            if (Files.exists(inBuild)) return serveFile(inBuild);
        }

        return ResponseEntity.notFound().build();
    }

    private ResponseEntity<Resource> serveFile(Path fullPath) {
        Path normalized = fullPath.normalize();
        File file = normalized.toFile();

        if (!file.exists() || !file.isFile()) {
            log.warn("Rapport non trouvé : {}", normalized);
            return ResponseEntity.notFound().build();
        }

        String contentType = detectContentType(file.getName());
        Resource resource  = new FileSystemResource(file);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header("X-Frame-Options", "ALLOWALL")
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)))
                .body(resource);
    }

    private String detectContentType(String filename) {
        if (filename.endsWith(".html")) return "text/html; charset=UTF-8";
        if (filename.endsWith(".css"))  return "text/css";
        if (filename.endsWith(".js"))   return "application/javascript";
        if (filename.endsWith(".json")) return "application/json";
        if (filename.endsWith(".png"))  return "image/png";
        if (filename.endsWith(".svg"))  return "image/svg+xml";
        if (filename.endsWith(".ico"))  return "image/x-icon";
        if (filename.endsWith(".woff2"))return "font/woff2";
        if (filename.endsWith(".woff")) return "font/woff";
        return "application/octet-stream";
    }
}