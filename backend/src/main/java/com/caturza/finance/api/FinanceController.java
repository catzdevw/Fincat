package com.caturza.finance.api;

import com.caturza.finance.domain.FinanceEntry;
import com.caturza.finance.dto.EntryRequest;
import com.caturza.finance.dto.FinancialSummary;
import com.caturza.finance.service.FinanceService;
import com.caturza.finance.service.StatementPdfService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Validated
public class FinanceController {
    private final FinanceService finance;
    private final StatementPdfService pdf;
    public FinanceController(FinanceService finance, StatementPdfService pdf) {
        this.finance = finance;
        this.pdf = pdf;
    }

    @GetMapping("/health")
    public Map<String, String> health() { return Map.of("status", "ok"); }

    @GetMapping("/transactions")
    public List<FinanceEntry> list(@RequestParam @Min(1900) @Max(2200) int year,
        @RequestParam(required = false) @Min(1) @Max(12) Integer month) {
        return finance.list(year, month);
    }

    @PostMapping("/transactions")
    public ResponseEntity<FinanceEntry> create(@Valid @RequestBody EntryRequest data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(finance.create(data));
    }

    @PutMapping("/transactions/{id}")
    public FinanceEntry update(@PathVariable long id, @Valid @RequestBody EntryRequest data) {
        return finance.update(id, data);
    }

    @DeleteMapping("/transactions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) { finance.delete(id); }

    @GetMapping("/reports/annual")
    public FinancialSummary annual(@RequestParam @Min(1900) @Max(2200) int year) {
        return finance.summary(year, null);
    }

    @GetMapping("/reports/monthly")
    public FinancialSummary monthly(@RequestParam @Min(1900) @Max(2200) int year,
        @RequestParam @Min(1) @Max(12) int month) {
        return finance.summary(year, month);
    }

    @GetMapping(value = "/reports/monthly/{year}/{month}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> monthlyPdf(@PathVariable @Min(1900) @Max(2200) int year,
        @PathVariable @Min(1) @Max(12) int month) {
        byte[] bytes = pdf.generate(year, month);
        String filename = "Caturza-Statement-%04d-%02d.pdf".formatted(year, month);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentLength(bytes.length)
            .contentType(MediaType.APPLICATION_PDF)
            .body(bytes);
    }
}
