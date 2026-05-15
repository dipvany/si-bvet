package services

import (
	"fmt"
	"io"
	"strconv"
	"strings"
	"unicode"

	"si-bvet/internal/db"
	"si-bvet/internal/models"

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

	rows, err := file.GetRows(sheets[0])
	if err != nil {
		return 0, err
	}
	if len(rows) < 2 {
		return 0, nil
	}

	columns := resolveTestServiceColumns(rows[0])
	if columns.testName < 0 {
		return 0, fmt.Errorf("test name column is required")
	}

	createdCount := 0
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		for rowIndex, row := range rows[1:] {
			if isEmptyRow(row) {
				continue
			}

			service, err := buildTestServiceFromRow(row, columns)
			if err != nil {
				return fmt.Errorf("row %d: %w", rowIndex+2, err)
			}

			if err := tx.Create(&service).Error; err != nil {
				return fmt.Errorf("row %d: %w", rowIndex+2, err)
			}
			createdCount++
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
		case "testname", "namapengujian", "namatest", "layananpengujian", "jenispengujian":
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
		case "resulttype", "jenishasil", "hasil":
			if columns.resultType < 0 {
				columns.resultType = index
			}
		case "testreference", "referensiuji", "referensi", "rujukan":
			if columns.testReference < 0 {
				columns.testReference = index
			}
		case "price", "harga", "tarif", "biaya":
			if columns.price < 0 {
				columns.price = index
			}
		case "duration", "durasi", "lama", "waktupengerjaan":
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
	cleaned := strings.TrimSpace(value)
	if cleaned == "" {
		return 0, nil
	}

	cleaned = strings.ReplaceAll(cleaned, " ", "")
	if strings.Contains(cleaned, ",") && !strings.Contains(cleaned, ".") {
		cleaned = strings.ReplaceAll(cleaned, ",", ".")
	} else {
		cleaned = strings.ReplaceAll(cleaned, ",", "")
	}

	return strconv.ParseFloat(cleaned, 64)
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