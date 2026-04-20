package com.perfhub.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.perfhub.dto.ProjectCreateRequest;
import com.perfhub.entity.GatlingProject;
import com.perfhub.service.GitService;
import com.perfhub.service.GatlingProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class GatlingProjectController {

    private final GatlingProjectService projectService;
    private final GitService gitService;

    @GetMapping
    public ResponseEntity<List<GatlingProject>> findAll() {
        return ResponseEntity.ok(projectService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GatlingProject> findById(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.findById(id));
    }

    @GetMapping("/{id}/simulations")
    public ResponseEntity<List<String>> listSimulations(@PathVariable Long id) throws Exception {
        return ResponseEntity.ok(projectService.listSimulations(id));
    }

    /**
     * Créer un projet depuis un ZIP uploadé.
     * multipart: file=zipFile, request=JSON ProjectCreateRequest
     */
    @PostMapping(value = "/zip", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('ADMIN','PERF_LEAD')")
    public ResponseEntity<GatlingProject> createFromZip(
            @RequestPart("file") MultipartFile zipFile,
            @RequestPart("request") String requestJson) throws Exception {
        ProjectCreateRequest req = new ObjectMapper().readValue(requestJson, ProjectCreateRequest.class);
        return ResponseEntity.ok(projectService.createFromZip(req, zipFile));
    }

    /**
     * Créer un projet depuis Bitbucket.
     */
    @PostMapping("/bitbucket")
    @PreAuthorize("hasAnyRole('ADMIN','PERF_LEAD')")
    public ResponseEntity<GatlingProject> createFromBitbucket(@RequestBody ProjectCreateRequest req) throws Exception {
        return ResponseEntity.ok(projectService.createFromBitbucket(req));
    }

    /**
     * Pull les dernières modifications depuis Bitbucket.
     */
    @PostMapping("/{id}/pull")
    @PreAuthorize("hasAnyRole('ADMIN','PERF_LEAD')")
    public ResponseEntity<Void> pull(
            @PathVariable Long id,
            @RequestBody Map<String, String> creds) throws Exception {
        projectService.pullProject(id, creds.get("username"), creds.get("token"));
        return ResponseEntity.ok().build();
    }

    /**
     * Liste les branches d'un dépôt Bitbucket avant création.
     */
    @PostMapping("/branches")
    @PreAuthorize("hasAnyRole('ADMIN','PERF_LEAD')")
    public ResponseEntity<List<String>> listBranches(@RequestBody Map<String, String> body) throws Exception {
        return ResponseEntity.ok(gitService.listBranches(
                body.get("repoUrl"), body.get("username"), body.get("token")));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PERF_LEAD')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }
}
