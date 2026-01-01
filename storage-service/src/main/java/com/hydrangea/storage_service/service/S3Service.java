package com.hydrangea.storage_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;

@Service
@Slf4j
public class S3Service {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public S3Service(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public void uploadChunk(String s3Key, byte[] chunkData) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType("application/octet-stream")
                .build();

        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(chunkData));
    }

    public byte[] downloadChunk(String s3Key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();

        try (ResponseInputStream<GetObjectResponse> response = s3Client.getObject(getObjectRequest)) {
            return response.readAllBytes();
        } catch (IOException e) {
            throw new RuntimeException("Error reading chunk from S3", e);
        }
    }

    public void deleteChunk(String s3Key) {
        log.info("Deleting chunk from S3: " + s3Key);
        DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();

        s3Client.deleteObject(deleteObjectRequest);
    }
}
