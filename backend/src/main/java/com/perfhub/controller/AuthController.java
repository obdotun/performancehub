package com.perfhub.controller;

import com.perfhub.dto.*;
import com.perfhub.entity.AppUser;
import com.perfhub.security.JwtService;
import com.perfhub.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtService jwtService;
    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest req) {
        authManager.authenticate(new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
        UserDetails userDetails = userService.loadUserByUsername(req.getUsername());
        AppUser user = userService.findByUsername(req.getUsername());
        userService.recordLogin(req.getUsername());
        String token = jwtService.generateToken(userDetails);
        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .mustChangePassword(user.isMustChangePassword())
                .build());
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @RequestBody ChangePasswordRequest req,
            java.security.Principal principal) {
        userService.changePassword(principal.getName(), req);
        return ResponseEntity.noContent().build();
    }
}