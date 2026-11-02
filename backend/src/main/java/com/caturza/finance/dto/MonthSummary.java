package com.caturza.finance.dto;

import java.math.BigDecimal;

public record MonthSummary(int month, BigDecimal income, BigDecimal expenses, BigDecimal balance) {}
