package com.caturza.finance.repository;

import com.caturza.finance.domain.FinanceEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface FinanceEntryRepository extends JpaRepository<FinanceEntry, Long> {
    List<FinanceEntry> findByDateBetweenOrderByDateDescIdDesc(LocalDate start, LocalDate end);
}
