package com.perfhub.service;

import com.perfhub.dto.CampaignCreateRequest;
import com.perfhub.dto.CampaignDto;
import com.perfhub.entity.*;
import com.perfhub.enums.CampaignStatus;
import com.perfhub.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignService {

    private final CampaignRepository           campaignRepo;
    private final CampaignAttachmentRepository attachmentRepo;
    private final SimulationRunRepository      runRepo;

    @Value("${perfhub.storage.root}")
    private String storageRoot;

    /** Taille maximale autorisée pour les pièces jointes : 20 Mo */
    private static final long MAX_FILE_SIZE_BYTES = 20L * 1024 * 1024;

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    // ── CRUD Campagne ────────────────────────────────────────────────────────

    @Transactional
    public CampaignDto create(CampaignCreateRequest req, String createdBy) {
        List<SimulationRun> runs = req.getRunIds() == null ? List.of()
                : runRepo.findAllById(req.getRunIds());

        Campaign campaign = Campaign.builder()
                .name(req.getName())
                .description(req.getDescription())
                .status(req.getStatus() != null ? req.getStatus() : CampaignStatus.DRAFT)
                .targetReleaseDate(req.getTargetReleaseDate())
                .createdBy(createdBy)
                .runs(runs)
                .build();

        Campaign saved = campaignRepo.save(campaign);
        log.info("Campagne #{} créée : '{}'", saved.getId(), saved.getName());
        return toDto(saved);
    }

    public List<CampaignDto> findAll() {
        return campaignRepo.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toDto).toList();
    }

    public CampaignDto findById(Long id) {
        return toDto(getCampaign(id));
    }

    @Transactional
    public CampaignDto update(Long id, CampaignCreateRequest req) {
        Campaign campaign = getCampaign(id);

        if (req.getName()              != null) campaign.setName(req.getName());
        if (req.getDescription()       != null) campaign.setDescription(req.getDescription());
        if (req.getStatus()            != null) campaign.setStatus(req.getStatus());
        if (req.getTargetReleaseDate() != null) campaign.setTargetReleaseDate(req.getTargetReleaseDate());

        // Mise à jour complète des runs si fournis
        if (req.getRunIds() != null) {
            List<SimulationRun> runs = runRepo.findAllById(req.getRunIds());
            campaign.getRuns().clear();
            campaign.getRuns().addAll(runs);
            log.info("Campagne #{} — {} run(s) mis à jour", id, runs.size());
        }

        return toDto(campaignRepo.save(campaign));
    }

    /**
     * Ajoute un run à une campagne existante sans remplacer les autres.
     */
    @Transactional
    public CampaignDto addRun(Long campaignId, Long runId) {
        Campaign campaign = getCampaign(campaignId);
        SimulationRun run = runRepo.findById(runId)
                .orElseThrow(() -> new IllegalArgumentException("Run introuvable : " + runId));

        boolean alreadyPresent = campaign.getRuns().stream()
                .anyMatch(r -> r.getId().equals(runId));
        if (!alreadyPresent) {
            campaign.getRuns().add(run);
            campaignRepo.save(campaign);
            log.info("Run #{} ajouté à la campagne #{}", runId, campaignId);
        }
        return toDto(campaign);
    }

    /**
     * Retire un run d'une campagne.
     */
    @Transactional
    public CampaignDto removeRun(Long campaignId, Long runId) {
        Campaign campaign = getCampaign(campaignId);
        campaign.getRuns().removeIf(r -> r.getId().equals(runId));
        campaignRepo.save(campaign);
        log.info("Run #{} retiré de la campagne #{}", runId, campaignId);
        return toDto(campaign);
    }

    @Transactional
    public void delete(Long id) {
        Campaign campaign = getCampaign(id);
        campaign.getAttachments().forEach(a -> deleteFile(a.getStoredPath()));
        campaignRepo.deleteById(id);
        log.info("Campagne #{} supprimée", id);
    }

    // ── Pièces jointes ───────────────────────────────────────────────────────

    @Transactional
    public CampaignDto.AttachmentSummaryDto addAttachment(
            Long campaignId, MultipartFile file, String note, String uploadedBy) throws IOException {

        // Validation taille fichier
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException(
                    String.format("Fichier trop volumineux : %.1f Mo (max 20 Mo)",
                            file.getSize() / (1024.0 * 1024.0)));
        }

        Campaign campaign = getCampaign(campaignId);

        Path attachDir = Path.of(storageRoot, "campaign-attachments").toAbsolutePath();
        Files.createDirectories(attachDir);

        String uniqueName  = UUID.randomUUID() + "_" + sanitize(file.getOriginalFilename());
        Path   destination = attachDir.resolve(uniqueName);
        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

        CampaignAttachment attachment = CampaignAttachment.builder()
                .campaign(campaign)
                .originalFileName(file.getOriginalFilename())
                .storedPath("campaign-attachments/" + uniqueName)
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .note(note)
                .uploadedBy(uploadedBy)
                .build();

        CampaignAttachment saved = attachmentRepo.save(attachment);
        log.info("Pièce jointe #{} ajoutée à la campagne #{}", saved.getId(), campaignId);
        return toAttachmentDto(saved);
    }

    public Resource loadAttachment(Long attachmentId) throws Exception {
        CampaignAttachment a = attachmentRepo.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Pièce jointe introuvable : " + attachmentId));
        Path path = Path.of(storageRoot).resolve(a.getStoredPath()).normalize();
        Resource resource = new UrlResource(path.toUri());
        if (!resource.exists()) throw new IllegalStateException("Fichier introuvable : " + path);
        return resource;
    }

    @Transactional
    public void deleteAttachment(Long attachmentId) {
        CampaignAttachment a = attachmentRepo.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Pièce jointe introuvable : " + attachmentId));
        deleteFile(a.getStoredPath());
        attachmentRepo.deleteById(attachmentId);
    }

    // ── Campagnes d'un run ───────────────────────────────────────────────────

    /**
     * Retourne les campagnes auxquelles un run est rattaché.
     * Utilisé par le frontend pour afficher le badge dans l'historique.
     */
    public List<CampaignDto.CampaignRefDto> findCampaignsByRunId(Long runId) {
        return runRepo.findCampaignsByRunId(runId).stream()
                .map(row -> CampaignDto.CampaignRefDto.builder()
                        .id(((Number) row[0]).longValue())
                        .name((String) row[1])
                        .build())
                .toList();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Campaign getCampaign(Long id) {
        return campaignRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campagne introuvable : " + id));
    }

    private CampaignDto toDto(Campaign c) {
        long success = c.getRuns().stream()
                .filter(r -> "SUCCESS".equals(r.getStatus().name())).count();
        long failed  = c.getRuns().stream()
                .filter(r -> "FAILED".equals(r.getStatus().name())).count();

        return CampaignDto.builder()
                .id(c.getId())
                .name(c.getName())
                .description(c.getDescription())
                .status(c.getStatus())
                .targetReleaseDate(c.getTargetReleaseDate())
                .createdBy(c.getCreatedBy())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .totalRuns(c.getRuns().size())
                .successRuns(success)
                .failedRuns(failed)
                .runs(c.getRuns().stream().map(r -> CampaignDto.RunSummaryDto.builder()
                        .id(r.getId())
                        .simulationClass(r.getSimulationClass())
                        .projectName(r.getProject() != null ? r.getProject().getName() : null)
                        .status(r.getStatus().name())
                        .startedAt(r.getStartedAt() != null ? r.getStartedAt().format(FMT) : null)
                        .meanResponseTime(r.getMeanResponseTime())
                        .totalRequests(r.getTotalRequests())
                        .failedRequests(r.getFailedRequests())
                        .build()).toList())
                .attachments(c.getAttachments().stream()
                        .map(this::toAttachmentDto).toList())
                .build();
    }

    private CampaignDto.AttachmentSummaryDto toAttachmentDto(CampaignAttachment a) {
        return CampaignDto.AttachmentSummaryDto.builder()
                .id(a.getId())
                .originalFileName(a.getOriginalFileName())
                .contentType(a.getContentType())
                .fileSize(a.getFileSize())
                .note(a.getNote())
                .uploadedBy(a.getUploadedBy())
                .uploadedAt(a.getUploadedAt() != null ? a.getUploadedAt().format(FMT) : null)
                .downloadUrl("/api/campaigns/attachments/" + a.getId() + "/download")
                .build();
    }

    private void deleteFile(String relativePath) {
        try {
            Path p = Path.of(storageRoot).resolve(relativePath).normalize();
            Files.deleteIfExists(p);
        } catch (IOException e) {
            log.warn("Impossible de supprimer le fichier : {}", e.getMessage());
        }
    }

    private String sanitize(String name) {
        if (name == null) return "file";
        return name.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }
}