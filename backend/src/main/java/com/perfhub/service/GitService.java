package com.perfhub.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.net.URI;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class GitService {

    @Value("${perfhub.git.ssl-verify}")
    private boolean sslVerify;

    @Value("${perfhub.git.timeout-seconds}")
    private int timeoutSeconds;

    /**
     * Clone ou pull un dépôt Bitbucket.
     */
    public File cloneOrPull(String repoUrl, String branch, String username,
                            String token, File targetDir) throws Exception {
        if (targetDir.exists() && new File(targetDir, ".git").exists()) {
            log.info("Dépôt existant — git pull ({}) branche {}", targetDir, branch);
            runGit(targetDir, buildPullCommand(targetDir, branch, repoUrl, username, token));
        } else {
            log.info("Clonage de {} branche {} → {}", repoUrl, branch, targetDir);
            targetDir.mkdirs();
            runGit(targetDir.getParentFile(), buildCloneCommand(repoUrl, branch, username, token, targetDir));
        }
        return targetDir;
    }

    /**
     * Liste les branches disponibles sur le dépôt distant.
     * Lance git ls-remote et parse les refs/heads/*.
     */
    public List<String> listBranches(String repoUrl, String username, String token) throws Exception {
        String urlWithCreds = injectCredentials(repoUrl, username, token);

        List<String> cmd = new ArrayList<>();
        cmd.add("git");
        if (!sslVerify) {
            cmd.add("-c");
            cmd.add("http.sslVerify=false");
        }
        cmd.add("ls-remote");
        cmd.add("--heads");
        cmd.add(urlWithCreds);

        log.info("git ls-remote --heads {}", repoUrl); // ne pas logger l'URL avec credentials

        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.redirectErrorStream(true);

        Process p = pb.start();
        String output = new String(p.getInputStream().readAllBytes());
        boolean finished = p.waitFor(timeoutSeconds, TimeUnit.SECONDS);

        if (!finished) {
            p.destroyForcibly();
            throw new RuntimeException(
                    "Timeout (" + timeoutSeconds + "s) dépassé lors de la connexion à Bitbucket. " +
                            "Vérifiez l'URL du dépôt et la connectivité réseau."
            );
        }

        int exitCode = p.exitValue();
        log.info("git ls-remote exit={}", exitCode);
        log.debug("git ls-remote output:\n{}", output);

        if (exitCode != 0) {
            // Nettoyer les credentials de l'output avant de logger
            String safeOutput = output.replaceAll("https?://[^@]+@", "https://***@");
            throw new RuntimeException(buildGitErrorMessage(safeOutput));
        }

        List<String> branches = new ArrayList<>();
        for (String line : output.split("\n")) {
            line = line.trim();
            if (line.contains("refs/heads/")) {
                String branch = line.replaceAll(".*refs/heads/", "").trim();
                if (!branch.isBlank()) {
                    branches.add(branch);
                }
            }
        }

        if (branches.isEmpty()) {
            log.warn("git ls-remote a réussi mais aucune branche trouvée. Output: {}", output);
            throw new RuntimeException(
                    "Aucune branche trouvée sur ce dépôt. " +
                            "Vérifiez que le dépôt n'est pas vide et que vous avez les droits d'accès."
            );
        }

        log.info("Branches trouvées : {}", branches);
        return branches;
    }

    // ── Commandes Git ────────────────────────────────────────────────────────

    private List<String> buildCloneCommand(String repoUrl, String branch,
                                           String username, String token, File targetDir) {
        String urlWithCreds = injectCredentials(repoUrl, username, token);
        List<String> cmd = new ArrayList<>();
        cmd.add("git");
        if (!sslVerify) { cmd.add("-c"); cmd.add("http.sslVerify=false"); }
        cmd.add("clone");
        cmd.add("--branch"); cmd.add(branch);
        cmd.add("--depth"); cmd.add("1");
        cmd.add(urlWithCreds);
        cmd.add(targetDir.getAbsolutePath());
        return cmd;
    }

    private List<String> buildPullCommand(File repoDir, String branch,
                                          String repoUrl, String username, String token) {
        String urlWithCreds = injectCredentials(repoUrl, username, token);
        List<String> cmd = new ArrayList<>();
        cmd.add("git");
        if (!sslVerify) { cmd.add("-c"); cmd.add("http.sslVerify=false"); }
        cmd.add("-C"); cmd.add(repoDir.getAbsolutePath());
        cmd.add("pull");
        cmd.add(urlWithCreds);
        cmd.add(branch);
        return cmd;
    }

    private void runGit(File workingDir, List<String> cmd) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(workingDir);
        pb.redirectErrorStream(true);

        Process p = pb.start();
        String output = new String(p.getInputStream().readAllBytes());
        boolean finished = p.waitFor(timeoutSeconds, TimeUnit.SECONDS);

        if (!finished) {
            p.destroyForcibly();
            throw new RuntimeException("Timeout Git (" + timeoutSeconds + "s)");
        }
        if (p.exitValue() != 0) {
            String safeOutput = output.replaceAll("https?://[^@]+@", "https://***@");
            throw new RuntimeException("Git a échoué:\n" + safeOutput);
        }
        log.info("Git OK:\n{}", output.substring(0, Math.min(output.length(), 500)));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Injecte les credentials dans l'URL Git.
     *
     * Approche : concaténation directe de la chaîne (comme TestHub).
     * Le constructeur URI multi-arguments double-encode les caractères spéciaux
     * (ex: @ → %40 → %2540) ce qui casse l'authentification Bitbucket Server.
     *
     * Format final : https://user%40domain.com:TOKEN@bitbucket.host/scm/repo.git
     */
    private String injectCredentials(String repoUrl, String username, String token) {
        try {
            String url = repoUrl.trim();

            // Encoder @ dans l'email pour l'URL
            String encodedUser = username.replace("@", "%40");

            // Extraire le scheme (https://)
            int schemeEnd = url.indexOf("://");
            if (schemeEnd == -1) {
                throw new RuntimeException("URL invalide (pas de scheme) : " + url);
            }
            String scheme = url.substring(0, schemeEnd + 3); // "https://"
            String rest   = url.substring(schemeEnd + 3);    // "bitbucket.guce.gouv.ci/scm/..."

            // Construire : https://user%40domain:token@bitbucket.host/scm/...
            return scheme + encodedUser + ":" + token + "@" + rest;

        } catch (Exception e) {
            throw new RuntimeException("URL de dépôt invalide : " + repoUrl + " — " + e.getMessage());
        }
    }

    private String buildGitErrorMessage(String gitOutput) {
        if (gitOutput.contains("Authentication failed") || gitOutput.contains("403")) {
            return "Authentification échouée. Vérifiez votre nom d'utilisateur et token d'accès.";
        }
        if (gitOutput.contains("not found") || gitOutput.contains("404")) {
            return "Dépôt introuvable. Vérifiez l'URL du dépôt.";
        }
        if (gitOutput.contains("SSL") || gitOutput.contains("certificate")) {
            return "Erreur SSL. Vérifiez la configuration réseau.";
        }
        if (gitOutput.contains("Connection refused") || gitOutput.contains("Could not resolve")) {
            return "Impossible de se connecter à Bitbucket. Vérifiez l'URL et la connectivité réseau.";
        }
        return "Erreur Git : " + gitOutput.substring(0, Math.min(gitOutput.length(), 300));
    }
}