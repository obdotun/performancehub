package com.perfhub.service;

import com.perfhub.dto.ProjectCreateRequest;
import com.perfhub.entity.GatlingProject;
import com.perfhub.enums.ProjectType;
import com.perfhub.repository.GatlingProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class GatlingProjectService {

    private final GatlingProjectRepository projectRepo;
    private final GitService gitService;

    @Value("${perfhub.storage.projects}")
    private String projectsRoot;

    public List<GatlingProject> findAll() { return projectRepo.findAll(); }

    public GatlingProject findById(Long id) {
        return projectRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Projet introuvable : " + id));
    }

    /**
     * Créer un projet depuis un fichier ZIP uploadé.
     *
     * Gère automatiquement les ZIPs avec dossier racine (IntelliJ, Windows Explorer) :
     *   gatling_guce.zip
     *     └── gatling_guce/   ← dossier racine détecté et déballé
     *         ├── build.gradle
     *         └── src/gatling/java/
     */
    public GatlingProject createFromZip(ProjectCreateRequest req, MultipartFile zipFile) throws Exception {
        if (projectRepo.existsByName(req.getName())) {
            throw new IllegalArgumentException("Un projet avec ce nom existe déjà : " + req.getName());
        }

        Path extractDir = Path.of(projectsRoot, sanitize(req.getName()) + "_extract_tmp");
        extractZip(zipFile, extractDir);

        // Détecter si le ZIP a un unique dossier racine et l'utiliser comme vraie racine
        Path effectiveRoot = unwrapSingleRootFolder(extractDir);
        Path projectDir    = Path.of(projectsRoot, sanitize(req.getName()));

        if (!effectiveRoot.equals(extractDir)) {
            // Renommer le sous-dossier racine vers le chemin final
            Files.move(effectiveRoot, projectDir, StandardCopyOption.REPLACE_EXISTING);
            deleteDirectory(extractDir); // supprimer le dossier temporaire vide
        } else {
            Files.move(extractDir, projectDir, StandardCopyOption.REPLACE_EXISTING);
        }

        log.info("Racine effective du projet : {}", projectDir);

        GatlingProject project = GatlingProject.builder()
                .name(req.getName())
                .description(req.getDescription())
                .type(ProjectType.ZIP)
                .localPath(projectDir.toAbsolutePath().toString())
                .build();
        return projectRepo.save(project);
    }

    /**
     * Si le répertoire extrait contient un seul sous-dossier (et aucun fichier direct),
     * retourne ce sous-dossier comme vraie racine du projet.
     * Sinon retourne extractDir tel quel.
     */
    private Path unwrapSingleRootFolder(Path extractDir) throws IOException {
        try (var entries = Files.list(extractDir)) {
            List<Path> children = entries.toList();
            if (children.size() == 1 && Files.isDirectory(children.get(0))) {
                log.info("ZIP avec dossier racine détecté : {}", children.get(0).getFileName());
                return children.get(0);
            }
        }
        return extractDir;
    }

    /**
     * Créer un projet depuis Bitbucket (clone).
     */
    public GatlingProject createFromBitbucket(ProjectCreateRequest req) throws Exception {
        if (projectRepo.existsByName(req.getName())) {
            throw new IllegalArgumentException("Un projet avec ce nom existe déjà : " + req.getName());
        }

        File targetDir = Path.of(projectsRoot, sanitize(req.getName())).toFile();
        gitService.cloneOrPull(req.getRepoUrl(), req.getBranch(), req.getUsername(), req.getToken(), targetDir);

        GatlingProject project = GatlingProject.builder()
                .name(req.getName())
                .description(req.getDescription())
                .type(ProjectType.BITBUCKET)
                .localPath(targetDir.getAbsolutePath())
                .repoUrl(req.getRepoUrl())
                .branch(req.getBranch())
                .build();
        return projectRepo.save(project);
    }

    /**
     * Pull les derniers changements pour un projet Bitbucket.
     */
    public void pullProject(Long id, String username, String token) throws Exception {
        GatlingProject project = findById(id);
        if (project.getType() != ProjectType.BITBUCKET) {
            throw new IllegalStateException("Ce projet n'est pas de type Bitbucket");
        }
        gitService.cloneOrPull(project.getRepoUrl(), project.getBranch(), username, token,
                new File(project.getLocalPath()));
        project.setUpdatedAt(java.time.LocalDateTime.now());
        projectRepo.save(project);
    }

    /**
     * Liste les classes de simulation disponibles dans le projet Gatling.
     *
     * Approche : scan de TOUS les fichiers .java/.scala du projet,
     * lecture du contenu pour détecter "extends Simulation" —
     * exactement comme le fait le plugin Gatling lui-même.
     *
     * Avantages :
     * - Insensible à la structure de répertoires (Gradle, Maven, ZIP avec dossier racine...)
     * - Détecte les simulations Gatling Java (io.gatling.javaapi.core.Simulation)
     *   ET Scala (io.gatling.core.scenario.Simulation)
     * - Exclut automatiquement Engine, IDEPathHelper, Recorder
     *   car ces classes n'étendent pas Simulation
     */
    public List<String> listSimulations(Long id) throws Exception {
        GatlingProject project = findById(id);
        Path projectRoot = Path.of(project.getLocalPath());

        log.info("Scan des simulations dans : {}", projectRoot);

        try (var stream = Files.walk(projectRoot)) {
            return stream
                    .filter(p -> {
                        String name = p.toString();
                        return name.endsWith(".java") || name.endsWith(".scala");
                    })
                    .filter(p -> !Files.isDirectory(p))
                    .filter(this::extendsSimulation)
                    .map(p -> extractFqcn(p))
                    .filter(s -> s != null && !s.isBlank())
                    .sorted()
                    .toList();
        }
    }

    /**
     * Retourne true si le fichier contient "extends Simulation".
     * Couvre Java et Scala, avec ou sans import qualifié.
     */
    private boolean extendsSimulation(Path file) {
        try {
            String content = Files.readString(file);
            return content.contains("extends Simulation");
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Extrait le FQCN (fully qualified class name) depuis le fichier source.
     *
     * Lit la déclaration "package" pour construire :
     *   package com.guce.coc.trn → com.guce.coc.trn.SearchAndViewSimulation
     *
     * Si pas de package déclaré, retourne juste le nom de la classe.
     */
    private String extractFqcn(Path file) {
        try {
            String content = Files.readString(file);
            String fileName = file.getFileName().toString()
                    .replaceAll("\\.(java|scala)$", "");

            // Chercher la déclaration de package
            java.util.regex.Pattern pkgPattern =
                    java.util.regex.Pattern.compile("^\s*package\s+([\\w.]+)", java.util.regex.Pattern.MULTILINE);
            java.util.regex.Matcher matcher = pkgPattern.matcher(content);

            if (matcher.find()) {
                return matcher.group(1) + "." + fileName;
            }
            // Pas de package → classe dans le package par défaut
            return fileName;
        } catch (IOException e) {
            return null;
        }
    }

    public void deleteProject(Long id) {
        GatlingProject project = findById(id);
        try {
            deleteDirectory(Path.of(project.getLocalPath()));
        } catch (Exception e) {
            log.warn("Impossible de supprimer le répertoire {}", project.getLocalPath());
        }
        projectRepo.deleteById(id);
    }

    // -------------------------------------------------------

    private void extractZip(MultipartFile zipFile, Path targetDir) throws Exception {
        // Normaliser en absolu AVANT la comparaison pour éviter les faux positifs
        Path absTarget = targetDir.toAbsolutePath().normalize();
        Files.createDirectories(absTarget);

        try (ZipInputStream zis = new ZipInputStream(zipFile.getInputStream())) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().isBlank()) { zis.closeEntry(); continue; }

                Path entryPath = absTarget.resolve(entry.getName()).normalize();

                // Zip Slip : l'entrée sort du répertoire cible
                if (!entryPath.startsWith(absTarget)) {
                    throw new SecurityException("Zip Slip détecté : " + entry.getName());
                }

                if (entry.isDirectory()) {
                    Files.createDirectories(entryPath);
                } else {
                    Files.createDirectories(entryPath.getParent());
                    Files.copy(zis, entryPath, StandardCopyOption.REPLACE_EXISTING);
                }
                zis.closeEntry();
            }
        }
        log.info("ZIP extrait dans {}", absTarget);
    }

    private String toSimulationClass(Path root, Path file) {
        try {
            // root est déjà src/gatling/java (ou src/test/scala, etc.)
            // donc la relativisation donne directement le package + classe
            // ex: guce/coc/trn/SearchAndViewSimulation.java → guce.coc.trn.SearchAndViewSimulation
            String relative = root.relativize(file).toString()
                    .replace(File.separatorChar, '/')
                    .replace('/', '.')
                    .replaceAll("\\.(java|scala)$", "");
            return relative;
        } catch (Exception e) { return null; }
    }

    private String sanitize(String name) {
        return name.replaceAll("[^a-zA-Z0-9_\\-]", "_");
    }

    private void deleteDirectory(Path path) throws IOException {
        if (!Files.exists(path)) return;
        try (var walk = Files.walk(path)) {
            walk.sorted(java.util.Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
        }
    }
}