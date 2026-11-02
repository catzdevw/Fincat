package com.caturza.finance.service;

import com.caturza.finance.domain.EntryType;
import com.caturza.finance.domain.FinanceEntry;
import com.caturza.finance.dto.CategoryTotal;
import com.caturza.finance.dto.FinancialSummary;
import com.caturza.finance.dto.MonthSummary;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

public final class FinanceMath {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private FinanceMath() {}

    public static FinancialSummary summarize(int year, Integer month, List<FinanceEntry> entries) {
        List<FinanceEntry> selected = entries.stream()
            .filter(e -> e.getDate().getYear() == year)
            .filter(e -> month == null || e.getDate().getMonthValue() == month)
            .toList();
        BigDecimal income = total(selected, EntryType.INCOME);
        BigDecimal expenses = total(selected, EntryType.EXPENSE);
        BigDecimal rate = income.signum() > 0
            ? income.subtract(expenses).multiply(BigDecimal.valueOf(100)).divide(income, 1, RoundingMode.HALF_UP)
            : ZERO;
        Map<String, BigDecimal> categoryMap = selected.stream()
            .filter(e -> e.getType() == EntryType.EXPENSE)
            .collect(Collectors.groupingBy(FinanceEntry::getCategory,
                Collectors.reducing(ZERO, FinanceEntry::getAmount, BigDecimal::add)));
        List<CategoryTotal> categories = categoryMap.entrySet().stream()
            .map(e -> new CategoryTotal(e.getKey(), e.getValue()))
            .sorted(Comparator.comparing(CategoryTotal::total).reversed())
            .toList();
        List<MonthSummary> months = new ArrayList<>();
        if (month == null) {
            for (int m = 1; m <= 12; m++) {
                final int mm = m;
                List<FinanceEntry> inMonth = selected.stream().filter(e -> e.getDate().getMonthValue() == mm).toList();
                BigDecimal mi = total(inMonth, EntryType.INCOME);
                BigDecimal me = total(inMonth, EntryType.EXPENSE);
                months.add(new MonthSummary(m, mi, me, mi.subtract(me)));
            }
        }
        return new FinancialSummary(year, month, income, expenses, income.subtract(expenses),
            rate, categories, months);
    }

    private static BigDecimal total(List<FinanceEntry> entries, EntryType type) {
        return entries.stream().filter(e -> e.getType() == type)
            .map(FinanceEntry::getAmount).reduce(ZERO, BigDecimal::add);
    }
}
