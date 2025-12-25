package com.hydrangea.storage_service.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.hydrangea.storage_service.dto.response.ChunkInfo;

@Service
public class ChunkingService {

    @Value("${file.chunk.size}")
    private int chunkSize;

    public List<ChunkInfo> splitFileIntoChunks(byte[] fileData) throws IOException {
        List<ChunkInfo> chunks = new ArrayList<>();
        ByteArrayInputStream inputStream = new ByteArrayInputStream(fileData);

        byte[] buffer = new byte[chunkSize];
        int bytesRead;
        int chunkOrder = 0;

        while ((bytesRead = inputStream.read(buffer)) != -1) {
            byte[] chunkData = new byte[bytesRead];
            System.arraycopy(buffer, 0, chunkData, 0, bytesRead);

            String hash = calculateHash(chunkData);
            chunks.add(new ChunkInfo(chunkData, hash, chunkOrder++));
        }

        return chunks;
    }

    public byte[] reassembleChunks(List<byte[]> chunkDataList) {
        int totalSize = chunkDataList.stream().mapToInt(chunk -> chunk.length).sum();
        byte[] result = new byte[totalSize];

        int position = 0;
        for (byte[] chunk : chunkDataList) {
            System.arraycopy(chunk, 0, result, position, chunk.length);
            position += chunk.length;
        }

        return result;
    }

    private String calculateHash(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder hexString = new StringBuilder();

            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1)
                    hexString.append('0');
                hexString.append(hex);
            }

            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}
