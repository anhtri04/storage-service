package com.hydrangea.storage_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(name = "chunks", indexes = {
        @Index(name = "idx_chunk_hash", columnList = "chunkHash", unique = true)
})
@Getter
@Setter
@ToString
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@NoArgsConstructor
public class Chunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String chunkHash;

    @Column(nullable = false)
    private String s3Key;

    @Column(nullable = false)
    private Long chunkSize;

    @Column(nullable = false)
    private Integer referenceCount = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public void incrementReference() {
        this.referenceCount++;
    }

    public void decrementReference() {
        if (this.referenceCount > 0) {
            this.referenceCount--;
        }
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (referenceCount == null) {
            referenceCount = 0;
        }
    }
}
