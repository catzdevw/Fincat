package com.caturza.finance.service;

import com.caturza.finance.domain.EntryType;
import com.caturza.finance.domain.FinanceEntry;
import com.caturza.finance.dto.FinancialSummary;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class StatementPdfService {
    private final FinanceService finance;
    public StatementPdfService(FinanceService finance) { this.finance = finance; }

    public byte[] generate(int year, int month) {
        List<FinanceEntry> entries = finance.list(year, month);
        FinancialSummary summary = finance.summary(year, month);
        String period = Month.of(month).getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + year;
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Painter painter = new Painter(doc, period);
            painter.newPage(true);
            painter.heading("MONTHLY FINANCIAL SUMMARY");
            painter.summaryBox("TOTAL INCOME", summary.totalIncome(), 51, new Color(22, 128, 89));
            painter.summaryBox("TOTAL EXPENSES", summary.totalExpenses(), 223, new Color(189, 65, 65));
            painter.summaryBox("REMAINING BALANCE", summary.netBalance(), 395, new Color(38, 79, 176));
            painter.y = 594;

            List<FinanceEntry> income = entries.stream().filter(e -> e.getType() == EntryType.INCOME).toList();
            List<FinanceEntry> expenses = entries.stream().filter(e -> e.getType() == EntryType.EXPENSE).toList();
            painter.section("INCOME", income, summary.totalIncome(), new Color(22, 128, 89));
            painter.section("EXPENSES", expenses, summary.totalExpenses(), new Color(189, 65, 65));

            painter.ensureSpace(95);
            painter.y -= 15;
            painter.rule(painter.y, new Color(45, 65, 93));
            painter.y -= 25;
            painter.text("NET REMAINING BALANCE", 51, painter.y, painter.bold, 11, new Color(25, 42, 66));
            painter.rightMoney(summary.netBalance(), 543, painter.y, painter.bold, 14, new Color(28, 74, 157));
            painter.close();
            doc.save(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to create monthly PDF statement", ex);
        }
    }

    private static class Painter {
        final PDDocument doc;
        final String period;
        final PDFont regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        final PDFont bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        final NumberFormat money = NumberFormat.getNumberInstance(Locale.US);
        PDPageContentStream stream;
        int page = 0;
        float y;

        Painter(PDDocument doc, String period) {
            this.doc = doc;
            this.period = period;
            money.setMinimumFractionDigits(2);
            money.setMaximumFractionDigits(2);
        }

        void newPage(boolean first) throws IOException {
            close();
            PDPage sheet = new PDPage(PDRectangle.A4);
            doc.addPage(sheet);
            stream = new PDPageContentStream(doc, sheet);
            page++;
            stream.setNonStrokingColor(new Color(25, 54, 110));
            stream.addRect(0, 810, 595, 32);
            stream.fill();
            text("CATURZA / FINANCING STATEMENT", 51, 825, bold, 11, Color.WHITE);
            text("PERSONAL FINANCE REPORT", 51, 780, bold, 16, new Color(32, 55, 84));
            text(period.toUpperCase(Locale.ENGLISH), 51, 755, regular, 10, new Color(95, 112, 132));
            text("Page " + page, 502, 755, regular, 9, new Color(95, 112, 132));
            rule(743, new Color(215, 225, 237));
            y = first ? 724 : 722;
            footer();
        }

        void footer() throws IOException {
            rule(51, new Color(215, 225, 237));
            text("Generated " + LocalDate.now() + "  |  Based on recorded entries; not a bank-certified statement.",
                51, 35, regular, 8, new Color(117, 131, 149));
        }

        void heading(String heading) throws IOException {
            text(heading, 51, y, bold, 10, new Color(80, 100, 125));
            y -= 23;
        }

        void summaryBox(String title, BigDecimal value, float x, Color accent) throws IOException {
            stream.setNonStrokingColor(new Color(246, 249, 253));
            stream.addRect(x, 630, 153, 67);
            stream.fill();
            stream.setNonStrokingColor(accent);
            stream.addRect(x, 630, 3, 67);
            stream.fill();
            text(title, x + 12, 674, bold, 8, new Color(108, 125, 146));
            text("PHP " + money.format(value), x + 12, 646, bold, 12, accent);
        }

        void section(String title, List<FinanceEntry> entries, BigDecimal total, Color accent) throws IOException {
            ensureSpace(82);
            y -= 21;
            text(title, 51, y, bold, 12, accent);
            y -= 22;
            stream.setNonStrokingColor(new Color(239, 244, 250));
            stream.addRect(51, y - 10, 493, 24);
            stream.fill();
            text("DATE", 58, y, bold, 8, new Color(84, 101, 122));
            text("DESCRIPTION", 137, y, bold, 8, new Color(84, 101, 122));
            text("CATEGORY", 356, y, bold, 8, new Color(84, 101, 122));
            text("AMOUNT", 495, y, bold, 8, new Color(84, 101, 122));
            y -= 27;
            if (entries.isEmpty()) {
                text("No entries recorded.", 58, y, regular, 9, new Color(125, 137, 153));
                y -= 32;
            }
            for (FinanceEntry entry : entries) {
                List<String> descLines = wrap(entry.getDescription(), regular, 9, 202);
                List<String> catLines = wrap(entry.getCategory() +
                    (entry.getSubcategory() == null ? "" : " / " + entry.getSubcategory()), regular, 8, 115);
                int lines = Math.max(descLines.size(), catLines.size());
                float height = Math.max(29, lines * 12 + 15);
                if (y - height < 88) {
                    newPage(false);
                    text(title + " (CONTINUED)", 51, y, bold, 11, accent);
                    y -= 29;
                }
                text(entry.getDate().toString(), 58, y, regular, 9, new Color(65, 81, 100));
                for (int i = 0; i < descLines.size(); i++) {
                    text(descLines.get(i), 137, y - i * 12, regular, 9, new Color(48, 63, 83));
                }
                for (int i = 0; i < catLines.size(); i++) {
                    text(catLines.get(i), 356, y - i * 12, regular, 8, new Color(97, 110, 128));
                }
                rightMoney(entry.getAmount(), 543, y, regular, 9, new Color(48, 63, 83));
                y -= height;
                rule(y + 10, new Color(231, 237, 245));
            }
            ensureSpace(36);
            text(title + " TOTAL", 58, y, bold, 9, new Color(77, 95, 119));
            rightMoney(total, 543, y, bold, 10, accent);
            y -= 32;
        }

        void ensureSpace(float height) throws IOException {
            if (y - height < 88) newPage(false);
        }

        void rightMoney(BigDecimal value, float right, float y, PDFont font, float size, Color color) throws IOException {
            String label = "PHP " + money.format(value);
            float x = right - font.getStringWidth(label) / 1000 * size;
            text(label, x, y, font, size, color);
        }

        List<String> wrap(String input, PDFont font, float size, float width) throws IOException {
            List<String> lines = new ArrayList<>();
            StringBuilder part = new StringBuilder();
            for (String word : ascii(input).split("\\s+")) {
                String candidate = part.isEmpty() ? word : part + " " + word;
                if (font.getStringWidth(candidate) / 1000 * size <= width) {
                    part = new StringBuilder(candidate);
                } else {
                    if (!part.isEmpty()) { lines.add(part.toString()); part = new StringBuilder(); }
                    // Extremely long words are broken rather than clipped.
                    for (char c : word.toCharArray()) {
                        if (!part.isEmpty() && font.getStringWidth(part.toString() + c) / 1000 * size > width) {
                            lines.add(part.toString());
                            part = new StringBuilder();
                        }
                        part.append(c);
                    }
                }
            }
            if (!part.isEmpty()) lines.add(part.toString());
            if (lines.isEmpty()) lines.add("-");
            return lines;
        }

        String ascii(String input) {
            return input == null ? "" : input.replaceAll("[^\\x20-\\x7E]", "?");
        }

        void text(String value, float x, float y, PDFont font, float size, Color color) throws IOException {
            stream.beginText();
            stream.setNonStrokingColor(color);
            stream.setFont(font, size);
            stream.newLineAtOffset(x, y);
            stream.showText(ascii(value));
            stream.endText();
        }

        void rule(float y, Color color) throws IOException {
            stream.setStrokingColor(color);
            stream.setLineWidth(0.65f);
            stream.moveTo(51, y);
            stream.lineTo(544, y);
            stream.stroke();
        }

        void close() throws IOException {
            if (stream != null) { stream.close(); stream = null; }
        }
    }
}
