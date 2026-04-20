package com.perfhub.repository;

import com.perfhub.entity.GatlingProject;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GatlingProjectRepository extends JpaRepository<GatlingProject, Long> {
    Optional<GatlingProject> findByName(String name);
    boolean existsByName(String name);
}
