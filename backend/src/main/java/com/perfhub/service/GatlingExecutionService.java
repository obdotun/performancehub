package com.perfhub.service;

import com.perfhub.dto.RunRequest;
import com.perfhub.entity.*;
import com.perfhub.enums.RunStatus;
import com.perfhub.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.file.*;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class GatlingExecutionService {

    private final SimulationRunRepository runRepo;
    private final RunLogRepository logRepo;
    private final GatlingProjectRepository projectRepo;
    private final GatlingResultParser resultParser;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${perfhub.storage.reports}")
    private String reportsRoot;

    @Transactional
    public SimulationRun createRun(Long projectId, RunRequest req, String launchedBy) {
        GatlingProject project = projectRepo.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Projet introuvable : " + projectId));

        SimulationRun run = SimulationRun.builder()
                .project(project)
                .simulationClass(req.getSimulationClass())
                .status(RunStatus.PENDING)
                .launchedBy(launchedBy)
                .users(req.getUsers())
                .rampDuration(req.getRampDuration())
                .build();

        SimulationRun saved = runRepo.save(run);
        log.info(">>> Run #{} créé — projet='{}' simulation='{}'",
                saved.getId(), project.getName(), req.getSimulationClass());
        return saved;
    }

    @Async("taskExecutor")
    public void executeAsync(Long runId, Long projectId, RunRequest req) {
        log.info(">>> executeAsync démarré — run #{} sur thread '{}'",
                runId, Thread.currentThread().getName());

        SimulationRun run = runRepo.findById(runId)
                .orElseThrow(() -> new IllegalArgumentException("Run introuvable : " + runId));
        GatlingProject project = projectRepo.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Projet introuvable : " + projectId));

        Path projectPath     = Path.of(project.getLocalPath()).toAbsolutePath().normalize();
        Path reportOutputDir = Path.of(reportsRoot, "run-" + runId).toAbsolutePath().normalize();

        log.info(">>> Répertoire projet    : {}", projectPath);
        log.info(">>> Répertoire rapport   : {}", reportOutputDir);
        log.info(">>> Projet existant ?    : {}", Files.exists(projectPath));

        try {
            Files.createDirectories(reportOutputDir);

            run.setStatus(RunStatus.RUNNING);
            runRepo.save(run);

            List<String> command = buildGatlingCommand(projectPath, req, reportOutputDir);
            String cmdStr = String.join(" ", command);
            log.info(">>> Commande Gatling : {}", cmdStr);
            broadcast(runId, "[PerfHub] ▶ Démarrage : " + req.getSimulationClass());
            broadcast(runId, "[PerfHub] Commande   : " + cmdStr);
            broadcast(runId, "[PerfHub] Répertoire : " + projectPath);

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.directory(projectPath.toFile());
            pb.redirectErrorStream(true);

            log.info(">>> Lancement du processus...");
            Process process = pb.start();
            log.info(">>> Processus PID : {}", process.pid());

            // Lecture et streaming des logs en temps réel
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.debug("[Gatling] {}", line);
                    saveAndBroadcast(run, line);
                }
            }

            boolean finished = process.waitFor(60, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                failRun(run, "Timeout dépassé (60 minutes)");
                return;
            }

            int exitCode = process.exitValue();
            log.info(">>> Exit code : {}", exitCode);
            broadcast(runId, "[PerfHub] Exit code : " + exitCode);

            if (exitCode == 0) {
                // Le plugin Gradle génère toujours le rapport dans build/reports/gatling/
                // On le copie vers storage/reports/run-{id}/ pour que PerfHub puisse le servir
                Optional<Path> reportSubDir = findGatlingReport(projectPath, reportOutputDir);
                if (reportSubDir.isPresent()) {
                    Path source      = reportSubDir.get();
                    Path destination = reportOutputDir.resolve(source.getFileName());
                    copyDirectory(source, destination);
                    log.info(">>> Rapport copié : {} → {}", source, destination);

                    resultParser.parseAndUpdate(run, destination);

                    String rel = Path.of(reportsRoot).toAbsolutePath()
                            .relativize(destination).toString()
                            .replace('\\', '/');
                    run.setReportPath(rel);
                    log.info(">>> Rapport disponible : storage/reports/{}", rel);
                    broadcast(runId, "[PerfHub] ✅ Rapport disponible");
                } else {
                    log.warn(">>> Aucun rapport Gatling trouvé dans build/reports/gatling/");
                    broadcast(runId, "[PerfHub] ⚠️ Aucun rapport HTML trouvé");
                }
                run.setStatus(RunStatus.SUCCESS);
                broadcast(runId, "[PerfHub] ✅ Simulation terminée avec succès");
            } else {
                run.setStatus(RunStatus.FAILED);
                run.setErrorMessage("Exit code : " + exitCode);
                broadcast(runId, "[PerfHub] ❌ Simulation échouée (exit=" + exitCode + ")");
            }

        } catch (Exception e) {
            log.error(">>> Erreur exécution run #{}", runId, e);
            failRun(run, e.getClass().getSimpleName() + " : " + e.getMessage());
        } finally {
            run.setFinishedAt(LocalDateTime.now());
            if (run.getStartedAt() != null && run.getFinishedAt() != null) {
                run.setDurationSeconds(
                        java.time.Duration.between(run.getStartedAt(), run.getFinishedAt()).toSeconds());
            }
            runRepo.save(run);
            messagingTemplate.convertAndSend(
                    "/topic/runs/" + runId + "/done",
                    Map.of("status", run.getStatus().name()));
            log.info(">>> Run #{} terminé — statut : {}", runId, run.getStatus());
        }
    }

    // ── Lecture ─────────────────────────────────────────────────────────────

    public SimulationRun findById(Long id) {
        return runRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Run introuvable : " + id));
    }

    public List<SimulationRun> findByProject(Long projectId) {
        return runRepo.findByProjectIdOrderByStartedAtDesc(projectId);
    }

    public List<SimulationRun> findAll() {
        return runRepo.findAllOrderByStartedAtDesc();
    }

    public List<RunLog> getLogsForRun(Long runId) {
        return logRepo.findByRunIdOrderByTimestampAsc(runId);
    }

    // ── Construction de la commande ─────────────────────────────────────────

    private List<String> buildGatlingCommand(Path projectPath, RunRequest req, Path reportOutputDir) {
        List<String> cmd = new ArrayList<>();
        boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");

        Path gradlew = projectPath.resolve(isWindows ? "gradlew.bat" : "gradlew");
        Path pom     = projectPath.resolve("pom.xml");

        log.info(">>> gradlew existe ? {} ({})", Files.exists(gradlew), gradlew);
        log.info(">>> pom.xml existe ? {} ({})", Files.exists(pom), pom);

        if (Files.exists(gradlew)) {
            gradlew.toFile().setExecutable(true);

            if (isWindows) {
                // Sur Windows, gradlew.bat doit être lancé via cmd.exe
                cmd.add("cmd.exe");
                cmd.add("/c");
            }
            cmd.add(gradlew.toAbsolutePath().toString());
            log.info(">>> Simulation sélectionnée : {}", req.getSimulationClass());

            // -PsimulationClass → propriété Gradle lue dans build.gradle via
            // project.findProperty("simulationClass")
            //
            // Le build.gradle filtre avec :
            //   include sim.replace('.', '/') + '.java'
            // ce qui convertit le FQCN en chemin de fichier valide.
            cmd.add("--no-daemon");
            cmd.add("gatlingRun");
            cmd.add("-PsimulationClass=" + req.getSimulationClass());

            // Paramètres utilisateurs — accessibles dans la simulation via :
            // int users        = Integer.getInteger("users", 1);
            // int rampDuration = Integer.getInteger("rampDuration", 10);
            if (req.getUsers() != null && req.getUsers() > 0) {
                cmd.add("-Dusers=" + req.getUsers());
            }
            if (req.getRampDuration() != null && req.getRampDuration() > 0) {
                cmd.add("-DrampDuration=" + req.getRampDuration());
            }

        } else if (Files.exists(pom)) {
            cmd.add(isWindows ? "mvn.cmd" : "mvn");
            cmd.add("-B");
            cmd.add("gatling:test");
            cmd.add("-Dgatling.simulationClass=" + req.getSimulationClass());
            cmd.add("-Dgatling.resultsFolder=" + reportOutputDir.toAbsolutePath());

        } else {
            cmd.add("java");
            cmd.add("-cp"); cmd.add(findGatlingClasspath(projectPath));
            cmd.add("io.gatling.app.Gatling");
            cmd.add("-s");  cmd.add(req.getSimulationClass());
            cmd.add("-sf"); cmd.add(projectPath.resolve("src/gatling/java").toAbsolutePath().toString());
            cmd.add("-rf"); cmd.add(reportOutputDir.toAbsolutePath().toString());
            cmd.add("-rd"); cmd.add("PerfHub Run");
        }

        if (req.getExtraParams() != null && !req.getExtraParams().isBlank()) {
            Arrays.stream(req.getExtraParams().trim().split("\\s+")).forEach(cmd::add);
        }

        return cmd;
    }

    /**
     * Crée un Gradle init script temporaire qui :
     * 1. Filtre les simulations pour n'exécuter QUE la classe demandée
     * 2. Configure le dossier de résultats
     *
     * Avantage : ne modifie JAMAIS le build.gradle de l'utilisateur.
     * Le script est passé via --init-script et s'applique à la session Gradle uniquement.
     */
    private Path createGatlingInitScript(String simulationClass, Path reportOutputDir) throws Exception {
        // Convertir FQCN en chemin de fichier : guce.coc.trn.Sim → guce/coc/trn/Sim
        String filePath = simulationClass.replace('.', '/');

        // Toujours utiliser des slashes forward — compatible Windows, Linux, Docker
        // Gradle (Groovy) accepte les forward slashes sur tous les OS
        String reportPath = reportOutputDir.toAbsolutePath()
                .toString()
                .replace('\\', '/')
                .replace('\\', '/');

                        String scriptContent = String.format("""
            allprojects {
                afterEvaluate { proj ->
                    if (proj.extensions.findByName('gatling') != null) {
                        proj.gatling {
                            simulations {
                                include '%s.java'
                                include '%s.scala'
                            }
                        }
                        proj.tasks.withType(io.gatling.gradle.GatlingRunTask).configureEach { task ->
                            task.systemProperty 'gatling.core.resultsFolder', '%s'
                        }
                    }
                }
            }
        """, filePath, filePath, reportPath);

        // Files.createTempFile utilise automatiquement :
        //   → C:\Users\...\AppData\Local\Temp  sur Windows
        //   → /tmp                                   sur Linux / Docker
        // Aucune configuration nécessaire — portable par nature
        Path initScript = Files.createTempFile("perfhub-gatling-", ".gradle");
        Files.writeString(initScript, scriptContent);
        initScript.toFile().deleteOnExit();

        log.info(">>> Init script Gatling : {} (sera supprimé à l'arrêt de la JVM)", initScript);
        return initScript;
    }

    /**
     * Copie récursivement un répertoire source vers destination.
     * Utilisé pour déplacer le rapport Gatling de build/reports/gatling/
     * vers storage/reports/run-{id}/
     */
    private void copyDirectory(Path source, Path destination) throws Exception {
        Files.createDirectories(destination);
        try (var stream = Files.walk(source)) {
            for (Path src : (Iterable<Path>) stream::iterator) {
                Path dest = destination.resolve(source.relativize(src));
                if (Files.isDirectory(src)) {
                    Files.createDirectories(dest);
                } else {
                    Files.copy(src, dest, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }
        log.debug("Rapport copié : {} fichiers depuis {}",
                Files.walk(destination).count(), source.getFileName());
    }

    private Optional<Path> findGatlingReport(Path projectPath, Path reportOutputDir) {
        // 1. Dossier personnalisé
        Optional<Path> r1 = resultParser.findReportSubDir(reportOutputDir);
        if (r1.isPresent()) return r1;

        // 2. Défaut Gradle : build/reports/gatling/
        Optional<Path> r2 = resultParser.findReportSubDir(projectPath.resolve("build/reports/gatling"));
        if (r2.isPresent()) return r2;

        // 3. Défaut Maven : target/gatling/
        return resultParser.findReportSubDir(projectPath.resolve("target/gatling"));
    }

    private String findGatlingClasspath(Path projectPath) {
        Path lib = projectPath.resolve("lib");
        if (Files.exists(lib)) return lib + "/*";
        Path target = projectPath.resolve("target");
        if (Files.exists(target)) return target + "/*";
        return projectPath + "/*";
    }

    private void saveAndBroadcast(SimulationRun run, String line) {
        try {
            RunLog runLog = RunLog.builder().run(run).line(line).build();
            logRepo.save(runLog);
        } catch (Exception e) {
            log.warn("Impossible de sauvegarder le log : {}", e.getMessage());
        }
        broadcast(run.getId(), line);
    }

    private void broadcast(Long runId, String message) {
        messagingTemplate.convertAndSend("/topic/runs/" + runId + "/logs", message);
    }

    private void failRun(SimulationRun run, String message) {
        run.setStatus(RunStatus.FAILED);
        run.setErrorMessage(message);
        run.setFinishedAt(LocalDateTime.now());
        runRepo.save(run);
        broadcast(run.getId(), "[PerfHub] ❌ ERREUR : " + message);
        messagingTemplate.convertAndSend(
                "/topic/runs/" + run.getId() + "/done",
                Map.of("status", RunStatus.FAILED.name()));
    }
}