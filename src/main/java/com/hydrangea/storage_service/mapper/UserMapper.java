package com.hydrangea.storage_service.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;

import com.hydrangea.storage_service.dto.auth.UserDTO;
import com.hydrangea.storage_service.entity.User;
import com.hydrangea.storage_service.security.CustomUserDetails;

@Mapper(componentModel = "spring")
public interface UserMapper {

    // DTO -> Entity
    @Mappings({
            @Mapping(target = "id", source = "id"),
            @Mapping(target = "username", source = "username"),
            @Mapping(target = "role", source = "role"),
            @Mapping(target = "passwordHash", ignore = true),
            @Mapping(target = "email", ignore = true),
            @Mapping(target = "enabled", ignore = true),
            @Mapping(target = "createdAt", ignore = true),
            @Mapping(target = "lastLoginAt", ignore = true)
    })
    User toUser(UserDTO userDTO);

    // UserDetails -> DTO
    @Mappings({
            @Mapping(target = "id", source = "id"),
            @Mapping(target = "username", source = "username"),
            @Mapping(target = "role", source = "role")
    })
    UserDTO toUserDTO(CustomUserDetails userDetails);

    // Entity -> DTO
    @Mappings({
            @Mapping(target = "id", source = "id"),
            @Mapping(target = "username", source = "username"),
            @Mapping(target = "role", source = "role")
    })
    UserDTO toUserDTO(User user);
}
