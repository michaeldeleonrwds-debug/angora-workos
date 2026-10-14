# Module: Data Exports & Reporting

## 1. Overview
The **Data Exports & Reporting** module allows authorized managers to export board data, task metrics, and workload analytics in CSV and JSON formats, with strict protection against CSV formula injection.

---

## 2. Key Controllers & Endpoints
- **`App\Http\Controllers\BoardDataExportController`**:
  - `GET /kanban/boards/{board}/export`: Export tasks as CSV or JSON.
  - `GET /kanban/boards/{board}/workload-analytics/export`: Export resource capacity metrics.
  - `GET /kanban/boards/{board}/delivery-metrics/export`: Export throughput and cycle time metrics.

---

## 3. CSV Formula Injection Security
When exporting user-generated text into CSV files, malicious characters (`=`, `+`, `-`, `@`, `\t`, `\r`) could be interpreted by spreadsheet applications (Microsoft Excel, LibreOffice Calc) as formulas (CSV Injection / Formula Injection).

### Protection Implementation:
`BoardDataExportController` passes every cell value through `sanitizeCsvValue()`:
```php
protected function sanitizeCsvValue(mixed $value): string
{
    $str = (string) $value;
    if (in_array(substr($str, 0, 1), ['=', '+', '-', '@'], true)) {
        return "'" . $str; // Prefix with single quote to force plain text rendering
    }
    return $str;
}
```

---

## 4. Key Cross-References
- Security audit: [[04-RBAC-AND-SECURITY]]
- Feature tests: `WorkOsPhase5ReportsAndExportsTest.php`
