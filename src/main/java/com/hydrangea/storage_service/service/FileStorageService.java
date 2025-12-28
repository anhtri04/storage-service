package com.hydrangea.storage_service.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.hydrangea.storage_service.dto.response.ChunkInfo;
import com.hydrangea.storage_service.dto.response.FileUploadResponse;
import com.hydrangea.storage_service.entity.Bucket;
import com.hydrangea.storage_service.entity.Chunk;
import com.hydrangea.storage_service.entity.FileChunkMapping;
import com.hydrangea.storage_service.entity.FileMetadata;
import com.hydrangea.storage_service.repository.BucketRepository;
import com.hydrangea.storage_service.repository.ChunkRepository;
import com.hydrangea.storage_service.repository.FileMetadataRepository;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class FileStorageService {

    private final FileMetadataRepository fileMetadataRepository;
    private final ChunkRepository chunkRepository;
    private final ChunkingService chunkingService;
    private final S3Service s3Service;
    private final BucketRepository bucketRepository;

    public FileStorageService(FileMetadataRepository fileMetadataRepository,
            ChunkRepository chunkRepository,
            ChunkingService chunkingService,
            S3Service s3Service,
            BucketRepository bucketRepository) {
        this.fileMetadataRepository = fileMetadataRepository;
        this.chunkRepository = chunkRepository;
        this.chunkingService = chunkingService;
        this.s3Service = s3Service;
        this.bucketRepository = bucketRepository;
    }

    @Transactional
    public FileUploadResponse uploadFile(MultipartFile file, Long userId, String bucketId) throws IOException {

        if (bucketId == null) {
            throw new RuntimeException("Bucket ID is required");
        }

        Bucket bucket = bucketRepository.findByBucketIdAndUserId(bucketId, userId)
                .orElseThrow(() -> new RuntimeException(
                        "Bucket not found with ID and user ID: " + bucketId + " and " + userId));
        // Read file data
        byte[] fileData = file.getBytes();

        // Split into chunks
        List<ChunkInfo> chunks = chunkingService.splitFileIntoChunks(fileData);

        // Create file metadata
        FileMetadata fileMetadata = new FileMetadata();
        fileMetadata.setFileId(UUID.randomUUID().toString());
        fileMetadata.setOriginalFileName(file.getOriginalFilename());
        fileMetadata.setBucket(bucket);
        fileMetadata.setFileSize((long) fileData.length);
        fileMetadata.setContentType(file.getContentType());

        int uniqueChunks = 0;
        int duplicateChunks = 0;
        List<String> uploadedS3Keys = new ArrayList<>();

        try {
            // Process each chunk
            for (ChunkInfo chunkInfo : chunks) {

                System.out.println("Uploading chunk: order=" + chunkInfo.getOrder() +
                        ", hash=" + chunkInfo.getHash() +
                        ", size=" + chunkInfo.getData().length);

                Chunk chunk;
                Optional<Chunk> existingChunk = chunkRepository.findByChunkHash(chunkInfo.getHash());

                if (existingChunk.isPresent()) {
                    // Chunk already exists - deduplicated!
                    chunk = existingChunk.get();
                    chunk.incrementReference();
                    duplicateChunks++;
                } else {
                    // New chunk - upload to S3
                    String s3Key = "chunks/" + chunkInfo.getHash();
                    s3Service.uploadChunk(s3Key, chunkInfo.getData());
                    uploadedS3Keys.add(s3Key);

                    chunk = new Chunk();
                    chunk.setChunkHash(chunkInfo.getHash());
                    chunk.setS3Key(s3Key);
                    chunk.setChunkSize((long) chunkInfo.getData().length);
                    chunk.setReferenceCount(1);
                    uniqueChunks++;
                }

                chunk = chunkRepository.save(chunk);

                // Create mapping
                FileChunkMapping mapping = new FileChunkMapping(fileMetadata, chunk, chunkInfo.getOrder());
                fileMetadata.getChunkMappings().add(mapping);
            }

            fileMetadataRepository.save(fileMetadata);

            // Prepare response
            FileUploadResponse response = new FileUploadResponse();
            response.setFileId(fileMetadata.getFileId());
            response.setOriginalFileName(fileMetadata.getOriginalFileName());
            response.setFileSize(fileMetadata.getFileSize());
            response.setTotalChunks(chunks.size());
            response.setUniqueChunks(uniqueChunks);
            response.setDuplicateChunks(duplicateChunks);
            response.setMessage("File uploaded successfully with deduplication");

            return response;
        } catch (Exception e) {
            // Rollback S3 uploads if database operation fails
            for (String s3Key : uploadedS3Keys) {
                try {
                    s3Service.deleteChunk(s3Key);
                } catch (Exception ex) {
                    // Log but don't throw - we want to complete the rollback
                    System.err.println("Failed to delete chunk during rollback: " + s3Key);
                }
            }
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public byte[] downloadFile(String fileId, Long userId) {
        FileMetadata fileMetadata = fileMetadataRepository
                .findByFileIdAndBucket_User_Id(fileId, userId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        System.out.println("=== DOWNLOAD DEBUG ===");
        System.out.println("File ID: " + fileId);
        System.out.println("Original filename: " + fileMetadata.getOriginalFileName());
        System.out.println("Expected file size: " + fileMetadata.getFileSize());
        System.out.println("Number of chunk mappings: " + fileMetadata.getChunkMappings().size());

        // Check if chunks are already ordered
        System.out.println("Chunk mappings order BEFORE sorting:");
        for (FileChunkMapping mapping : fileMetadata.getChunkMappings()) {
            System.out.println("  Order: " + mapping.getChunkOrder() +
                    ", Hash: " + mapping.getChunk().getChunkHash() +
                    ", Size: " + mapping.getChunk().getChunkSize());
        }

        // Sort explicitly
        List<FileChunkMapping> sortedMappings = fileMetadata.getChunkMappings()
                .stream()
                .sorted(Comparator.comparingInt(FileChunkMapping::getChunkOrder))
                .collect(Collectors.toList());

        System.out.println("Chunk mappings order AFTER sorting:");
        for (FileChunkMapping mapping : sortedMappings) {
            System.out.println("  Order: " + mapping.getChunkOrder() +
                    ", Hash: " + mapping.getChunk().getChunkHash() +
                    ", Size: " + mapping.getChunk().getChunkSize());
        }

        List<byte[]> chunkDataList = new ArrayList<>();

        for (FileChunkMapping mapping : sortedMappings) {
            System.out.println("Downloading chunk: order=" + mapping.getChunkOrder() +
                    ", s3Key=" + mapping.getChunk().getS3Key());
            byte[] chunkData = s3Service.downloadChunk(mapping.getChunk().getS3Key());
            System.out.println("  Downloaded size: " + chunkData.length +
                    ", Expected size: " + mapping.getChunk().getChunkSize());
            chunkDataList.add(chunkData);
        }

        byte[] result = chunkingService.reassembleChunks(chunkDataList);
        System.out.println("Final reassembled size: " + result.length);
        System.out.println("Expected size: " + fileMetadata.getFileSize());
        System.out.println("Size match: " + (result.length == fileMetadata.getFileSize()));
        System.out.println("=== END DOWNLOAD DEBUG ===");

        return result;
    }

    @Transactional
    public void deleteFile(String fileId, Long userId) {
        log.info("Deleting file: " + fileId);
        FileMetadata fileMetadata = fileMetadataRepository.findByFileIdAndBucket_User_Id(fileId, userId)
                .orElseThrow(() -> new RuntimeException("File not found: " + fileId));

        if (!fileMetadata.getBucket().getUser().getId().equals(userId)) {
            throw new RuntimeException("User is not authorized to delete this file");
        }

        // Collect S3 keys to delete AFTER successful transaction
        List<String> s3KeysToDelete = new ArrayList<>();

        // Collect chunks to process BEFORE deleting file metadata
        List<Chunk> chunksToProcess = fileMetadata.getChunkMappings().stream()
                .map(FileChunkMapping::getChunk)
                .distinct()
                .collect(Collectors.toList());

        // Remove from bucket association to avoid Hibernate disassociation updates
        if (fileMetadata.getBucket() != null) {
            fileMetadata.getBucket().getFiles().remove(fileMetadata);
        }

        // Delete file metadata - this will cascade delete all mappings
        fileMetadataRepository.delete(fileMetadata);

        // Process each chunk
        for (Chunk chunk : chunksToProcess) {
            chunk.decrementReference();

            // If no more references, delete from S3 and database
            if (chunk.getReferenceCount() == 0) {
                s3KeysToDelete.add(chunk.getS3Key());
                chunkRepository.delete(chunk);
            } else {
                chunkRepository.save(chunk);
            }
        }

        // Register S3 deletion to happen AFTER transaction commits successfully
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        // This runs ONLY if transaction commits successfully
                        for (String s3Key : s3KeysToDelete) {
                            try {
                                s3Service.deleteChunk(s3Key);
                            } catch (Exception e) {
                                log.error("Failed to delete chunk from S3: {}", s3Key, e);
                                // Consider adding to a dead letter queue for retry
                            }
                        }
                    }
                });
    }

    @Transactional(readOnly = true)
    public List<FileMetadata> listFiles(String bucketId, Long userId) {

        Bucket bucket = bucketRepository.findByBucketIdAndUserId(bucketId, userId)
                .orElseThrow(() -> new RuntimeException(
                        "Bucket not found with ID and user ID: " + bucketId + " and " + userId));

        return fileMetadataRepository.findByBucketAndBucket_User_Id(bucket, userId);
    }

    @Transactional(readOnly = true)
    public FileMetadata getFileMetadata(String fileId, Long userId) {
        return fileMetadataRepository.findByFileIdAndBucket_User_Id(fileId, userId)
                .orElseThrow(() -> new RuntimeException("File not found: " + fileId));
    }
}
