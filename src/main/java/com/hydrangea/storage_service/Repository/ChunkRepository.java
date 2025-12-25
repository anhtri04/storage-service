package com.hydrangea.storage_service.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hydrangea.storage_service.entity.Chunk;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ChunkRepository extends JpaRepository<Chunk, Long> {
    Optional<Chunk> findByChunkHash(String chunkHash);
}
