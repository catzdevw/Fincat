package com.caturza.finance.dto;

import com.caturza.finance.domain.EntryType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record EntryRequest(
    @NotNull LocalDate date,
    @NotNull EntryType type,
    @NotBlank @Size(max = 70) String category,
    @Size(max = 70) String subcategory,
    @NotBlank @Size(max = 200) String description,
    @NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal amount
) {}
