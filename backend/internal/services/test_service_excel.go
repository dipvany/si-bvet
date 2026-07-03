package services

import (
	"fmt"
	"io"
	"strconv"
	"strings"
	"unicode"

	"si-bvet/internal/models"
	"si-bvet/internal/repositories"

	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type testServiceExcelColumns struct {
    testName      int
    unitLab       int
    target        int
    method        int
    resultType    int
    testReference int
    price         int
    duration      int
    description   int
}

func ImportTestServicesFromExcel(reader io.Reader) (int, error) {
    file, err := excelize.OpenReader(reader)
    if err != nil {
        return 0, err
    }
    defer func() {
        _ = file.Close()
    }()

    sheets := file.GetSheetList()
    if len(sheets) == 0 {
        return 0, fmt.Errorf("excel file does not contain any sheets")
    }

    createdCount := 0
    err = repositories.InTransaction(func(tx *gorm.DB) error {
        for _, sheet := range sheets {
            rows, err := file.GetRows(sheet)
            if err != nil {
                return fmt.Errorf("failed to read sheet %s: %w", sheet, err)
            }
            if len(rows) < 2 {
                continue
            }

            headerRowIndex := -1
            for i, row := range rows {
                if !isEmptyRow(row) {
                    headerRowIndex = i
                    break
                }
            }

            if headerRowIndex < 0 || headerRowIndex >= len(rows)-1 {
                continue
            }

            columns := resolveTestServiceColumns(rows[headerRowIndex])
            if columns.testName < 0 {
                return fmt.Errorf("sheet %s: test name column is required", sheet)
            }

            for rowIndex := headerRowIndex + 1; rowIndex < len(rows); rowIndex++ {
                row := rows[rowIndex]
                if isEmptyRow(row) {
                    continue
                }

                service, err := buildTestServiceFromRow(row, columns)
                if err != nil {
                    return fmt.Errorf("sheet %s row %d: %w", sheet, rowIndex+1, err)
                }

                if err := repositories.CreateTestServiceTx(tx, &service); err != nil {
                    return fmt.Errorf("sheet %s row %d: %w", sheet, rowIndex+1, err)
                }
                createdCount++
            }
        }

        return nil
    })
    if err != nil {
        return 0, err
    }

    return createdCount, nil
}

func buildTestServiceFromRow(row []string, columns testServiceExcelColumns) (models.TestService, error) {
    testName := strings.TrimSpace(cellValue(row, columns.testName))
    if testName == "" {
        return models.TestService{}, fmt.Errorf("test name is required")
    }

    price, err := parseExcelFloat(cellValue(row, columns.price))
    if err != nil {
        return models.TestService{}, fmt.Errorf("invalid price: %w", err)
    }

    return models.TestService{
        TestName:      testName,
        UnitLab:       strings.TrimSpace(cellValue(row, columns.unitLab)),
        Target:        strings.TrimSpace(cellValue(row, columns.target)),
        Method:        strings.TrimSpace(cellValue(row, columns.method)),
        ResultType:    strings.TrimSpace(cellValue(row, columns.resultType)),
        TestReference: strings.TrimSpace(cellValue(row, columns.testReference)),
        Price:         price,
        Duration:      strings.TrimSpace(cellValue(row, columns.duration)),
        Description:   strings.TrimSpace(cellValue(row, columns.description)),
    }, nil
}

func resolveTestServiceColumns(headers []string) testServiceExcelColumns {
    columns := testServiceExcelColumns{
        testName:      -1,
        unitLab:       -1,
        target:        -1,
        method:        -1,
        resultType:    -1,
        testReference: -1,
        price:         -1,
        duration:      -1,
        description:   -1,
    }

    for index, header := range headers {
        switch normalizeExcelHeader(header) {
        case "testname", "namapengujian", "namatest", "layananpengujian", "jenispengujian", "namauji":
            if columns.testName < 0 {
                columns.testName = index
            }
        case "unitlab", "laboratorium", "unitlaboratorium":
            if columns.unitLab < 0 {
                columns.unitLab = index
            }
        case "target":
            if columns.target < 0 {
                columns.target = index
            }
        case "method", "metode":
            if columns.method < 0 {
                columns.method = index
            }
        case "resulttype", "jenishasil", "hasil", "tipehasil":
            if columns.resultType < 0 {
                columns.resultType = index
            }
        case "testreference", "referensiuji", "referensi", "rujukan", "acuanpengujian":
            if columns.testReference < 0 {
                columns.testReference = index
            }
        case "price", "harga", "tarif", "biaya", "hargaujirp":
            if columns.price < 0 {
                columns.price = index
            }
        case "duration", "durasi", "lama", "waktupengerjaan", "durasiujihari":
            if columns.duration < 0 {
                columns.duration = index
            }
        case "description", "deskripsi", "keterangan":
            if columns.description < 0 {
                columns.description = index
            }
        }
    }

    return columns
}

func cellValue(row []string, index int) string {
    if index < 0 || index >= len(row) {
        return ""
    }
    return row[index]
}

func isEmptyRow(row []string) bool {
    for _, cell := range row {
        if strings.TrimSpace(cell) != "" {
            return false
        }
    }
    return true
}

func parseExcelFloat(value string) (float64, error) {
    s := strings.TrimSpace(value)
    if s == "" {
        return 0, nil
    }

    s = strings.ReplaceAll(s, " ", "")

    var b strings.Builder
    for _, r := range s {
        if (r >= '0' && r <= '9') || r == '.' || r == ',' || r == '-' || r == '+' {
            b.WriteRune(r)
        }
    }
    cleaned := b.String()
    if cleaned == "" {
        return 0, nil
    }

    hasDot := strings.Contains(cleaned, ".")
    hasComma := strings.Contains(cleaned, ",")

    switch {
    case hasDot && hasComma:
        lastDot := strings.LastIndex(cleaned, ".")
        lastComma := strings.LastIndex(cleaned, ",")
        if lastComma > lastDot {
            cleaned = strings.ReplaceAll(cleaned, ".", "")
            cleaned = strings.ReplaceAll(cleaned, ",", ".")
        } else {
            cleaned = strings.ReplaceAll(cleaned, ",", "")
        }
    case hasComma && !hasDot:
        parts := strings.Split(cleaned, ",")
        if len(parts) > 1 && allGroupsHaveLength(parts[1:], 3) {
            cleaned = strings.ReplaceAll(cleaned, ",", "")
        } else {
            cleaned = strings.ReplaceAll(cleaned, ",", ".")
        }
    case hasDot && !hasComma:
        lastDot := strings.LastIndex(cleaned, ".")
        if len(cleaned)-lastDot-1 == 3 && lastDot > 0 {
            cleaned = strings.ReplaceAll(cleaned, ".", "")
        }
    }

    return strconv.ParseFloat(cleaned, 64)
}

func allGroupsHaveLength(groups []string, expected int) bool {
    if len(groups) == 0 {
        return false
    }

    for _, group := range groups {
        if len(group) != expected {
            return false
        }
    }

    return true
}

func normalizeExcelHeader(value string) string {
    value = strings.ToLower(strings.TrimSpace(value))
    var builder strings.Builder
    builder.Grow(len(value))

    for _, r := range value {
        if unicode.IsLetter(r) || unicode.IsDigit(r) {
            builder.WriteRune(r)
        }
    }

    return builder.String()
}