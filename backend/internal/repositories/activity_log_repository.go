package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"time"
)

// CreateActivityLog menyimpan sebuah entri log aktivitas ke database.
func CreateActivityLog(log *models.ActivityLog) error {
	result := db.DB.Create(log)
	return result.Error
}

// GetActivityLogsParams mendefinisikan parameter untuk filter dan paginasi.
type GetActivityLogsParams struct {
	Page      int
	PerPage   int
	Actor     string
	Role      string
	StartDate *time.Time
	EndDate   *time.Time
}

// GetActivityLogs mengambil daftar log aktivitas yang dipaginasi dan difilter.
func GetActivityLogs(params GetActivityLogsParams) ([]models.ActivityLog, int64, error) {
	var logs []models.ActivityLog
	var total int64

	query := db.DB.Model(&models.ActivityLog{})

	// Terapkan filter
	if params.Actor != "" {
		query = query.Where("actor ILIKE ?", "%"+params.Actor+"%")
	}
	if params.Role != "" {
		query = query.Where("role = ?", params.Role)
	}
	if params.StartDate != nil {
		query = query.Where("timestamp >= ?", *params.StartDate)
	}
	if params.EndDate != nil {
		query = query.Where("timestamp <= ?", *params.EndDate)
	}

	// Hitung total catatan untuk paginasi
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Terapkan paginasi dan pengurutan
	offset := (params.Page - 1) * params.PerPage
	err := query.Order("timestamp desc").Offset(offset).Limit(params.PerPage).Find(&logs).Error

	return logs, total, err
}