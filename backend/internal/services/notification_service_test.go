package services

import (
	"fmt"
	"testing"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"github.com/glebarez/sqlite"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"gorm.io/gorm"
)

func TestNotificationService(t *testing.T) {
	gomega.RegisterFailHandler(ginkgo.Fail)
	ginkgo.RunSpecs(t, "Notification Service Suite")
}

var _ = ginkgo.Describe("Notification Service", func() {
	var gdb *gorm.DB

	ginkgo.BeforeEach(func() {
		dsn := fmt.Sprintf("file:notification_%d?mode=memory&cache=shared", time.Now().UnixNano())
		var err error
		gdb, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		db.DB = gdb

		// Migrate models
		err = db.DB.AutoMigrate(
			&models.User{},
			&models.Notification{},
		)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
	})

	ginkgo.Describe("GetMyNotifications", func() {
		ginkgo.It("should return empty list when user has no notifications", func() {
			userID := uint(1)

			notifications, err := GetMyNotifications(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(notifications).To(gomega.BeEmpty())
		})

		ginkgo.It("should return single notification", func() {
			userID := uint(1)
			now := time.Now()

			notification := &models.Notification{
				UserID:    userID,
				Title:     "Test Notification",
				Message:   "This is a test",
				Type:      "submission_status",
				IsRead:    false,
				CreatedAt: &now,
			}
			err := db.DB.Create(notification).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			notifications, err := GetMyNotifications(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(notifications).To(gomega.HaveLen(1))
			gomega.Expect(notifications[0].Title).To(gomega.Equal("Test Notification"))
			gomega.Expect(notifications[0].IsRead).To(gomega.BeFalse())
		})

		ginkgo.It("should return multiple notifications sorted by desc id", func() {
			userID := uint(1)
			now := time.Now()

			// Create notifications
			for i := 1; i <= 3; i++ {
				notification := &models.Notification{
					UserID:    userID,
					Title:     fmt.Sprintf("Notification %d", i),
					Message:   fmt.Sprintf("Message %d", i),
					Type:      "submission_status",
					IsRead:    false,
					CreatedAt: &now,
				}
				err := db.DB.Create(notification).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
				time.Sleep(1 * time.Millisecond) // Ensure different timestamps
			}

			notifications, err := GetMyNotifications(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(notifications).To(gomega.HaveLen(3))
			// Should be ordered by desc id (latest first)
			gomega.Expect(notifications[0].Title).To(gomega.Equal("Notification 3"))
			gomega.Expect(notifications[1].Title).To(gomega.Equal("Notification 2"))
			gomega.Expect(notifications[2].Title).To(gomega.Equal("Notification 1"))
		})

		ginkgo.It("should only return notifications for specific user", func() {
			user1ID := uint(1)
			user2ID := uint(2)
			now := time.Now()

			// Create notification for user 1
			notif1 := &models.Notification{
				UserID:    user1ID,
				Title:     "User 1 Notification",
				Message:   "Message for user 1",
				Type:      "submission_status",
				IsRead:    false,
				CreatedAt: &now,
			}
			err := db.DB.Create(notif1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create notification for user 2
			notif2 := &models.Notification{
				UserID:    user2ID,
				Title:     "User 2 Notification",
				Message:   "Message for user 2",
				Type:      "payment",
				IsRead:    false,
				CreatedAt: &now,
			}
			err = db.DB.Create(notif2).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			notifications, err := GetMyNotifications(user1ID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(notifications).To(gomega.HaveLen(1))
			gomega.Expect(notifications[0].Title).To(gomega.Equal("User 1 Notification"))
		})

		ginkgo.It("should include both read and unread notifications", func() {
			userID := uint(1)
			now := time.Now()

			// Create unread notification
			unread := &models.Notification{
				UserID:    userID,
				Title:     "Unread",
				Message:   "Unread message",
				Type:      "submission_status",
				IsRead:    false,
				CreatedAt: &now,
			}
			err := db.DB.Create(unread).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create read notification
			readNotif := &models.Notification{
				UserID:    userID,
				Title:     "Read",
				Message:   "Read message",
				Type:      "payment",
				IsRead:    true,
				ReadAt:    &now,
				CreatedAt: &now,
			}
			err = db.DB.Create(readNotif).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			notifications, err := GetMyNotifications(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(notifications).To(gomega.HaveLen(2))
		})
	})

	ginkgo.Describe("MarkMyNotificationAsRead", func() {
		ginkgo.It("should mark single notification as read", func() {
			userID := uint(1)
			now := time.Now()

			notification := &models.Notification{
				UserID:    userID,
				Title:     "Test",
				Message:   "Test message",
				Type:      "submission_status",
				IsRead:    false,
				CreatedAt: &now,
			}
			err := db.DB.Create(notification).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = MarkMyNotificationAsRead(userID, notification.ID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify in DB
			var updated models.Notification
			err = db.DB.First(&updated, notification.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updated.IsRead).To(gomega.BeTrue())
			gomega.Expect(updated.ReadAt).NotTo(gomega.BeNil())
		})

		ginkgo.It("should not mark notification if user id doesn't match", func() {
			userID := uint(1)
			wrongUserID := uint(2)
			now := time.Now()

			notification := &models.Notification{
				UserID:    userID,
				Title:     "Test",
				Message:   "Test message",
				Type:      "submission_status",
				IsRead:    false,
				CreatedAt: &now,
			}
			err := db.DB.Create(notification).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = MarkMyNotificationAsRead(wrongUserID, notification.ID)

			// Should return error because user doesn't match
			gomega.Expect(err).To(gomega.HaveOccurred())

			// Verify NOT marked as read
			var updated models.Notification
			err = db.DB.First(&updated, notification.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updated.IsRead).To(gomega.BeFalse())
		})

		ginkgo.It("should return error for non-existent notification", func() {
			userID := uint(1)
			fakeNotifID := uint(99999)

			err := MarkMyNotificationAsRead(userID, fakeNotifID)

			// Should return error because notification doesn't exist
			gomega.Expect(err).To(gomega.HaveOccurred())
		})

		ginkgo.It("should be idempotent when marking already-read notification", func() {
			userID := uint(1)
			now := time.Now()

			notification := &models.Notification{
				UserID:    userID,
				Title:     "Test",
				Message:   "Test message",
				Type:      "submission_status",
				IsRead:    true,
				ReadAt:    &now,
				CreatedAt: &now,
			}
			err := db.DB.Create(notification).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = MarkMyNotificationAsRead(userID, notification.ID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify still read
			var updated models.Notification
			err = db.DB.First(&updated, notification.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updated.IsRead).To(gomega.BeTrue())
		})
	})

	ginkgo.Describe("MarkAllMyNotificationsAsRead", func() {
		ginkgo.It("should mark all unread notifications as read", func() {
			userID := uint(1)
			now := time.Now()

			// Create 3 unread notifications
			for i := 1; i <= 3; i++ {
				notification := &models.Notification{
					UserID:    userID,
					Title:     fmt.Sprintf("Notification %d", i),
					Message:   fmt.Sprintf("Message %d", i),
					Type:      "submission_status",
					IsRead:    false,
					CreatedAt: &now,
				}
				err := db.DB.Create(notification).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
			}

			err := MarkAllMyNotificationsAsRead(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify all marked as read
			var notifications []models.Notification
			err = db.DB.Where("user_id = ?", userID).Find(&notifications).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(notifications).To(gomega.HaveLen(3))
			for _, notif := range notifications {
				gomega.Expect(notif.IsRead).To(gomega.BeTrue())
				gomega.Expect(notif.ReadAt).NotTo(gomega.BeNil())
			}
		})

		ginkgo.It("should not affect already-read notifications", func() {
			userID := uint(1)
			now := time.Now()

			// Create 1 unread and 1 read notification
			unread := &models.Notification{
				UserID:    userID,
				Title:     "Unread",
				Message:   "Unread message",
				Type:      "submission_status",
				IsRead:    false,
				CreatedAt: &now,
			}
			err := db.DB.Create(unread).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			read := &models.Notification{
				UserID:    userID,
				Title:     "Read",
				Message:   "Read message",
				Type:      "payment",
				IsRead:    true,
				ReadAt:    &now,
				CreatedAt: &now,
			}
			err = db.DB.Create(read).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = MarkAllMyNotificationsAsRead(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify both are read
			var notifications []models.Notification
			err = db.DB.Where("user_id = ?", userID).Find(&notifications).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(notifications).To(gomega.HaveLen(2))
			for _, notif := range notifications {
				gomega.Expect(notif.IsRead).To(gomega.BeTrue())
			}
		})

		ginkgo.It("should not affect other users notifications", func() {
			user1ID := uint(1)
			user2ID := uint(2)
			now := time.Now()

			// User 1: unread notification
			notif1 := &models.Notification{
				UserID:    user1ID,
				Title:     "User 1 Unread",
				Message:   "Message",
				Type:      "submission_status",
				IsRead:    false,
				CreatedAt: &now,
			}
			err := db.DB.Create(notif1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// User 2: unread notification
			notif2 := &models.Notification{
				UserID:    user2ID,
				Title:     "User 2 Unread",
				Message:   "Message",
				Type:      "payment",
				IsRead:    false,
				CreatedAt: &now,
			}
			err = db.DB.Create(notif2).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = MarkAllMyNotificationsAsRead(user1ID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// User 1 should be read
			var notif1Updated models.Notification
			err = db.DB.First(&notif1Updated, notif1.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(notif1Updated.IsRead).To(gomega.BeTrue())

			// User 2 should still be unread
			var notif2Updated models.Notification
			err = db.DB.First(&notif2Updated, notif2.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(notif2Updated.IsRead).To(gomega.BeFalse())
		})

		ginkgo.It("should succeed when user has no unread notifications", func() {
			userID := uint(1)
			now := time.Now()

			// Create only read notification
			notification := &models.Notification{
				UserID:    userID,
				Title:     "Already Read",
				Message:   "Message",
				Type:      "submission_status",
				IsRead:    true,
				ReadAt:    &now,
				CreatedAt: &now,
			}
			err := db.DB.Create(notification).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = MarkAllMyNotificationsAsRead(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
		})

		ginkgo.It("should succeed when user has no notifications", func() {
			userID := uint(1)
			err := MarkAllMyNotificationsAsRead(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
		})

		ginkgo.It("should update readAt timestamp for all marked notifications", func() {
			userID := uint(1)
			now := time.Now()

			notification := &models.Notification{
				UserID:    userID,
				Title:     "Test",
				Message:   "Message",
				Type:      "submission_status",
				IsRead:    false,
				CreatedAt: &now,
			}
			err := db.DB.Create(notification).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

		err = MarkAllMyNotificationsAsRead(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify readAt is updated
			var updated models.Notification
			err = db.DB.First(&updated, notification.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updated.ReadAt).NotTo(gomega.BeNil())
		})
	})
})
