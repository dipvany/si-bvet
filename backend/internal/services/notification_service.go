package services

import (
	"fmt"
	"log"
	"time"

	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"si-bvet/internal/utils"
)

func CreateInAppNotification(userID uint, title, message, notifType string) error {
	notification := models.Notification{
		UserID:  userID,
		Title:   title,
		Message: message,
		Type:    notifType,
		IsRead:  false,
	}

	return repositories.CreateNotification(&notification)
}

func GetMyNotifications(userID uint) ([]models.Notification, error) {
	return repositories.GetNotificationsByUserID(userID)
}

func MarkMyNotificationAsRead(userID, notificationID uint) error {
	return repositories.MarkNotificationAsRead(notificationID, userID, time.Now())
}

func MarkAllMyNotificationsAsRead(userID uint) error {
	return repositories.MarkAllNotificationsAsRead(userID, time.Now())
}

func NotifySubmissionStatusChanged(submissionID uint, status string) {
	submission, err := repositories.GetSubmissionByIDWithUser(submissionID)
	if err != nil {
		log.Printf("failed to load submission for notification (id=%d): %v", submissionID, err)
		return
	}

	title := "Status submission diperbarui"
	message := fmt.Sprintf("Status submission %s sekarang: %s.", submission.NoTicket, mapSubmissionStatus(status))

	if err := CreateInAppNotification(submission.UserID, title, message, "submission_status"); err != nil {
		log.Printf("failed to create submission status notification (submission_id=%d): %v", submissionID, err)
	}
}

func NotifyPaymentSuccess(submissionID uint) {
	submission, err := repositories.GetSubmissionByIDWithUser(submissionID)
	if err != nil {
		log.Printf("failed to load submission for payment notification (id=%d): %v", submissionID, err)
		return
	}

	title := "Pembayaran berhasil diverifikasi"
	message := fmt.Sprintf("Pembayaran untuk submission %s telah diverifikasi dan proses lab dimulai.", submission.NoTicket)

	if err := CreateInAppNotification(submission.UserID, title, message, "payment"); err != nil {
		log.Printf("failed to create payment in-app notification (submission_id=%d): %v", submissionID, err)
	}

	body := fmt.Sprintf("Halo %s,\n\nPembayaran untuk submission %s sudah berhasil diverifikasi.\nTim lab sedang memproses sampel Anda.\n\nTerima kasih.", submission.User.FullName, submission.NoTicket)
	if err := utils.SendEmail(submission.User.Email, "Pembayaran Berhasil - SI-BVET", body); err != nil {
		log.Printf("failed to send payment email (submission_id=%d): %v", submissionID, err)
	}
}

func NotifyLHUAvailable(submissionID uint) {
	submission, err := repositories.GetSubmissionByIDWithUser(submissionID)
	if err != nil {
		log.Printf("failed to load submission for LHU notification (id=%d): %v", submissionID, err)
		return
	}

	title := "LHU tersedia"
	message := fmt.Sprintf("LHU untuk submission %s sudah tersedia dan dapat diunduh.", submission.NoTicket)

	if err := CreateInAppNotification(submission.UserID, title, message, "lhu"); err != nil {
		log.Printf("failed to create LHU in-app notification (submission_id=%d): %v", submissionID, err)
	}

	body := fmt.Sprintf("Halo %s,\n\nLHU untuk submission %s sudah tersedia.\nSilakan login ke aplikasi SI-BVET untuk melihat atau mengunduh dokumen LHU.\n\nTerima kasih.", submission.User.FullName, submission.NoTicket)
	if err := utils.SendEmail(submission.User.Email, "LHU Tersedia - SI-BVET", body); err != nil {
		log.Printf("failed to send LHU email (submission_id=%d): %v", submissionID, err)
	}
}

func SendRegistrationPendingEmail(fullName, email string) {
	body := fmt.Sprintf("Halo %s,\n\nRegistrasi akun pelanggan SI-BVET berhasil diterima.\nAkun Anda saat ini menunggu verifikasi admin.\n\nTerima kasih.", fullName)
	if err := utils.SendEmail(email, "Registrasi Berhasil - Menunggu Verifikasi", body); err != nil {
		log.Printf("failed to send registration pending email to %s: %v", email, err)
	}
}

func SendVerificationApprovedEmail(fullName, email, loginURL string) {
	body := fmt.Sprintf("Halo %s,\n\nAkun SI-BVET Anda telah diverifikasi admin.\nSilakan gunakan tautan login sekali pakai berikut sebelum masa berlakunya habis:\n%s\n\nTerima kasih.", fullName, loginURL)
	if err := utils.SendEmail(email, "Verifikasi Akun Berhasil - SI-BVET", body); err != nil {
		log.Printf("failed to send verification approved email to %s: %v", email, err)
	}
}

func SendVerificationRejectedEmail(fullName, email string) {
	body := fmt.Sprintf("Halo %s,\n\nMohon maaf, verifikasi akun SI-BVET Anda ditolak.\nSilakan lakukan registrasi ulang dengan dokumen yang valid atau hubungi admin.\n\nTerima kasih.", fullName)
	if err := utils.SendEmail(email, "Verifikasi Akun Ditolak - SI-BVET", body); err != nil {
		log.Printf("failed to send verification rejected email to %s: %v", email, err)
	}
}

func mapSubmissionStatus(status string) string {
	switch status {
	case "pending_verification":
		return "Menunggu verifikasi"
	case "awaiting_payment":
		return "Menunggu pembayaran"
	case "awaiting_verification":
		return "Menunggu verifikasi pembayaran"
	case "processed":
		return "Sedang diproses lab"
	case "approved":
		return "Disetujui admin"
	case "rejected":
		return "Ditolak admin"
	case "payment_rejected":
		return "Pembayaran ditolak"
	case "done":
		return "Selesai"
	default:
		return status
	}
}
