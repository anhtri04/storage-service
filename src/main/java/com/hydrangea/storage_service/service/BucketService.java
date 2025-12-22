package com.hydrangea.storage_service.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.hydrangea.storage_service.Repository.BucketRepository;
import com.hydrangea.storage_service.dto.response.BucketResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BucketService {

    private final BucketRepository bucketRepository;

    public BucketResponse getAllBuckets() {

        List<BucketResponse> buckets = bucketRepository.findAllByUserId();

        return buckets;
    }
}
