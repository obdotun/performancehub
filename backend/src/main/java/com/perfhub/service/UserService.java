package com.perfhub.service;

import com.perfhub.dto.ChangePasswordRequest;
import com.perfhub.dto.UserCreateRequest;
import com.perfhub.entity.AppUser;
import com.perfhub.enums.UserRole;
import com.perfhub.repository.AppUserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements UserDetailsService {

    private final AppUserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    @PostConstruct
    public void bootstrapAdmin() {
        if (!userRepo.existsByUsername("admin")) {
            AppUser admin = AppUser.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("Admin@1234"))
                    .fullName("Administrateur PerfHub")
                    .role(UserRole.ADMIN)
                    .mustChangePassword(true)
                    .enabled(true)
                    .build();
            userRepo.save(admin);
            log.info(">>> Admin par défaut créé : admin / Admin@1234 (changer au premier login)");
        }
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser user = userRepo.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable : " + username));
        return new User(
                user.getUsername(),
                user.getPassword(),
                user.isEnabled(),
                true, true, true,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }

    public AppUser createUser(UserCreateRequest req) {
        if (userRepo.existsByUsername(req.getUsername())) {
            throw new IllegalArgumentException("Nom d'utilisateur déjà utilisé : " + req.getUsername());
        }
        AppUser user = AppUser.builder()
                .username(req.getUsername())
                .fullName(req.getFullName())
                .role(req.getRole())
                .password(passwordEncoder.encode("Perfhub@2024"))
                .mustChangePassword(true)
                .enabled(true)
                .build();
        return userRepo.save(user);
    }

    public void changePassword(String username, ChangePasswordRequest req) {
        AppUser user = userRepo.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable"));

        log.info("changePassword — user='{}' mustChangePassword={} newPwd='{}'",
                username, user.isMustChangePassword(),
                req.getNewPassword() != null ? "***" : "NULL");

        if (req.getNewPassword() == null || req.getNewPassword().isBlank()) {
            throw new IllegalArgumentException("Le nouveau mot de passe ne peut pas être vide");
        }

        // Si mustChangePassword = true → changement forcé, pas besoin du mot de passe actuel
        if (!user.isMustChangePassword()) {
            if (req.getCurrentPassword() == null || req.getCurrentPassword().isBlank()) {
                throw new IllegalArgumentException("Le mot de passe actuel est requis");
            }
            if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
                throw new IllegalArgumentException("Mot de passe actuel incorrect");
            }
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setMustChangePassword(false);
        userRepo.save(user);
        log.info("changePassword — mot de passe mis à jour pour '{}'", username);
    }

    public void recordLogin(String username) {
        userRepo.findByUsername(username).ifPresent(u -> {
            u.setLastLogin(LocalDateTime.now());
            userRepo.save(u);
        });
    }

    public AppUser findByUsername(String username) {
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable"));
    }

    public List<AppUser> findAll() { return userRepo.findAll(); }

    public void deleteUser(Long id) { userRepo.deleteById(id); }

    public void toggleEnabled(Long id) {
        AppUser user = userRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        user.setEnabled(!user.isEnabled());
        userRepo.save(user);
    }
}