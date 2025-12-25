package com.hydrangea.storage_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hydrangea.storage_service.entity.FileChunkMapping;

public interface FileChunkMappingRepository extends JpaRepository<FileChunkMapping, Long> {

}
