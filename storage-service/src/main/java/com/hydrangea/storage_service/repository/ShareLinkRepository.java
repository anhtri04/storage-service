package com.hydrangea.storage_service.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hydrangea.storage_service.entity.ShareLink;
import com.hydrangea.storage_service.entity.User;

public interface ShareLinkRepository extends JpaRepository<ShareLink, Long> {
    Optional<ShareLink> findByLink(String link);

    Optional<ShareLink> findByResourceId(String resourceId);

    List<ShareLink> findByCreatedByAndIsActive(User createdBy, Boolean isActive);

    List<ShareLink> findByResourceIdAndIsActive(String resourceId, Boolean isActive);

    boolean existsByLink(String link);
}
