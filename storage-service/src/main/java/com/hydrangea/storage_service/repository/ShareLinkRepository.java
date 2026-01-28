package com.hydrangea.storage_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hydrangea.storage_service.entity.ShareLink;

public interface ShareLinkRepository extends JpaRepository<ShareLink, Long> {

}
