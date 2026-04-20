package com.perfhub.service;

import com.perfhub.entity.SimulationRun;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Stream;

/**
 * Parse le fichier simulation.log généré par Gatling 3.9.0
 * pour extraire les métriques de performance.
 */
@Service
@Slf4j
public class GatlingResultParser {

    /**
     * Lit le répertoire de rapport généré et met à jour les stats de SimulationRun.
     * Gatling génère : <reportDir>/simulation.log
     */
    public void parseAndUpdate(SimulationRun run, Path reportDir) {
        Path simLog = reportDir.resolve("simulation.log");
        if (!Files.exists(simLog)) {
            log.warn("simulation.log introuvable dans {}", reportDir);
            return;
        }

        try {
            long totalRequests = 0;
            long failedRequests = 0;
            long totalResponseTime = 0;
            long responseCount = 0;

            try (Stream<String> lines = Files.lines(simLog)) {
                for (String line : (Iterable<String>) lines::iterator) {
                    String[] parts = line.split("\t");
                    if (parts.length < 1) continue;

                    // Format Gatling 3.x: REQUEST\t<userId>\t<reqName>\t<startTs>\t<endTs>\t<status>\t<message>
                    if ("REQUEST".equals(parts[0]) && parts.length >= 6) {
                        totalRequests++;
                        String status = parts[5].trim();
                        if ("KO".equals(status)) failedRequests++;

                        try {
                            long start = Long.parseLong(parts[3].trim());
                            long end   = Long.parseLong(parts[4].trim());
                            totalResponseTime += (end - start);
                            responseCount++;
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }

            run.setTotalRequests(totalRequests);
            run.setFailedRequests(failedRequests);
            run.setMeanResponseTime(responseCount > 0 ? totalResponseTime / responseCount : 0L);

            log.info("Stats run #{}: total={}, failed={}, meanRT={}ms",
                    run.getId(), totalRequests, failedRequests, run.getMeanResponseTime());

        } catch (IOException e) {
            log.error("Erreur lecture simulation.log", e);
        }
    }

    /**
     * Retrouve le sous-dossier de rapport créé par Gatling dans le répertoire de sortie.
     * Gatling crée un dossier timestampé ex: results/basicSimulation-20240101120000
     */
    public Optional<Path> findReportSubDir(Path resultsDir) {
        if (!Files.exists(resultsDir)) return Optional.empty();
        try (Stream<Path> dirs = Files.list(resultsDir)) {
            return dirs
                    .filter(Files::isDirectory)
                    .filter(p -> Files.exists(p.resolve("simulation.log")))
                    .max(Comparator.comparingLong(p -> p.toFile().lastModified()));
        } catch (IOException e) {
            log.error("Erreur lecture répertoire résultats", e);
            return Optional.empty();
        }
    }
}
