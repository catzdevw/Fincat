package com.caturza.finance.service;

import com.caturza.finance.domain.FinanceEntry;
import com.caturza.finance.dto.EntryRequest;
import com.caturza.finance.dto.FinancialSummary;
import com.caturza.finance.repository.FinanceEntryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.List;

@Service
public class FinanceService {
    private final FinanceEntryRepository repository;
    public FinanceService(FinanceEntryRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public List<FinanceEntry> list(int year, Integer month) {
        LocalDate start = month == null ? LocalDate.of(year, 1, 1) : LocalDate.of(year, month, 1);
        LocalDate end = month == null ? LocalDate.of(year, 12, 31) : start.plusMonths(1).minusDays(1);
        return repository.findByDateBetweenOrderByDateDescIdDesc(start, end);
    }

    @Transactional(readOnly = true)
    public FinancialSummary summary(int year, Integer month) {
        return FinanceMath.summarize(year, month, list(year, month));
    }

    @Transactional
    public FinanceEntry create(EntryRequest data) {
        return repository.save(apply(new FinanceEntry(), data));
    }

    @Transactional
    public FinanceEntry update(Long id, EntryRequest data) {
        FinanceEntry existing = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found"));
        return repository.save(apply(existing, data));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found");
        }
        repository.deleteById(id);
    }

    private FinanceEntry apply(FinanceEntry entry, EntryRequest data) {
        entry.setDate(data.date());
        entry.setType(data.type());
        entry.setCategory(data.category().trim());
        entry.setSubcategory(data.subcategory() == null || data.subcategory().isBlank() ? null : data.subcategory().trim());
        entry.setDescription(data.description().trim());
        entry.setAmount(data.amount());
        return entry;
    }
}
