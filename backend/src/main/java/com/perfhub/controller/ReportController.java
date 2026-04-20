package com.perfhub.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.*;

@RestController
@RequestMapping("/api/reports")
@Slf4j
public class ReportController {

    @Value("${perfhub.storage.reports}")
    private String reportsRoot;

    /**
     * Sert un fichier du rapport Gatling (HTML, CSS, JS, PNG...).
     * ex: GET /api/reports/run-1/basicSimulation-20240101/index.html
     */
    @GetMapping("/**")
    public ResponseEntity<Resource> serveReport(jakarta.servlet.http.HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        String filePath = requestUri.replaceFirst("/api/reports/", "");

        Path fullPath = Path.of(reportsRoot, filePath).normalize();
        File file = fullPath.toFile();

        if (!file.exists() || !file.isFile()) {
            log.warn("Rapport non trouvé : {}", fullPath);
            return ResponseEntity.notFound().build();
        }

        String contentType = detectContentType(filePath);
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)))
                .body(resource);
    }

    private String detectContentType(String path) {
        if (path.endsWith(".html")) return "text/html; charset=UTF-8";
        if (path.endsWith(".css"))  return "text/css";
        if (path.endsWith(".js"))   return "application/javascript";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".png"))  return "image/png";
        if (path.endsWith(".svg"))  return "image/svg+xml";
        if (path.endsWith(".ico"))  return "image/x-icon";
        return "application/octet-stream";
    }
}
