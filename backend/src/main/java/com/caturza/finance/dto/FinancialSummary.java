package com.caturza.finance.dto;

import java.math.BigDecimal;
import java.util.List;

public record FinancialSummary(
    int year, Integer month,
    BigDecimal totalIncome, BigDecimal totalExpenses,
    BigDecimal netBalance, BigDecimal savingsRate,
    List<CategoryTotal> expenseCategories,
    List<MonthSummary> monthlyTotals
) {}
