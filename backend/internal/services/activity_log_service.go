package services

import (
	"fmt"
	"log"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"strings"
	"time"
)

const activityLogPrefix = "[SYSTEM LOG]"

// LogActivity memformat dan mencetak log aktivitas generik ke konsol.
// Sekarang juga menyimpannya ke database.
func LogActivity(actor, role, message string, actorID *uint, ipAddress, method, endpoint string) {
	// Membersihkan newline dan spasi berlebih untuk menjaga format satu baris
	cleanMessage := strings.ReplaceAll(strings.TrimSpace(message), "\n", " ")

	// 1. Cetak ke konsol (perilaku lama tetap dipertahankan)
	log.Printf("%s %s (%s) — %s", activityLogPrefix, strings.ToUpper(actor), strings.ToLower(role), cleanMessage)

	// 2. Simpan ke database
	activityLog := &models.ActivityLog{
		Timestamp: time.Now(),
		Actor:     actor,
		ActorID:   actorID,
		Role:      role,
		Activity:  cleanMessage,
		IPAddress: ipAddress,
		Method:    method,
		Endpoint:  endpoint,
	}

	if err := repositories.CreateActivityLog(activityLog); err != nil {
		log.Printf("[ERROR] Failed to save activity log to database: %v", err)
	}
}

// LogSystemActivity mencatat tindakan yang dilakukan oleh sistem.
func LogSystemActivity(message string) {
	LogActivity("SYSTEM", "system", message, nil, "127.0.0.1", "INTERNAL", "/internal/system")
}

// LogUserActivity mencatat tindakan yang dilakukan oleh pengguna tertentu.
// Parameter ipAddress dan endpoint ditambahkan untuk data yang lebih kaya.
func LogUserActivity(user *models.User, message, ipAddress, method, endpoint string) {
	actor := "ANONYMOUS"
	var actorID *uint

	if user != nil && user.FullName != "" {
		actor = user.FullName
		actorID = &user.ID
	} else if user != nil {
		actor = user.Email
		actorID = &user.ID
	}
	LogActivity(actor, user.Role, message, actorID, ipAddress, method, endpoint)
}

// ActivityLogServiceInterface mendefinisikan kontrak untuk service log aktivitas.
type ActivityLogServiceInterface interface {
	GetActivityLogs(params repositories.GetActivityLogsParams) (map[string]interface{}, error)
}

// activityLogService adalah implementasi default dari ActivityLogServiceInterface.
type activityLogService struct{}

// NewActivityLogService membuat instance baru dari activityLogService.
func NewActivityLogService() ActivityLogServiceInterface {
	return &activityLogService{}
}

func (s *activityLogService) GetActivityLogs(params repositories.GetActivityLogsParams) (map[string]interface{}, error) {
	logs, total, err := repositories.GetActivityLogs(params)
	if err != nil {
		return nil, fmt.Errorf("failed to get activity logs: %w", err)
	}

	return map[string]interface{}{
		"data": logs,
		"meta": NewPaginationMeta(total, params.Page, params.PerPage),
	}, nil
}

// PaginationMeta menyimpan informasi paginasi.
type PaginationMeta struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	Total      int64 `json:"total"`
	TotalPages int64 `json:"total_pages"`
}

// NewPaginationMeta membuat objek metadata paginasi.
func NewPaginationMeta(total int64, page, perPage int) PaginationMeta {
	totalPages := int64(0)
	if perPage > 0 {
		totalPages = (total + int64(perPage) - 1) / int64(perPage)
	}
	return PaginationMeta{Page: page, PerPage: perPage, Total: total, TotalPages: totalPages}
}