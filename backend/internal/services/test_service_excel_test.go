package services_test

import (
	"bytes"
	"fmt"
	"math"
	"testing"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/glebarez/sqlite"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

func setupTestServiceExcelDB(t *testing.T) {
	t.Helper()

	dsn := fmt.Sprintf("file:test_service_excel_%d?mode=memory&cache=shared", time.Now().UnixNano())
	gdb, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	db.DB = gdb

	if err := db.DB.AutoMigrate(&models.TestService{}); err != nil {
		t.Fatalf("auto migrate test service: %v", err)
	}
}

func writeWorkbook(t *testing.T, configure func(file *excelize.File)) []byte {
	t.Helper()

	file := excelize.NewFile()
	configure(file)

	buffer := &bytes.Buffer{}
	if err := file.Write(buffer); err != nil {
		t.Fatalf("write workbook: %v", err)
	}

	return buffer.Bytes()
}

func TestImportTestServicesFromExcel(t *testing.T) {
	t.Run("imports aliases and skips leading blank rows", func(t *testing.T) {
		setupTestServiceExcelDB(t)

		payload := writeWorkbook(t, func(file *excelize.File) {
			sheet := file.GetSheetName(file.GetActiveSheetIndex())

			headers := []string{"", "", "Nama Uji", "Unit Laboratorium", "Target", "Metode", "Tipe Hasil", "Acuan Pengujian", "Harga Uji (Rp)", "Durasi Uji (Hari)", "Deskripsi"}
			for index, header := range headers {
				cell, _ := excelize.CoordinatesToCellName(index+1, 3)
				file.SetCellValue(sheet, cell, header)
			}

			values := []interface{}{"", "", "PCR SARS-CoV-2", "Molecular Lab", "Respiratory", "RT-PCR", "Qualitative", "WHO-2026", "Rp 1.250.000,50", "2 hari", "Screening test"}
			for index, value := range values {
				cell, _ := excelize.CoordinatesToCellName(index+1, 4)
				file.SetCellValue(sheet, cell, value)
			}
		})

		created, err := services.ImportTestServicesFromExcel(bytes.NewReader(payload))
		if err != nil {
			t.Fatalf("import workbook: %v", err)
		}
		if created != 1 {
			t.Fatalf("expected 1 created test service, got %d", created)
		}

		var createdService models.TestService
		if err := db.DB.First(&createdService).Error; err != nil {
			t.Fatalf("query created service: %v", err)
		}

		if createdService.TestName != "PCR SARS-CoV-2" {
			t.Fatalf("unexpected test name: %s", createdService.TestName)
		}
		if createdService.UnitLab != "Molecular Lab" {
			t.Fatalf("unexpected unit lab: %s", createdService.UnitLab)
		}
		if createdService.Method != "RT-PCR" {
			t.Fatalf("unexpected method: %s", createdService.Method)
		}
		if createdService.ResultType != "Qualitative" {
			t.Fatalf("unexpected result type: %s", createdService.ResultType)
		}
		if createdService.TestReference != "WHO-2026" {
			t.Fatalf("unexpected test reference: %s", createdService.TestReference)
		}
		if createdService.Duration != "2 hari" {
			t.Fatalf("unexpected duration: %s", createdService.Duration)
		}
		if createdService.Description != "Screening test" {
			t.Fatalf("unexpected description: %s", createdService.Description)
		}
		if math.Abs(createdService.Price-1250000.50) > 0.001 {
			t.Fatalf("unexpected price: %v", createdService.Price)
		}
	})

	t.Run("rejects workbook without test name column", func(t *testing.T) {
		setupTestServiceExcelDB(t)

		payload := writeWorkbook(t, func(file *excelize.File) {
			sheet := file.GetSheetName(file.GetActiveSheetIndex())
			file.SetCellValue(sheet, "A1", "Price")
			file.SetCellValue(sheet, "A2", 1000)
		})

		created, err := services.ImportTestServicesFromExcel(bytes.NewReader(payload))
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if created != 0 {
			t.Fatalf("expected 0 created test services, got %d", created)
		}
	})
}