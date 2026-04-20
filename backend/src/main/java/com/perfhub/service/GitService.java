package com.perfhub.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.net.URI;
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
     * @return chemin local du projet
     */
    public File cloneOrPull(String repoUrl, String branch, String username, String token, File targetDir) throws Exception {
        if (targetDir.exists() && new File(targetDir, ".git").exists()) {
            log.info("Dépôt existant détecté — git pull ({})", targetDir);
            runGit(targetDir.getParentFile(), buildPullCommand(targetDir, branch));
        } else {
            log.info("Clonage de {} branche {} → {}", repoUrl, branch, targetDir);
            targetDir.mkdirs();
            runGit(targetDir.getParentFile(), buildCloneCommand(repoUrl, branch, username, token, targetDir));
        }
        return targetDir;
    }

    /**
     * Liste les branches disponibles sur le dépôt distant.
     */
    public List<String> listBranches(String repoUrl, String username, String token) throws Exception {
        String urlWithCreds = injectCredentials(repoUrl, username, token);
        List<String> cmd = new ArrayList<>();
        cmd.add("git");
        if (!sslVerify) { cmd.add("-c"); cmd.add("http.sslVerify=false"); }
        cmd.add("ls-remote");
        cmd.add("--heads");
        cmd.add(urlWithCreds);

        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.redirectErrorStream(true);
        Process p = pb.start();
        String output = new String(p.getInputStream().readAllBytes());
        p.waitFor(timeoutSeconds, TimeUnit.SECONDS);

        List<String> branches = new ArrayList<>();
        for (String line : output.split("\n")) {
            if (line.contains("refs/heads/")) {
                branches.add(line.replaceAll(".*refs/heads/", "").trim());
            }
        }
        return branches;
    }

    private List<String> buildCloneCommand(String repoUrl, String branch, String username, String token, File targetDir) {
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

    private List<String> buildPullCommand(File repoDir, String branch) {
        return List.of("git", "-C", repoDir.getAbsolutePath(), "pull", "origin", branch);
    }

    private void runGit(File workingDir, List<String> cmd) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(workingDir);
        pb.redirectErrorStream(true);
        Process p = pb.start();
        String output = new String(p.getInputStream().readAllBytes());
        boolean finished = p.waitFor(timeoutSeconds, TimeUnit.SECONDS);
        if (!finished) { p.destroyForcibly(); throw new RuntimeException("Timeout Git"); }
        if (p.exitValue() != 0) throw new RuntimeException("Git a échoué:\n" + output);
        log.info("Git OK:\n{}", output);
    }

    private String injectCredentials(String repoUrl, String username, String token) {
        try {
            URI uri = new URI(repoUrl);
            String encodedUser = username.replace("@", "%40");
            String authority = encodedUser + ":" + token + "@" + uri.getHost()
                    + (uri.getPort() != -1 ? ":" + uri.getPort() : "");
            return new URI(uri.getScheme(), authority, uri.getPath(), uri.getQuery(), uri.getFragment()).toString();
        } catch (Exception e) {
            throw new RuntimeException("URL invalide : " + repoUrl, e);
        }
    }
}
