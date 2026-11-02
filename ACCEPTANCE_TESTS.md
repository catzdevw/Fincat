# Manual MVP Acceptance Checklist

Use these checks on the running application to confirm the inputs, calculations, charts, and downloads are actually connected to your database.

> Test using a **new year with no existing transactions**. This avoids mixing test data with your real finances. Delete these entries afterward.

1. Choose a year with no entries. Dashboard totals should be PHP 0.00 and charts show empty states.
2. Choose January. Add `INCOME / Salary / Test salary / 10000.00` dated January 5. January income and remaining balance should both become PHP 10,000.00.
3. Add `EXPENSE / Bills / BOHECO / Electricity / Test electric bill / 1500.00` dated January 8. January expenses should become PHP 1,500.00, remaining balance PHP 8,500.00.
4. Add `EXPENSE / Groceries / Test groceries / 2500.00` dated January 10. January expenses should become PHP 4,000.00 and remaining balance PHP 6,000.00. Expense chart should show Bills and Groceries.
5. Select February; January's entries should **not** appear in February. Add `EXPENSE / Bills / Water / Test water / 500.00` for February 4. February balance should show **-PHP 500.00** because February has no income.
6. Return to Dashboard. Annual income PHP 10,000.00, expenses PHP 4,500.00, net balance PHP 5,500.00. Annual chart should show January and February spending bars.
7. Select January and **Download PDF**. It must contain the 3 January rows, income PHP 10,000.00, expenses PHP 4,000.00 and remaining PHP 6,000.00.
8. Select February and **Download PDF**. It must contain only February's water bill and -PHP 500.00 remaining balance.
9. Edit January groceries from PHP 2,500.00 to PHP 1,000.00. Recheck January, Dashboard and January PDF; all totals must update immediately after save.
10. Delete February water bill. February expenses/balance should return to PHP 0.00; annual totals and charts must update. Refresh the browser; remaining transactions must still be present.
11. Test year navigation, the search filter, and creating a custom category.
12. Repeat on a narrower browser window and test the mobile navigation drawer.

Automated Java arithmetic tests are in `backend/src/test/java/com/caturza/finance/service/FinanceMathTest.java` and can be run with `mvn test`.
