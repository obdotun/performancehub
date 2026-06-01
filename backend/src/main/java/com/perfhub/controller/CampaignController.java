package com.perfhub.controller;

import com.perfhub.dto.CampaignCreateRequest;
import com.perfhub.dto.CampaignDto;
import com.perfhub.service.CampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    // ── CRUD ─────────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<CampaignDto> create(
            @RequestBody CampaignCreateRequest req, Principal principal) throws Exception {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(campaignService.create(req, principal.getName()));
    }

    @GetMapping
    public ResponseEntity<List<CampaignDto>> findAll() {
        return ResponseEntity.ok(campaignService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CampaignDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(campaignService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CampaignDto> update(
            @PathVariable Long id, @RequestBody CampaignCreateRequest req) {
        return ResponseEntity.ok(campaignService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        campaignService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Gestion des runs ──────────────────────────────────────────────────────

    /**
     * POST /api/campaigns/{id}/runs/{runId}
     * Ajoute un run à une campagne existante.
     */
    @PostMapping("/{id}/runs/{runId}")
    public ResponseEntity<CampaignDto> addRun(
            @PathVariable Long id, @PathVariable Long runId) {
        return ResponseEntity.ok(campaignService.addRun(id, runId));
    }

    /**
     * DELETE /api/campaigns/{id}/runs/{runId}
     * Retire un run d'une campagne.
     */
    @DeleteMapping("/{id}/runs/{runId}")
    public ResponseEntity<CampaignDto> removeRun(
            @PathVariable Long id, @PathVariable Long runId) {
        return ResponseEntity.ok(campaignService.removeRun(id, runId));
    }

    /**
     * GET /api/campaigns/by-run/{runId}
     * Retourne les campagnes auxquelles un run est rattaché.
     * Utilisé dans l'historique pour afficher le badge campagne.
     */
    @GetMapping("/by-run/{runId}")
    public ResponseEntity<List<CampaignDto.CampaignRefDto>> findByRun(
            @PathVariable Long runId) {
        return ResponseEntity.ok(campaignService.findCampaignsByRunId(runId));
    }

    // ── Pièces jointes ────────────────────────────────────────────────────────

    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addAttachment(
            @PathVariable Long id,
            @RequestPart("file")                         MultipartFile file,
            @RequestParam(value = "note", defaultValue = "") String    note,
            Principal principal) {
        try {
            CampaignDto.AttachmentSummaryDto result =
                    campaignService.addAttachment(id, file, note, principal.getName());
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            // Fichier trop volumineux ou autre erreur métier
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .body(java.util.Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long attachmentId) throws Exception {
        Resource resource = campaignService.loadAttachment(attachmentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + resource.getFilename() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @DeleteMapping("/attachments/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(@PathVariable Long attachmentId) {
        campaignService.deleteAttachment(attachmentId);
        return ResponseEntity.noContent().build();
    }
}