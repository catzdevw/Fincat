package com.caturza.finance.service;

import com.caturza.finance.domain.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class FinanceMathTest {
    private FinanceEntry entry(int month, EntryType type, String category, String amount) {
        FinanceEntry e = new FinanceEntry();
        e.setDate(LocalDate.of(2026, month, 10));
        e.setType(type);
        e.setCategory(category);
        e.setDescription("test");
        e.setAmount(new BigDecimal(amount));
        return e;
    }

    @Test void annualTotalsAndTwelveMonths() {
        var sum = FinanceMath.summarize(2026, null, List.of(
            entry(1, EntryType.INCOME, "Salary", "5000.00"),
            entry(1, EntryType.EXPENSE, "Bills", "1200.00"),
            entry(2, EntryType.EXPENSE, "Groceries", "500.00")));
        assertEquals(new BigDecimal("3300.00"), sum.netBalance());
        assertEquals(12, sum.monthlyTotals().size());
        assertEquals(new BigDecimal("3800.00"), sum.monthlyTotals().get(0).balance());
        assertEquals(new BigDecimal("-500.00"), sum.monthlyTotals().get(1).balance());
        assertEquals(new BigDecimal("0.00"), sum.monthlyTotals().get(11).balance());
        assertEquals(new BigDecimal("66.0"), sum.savingsRate());
    }

    @Test void monthlyFilterDoesNotMixOtherMonths() {
        var sum = FinanceMath.summarize(2026, 2, List.of(
            entry(1, EntryType.INCOME, "Salary", "10000.00"),
            entry(2, EntryType.INCOME, "Freelance", "600.00"),
            entry(2, EntryType.EXPENSE, "Bills", "100.00")));
        assertEquals(new BigDecimal("500.00"), sum.netBalance());
        assertEquals(0, sum.monthlyTotals().size());
        assertEquals("Bills", sum.expenseCategories().get(0).category());
    }

    @Test void noIncomeDoesNotDivideByZero() {
        var sum = FinanceMath.summarize(2026, 1, List.of(entry(1, EntryType.EXPENSE, "Bills", "500.00")));
        assertEquals(0, sum.savingsRate().signum());
    }
}
