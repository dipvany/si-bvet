package services

import (
	"fmt"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"

	"github.com/glebarez/sqlite"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"gorm.io/gorm"
)

var _ = ginkgo.Describe("Complaint Service", func() {
	var gdb *gorm.DB

	ginkgo.BeforeEach(func() {
		dsn := fmt.Sprintf("file:complaint_%d?mode=memory&cache=shared", time.Now().UnixNano())
		var err error
		gdb, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		db.DB = gdb

		// Migrate models
		err = db.DB.AutoMigrate(
			&models.User{},
			&models.Complaint{},
		)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
	})

	ginkgo.Describe("CreateComplaint", func() {
		ginkgo.It("should create complaint with valid data and file path", func() {
			userID := uint(1)
			req := dto.ComplaintRequest{
				Subjects:    "Poor service",
				Description: "The service quality is bad",
			}
			filePath := "internal/uploads/complaints/file.pdf"

			err := CreateComplaint(userID, req, filePath)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify in DB
			var complaint models.Complaint
			err = db.DB.First(&complaint, "user_id = ?", userID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaint.UserID).To(gomega.Equal(userID))
			gomega.Expect(complaint.Subjects).To(gomega.Equal("Poor service"))
			gomega.Expect(complaint.Description).To(gomega.Equal("The service quality is bad"))
			gomega.Expect(complaint.AttachmentPath).To(gomega.Equal(filePath))
			gomega.Expect(complaint.Status).To(gomega.Equal("open"))
		})

		ginkgo.It("should create complaint without file path", func() {
			userID := uint(1)
			req := dto.ComplaintRequest{
				Subjects:    "Issue",
				Description: "Something is wrong",
			}
			filePath := ""

			err := CreateComplaint(userID, req, filePath)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var complaint models.Complaint
			err = db.DB.First(&complaint, "user_id = ?", userID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaint.AttachmentPath).To(gomega.Equal(""))
		})

		ginkgo.It("should set status to open by default", func() {
			userID := uint(1)
			req := dto.ComplaintRequest{
				Subjects:    "Test",
				Description: "Test description",
			}

			err := CreateComplaint(userID, req, "")

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var complaint models.Complaint
			err = db.DB.First(&complaint, "user_id = ?", userID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaint.Status).To(gomega.Equal("open"))
		})

		ginkgo.It("should set created_at timestamp", func() {
			userID := uint(1)
			req := dto.ComplaintRequest{
				Subjects:    "Test",
				Description: "Test description",
			}

			beforeCreate := time.Now()
			err := CreateComplaint(userID, req, "")
			afterCreate := time.Now()

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var complaint models.Complaint
			err = db.DB.First(&complaint, "user_id = ?", userID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaint.CreatedAt).NotTo(gomega.BeNil())
			gomega.Expect(complaint.CreatedAt.After(beforeCreate.Add(-time.Second))).To(gomega.BeTrue())
			gomega.Expect(complaint.CreatedAt.Before(afterCreate.Add(time.Second))).To(gomega.BeTrue())
		})
	})

	ginkgo.Describe("GetAllComplaints", func() {
		ginkgo.It("should return empty list when no complaints exist", func() {
			complaints, err := GetAllComplaints()

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints).To(gomega.BeEmpty())
		})

		ginkgo.It("should return all complaints sorted by desc id", func() {
			now := time.Now()

			for i := 1; i <= 3; i++ {
				complaint := &models.Complaint{
					UserID:      uint(i),
					Subjects:    fmt.Sprintf("Subject %d", i),
					Description: fmt.Sprintf("Description %d", i),
					Status:      "open",
					CreatedAt:   &now,
				}
				err := db.DB.Create(complaint).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
				time.Sleep(1 * time.Millisecond)
			}

			complaints, err := GetAllComplaints()

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints).To(gomega.HaveLen(3))
			// Should be ordered by desc id
			gomega.Expect(complaints[0].UserID).To(gomega.Equal(uint(3)))
			gomega.Expect(complaints[1].UserID).To(gomega.Equal(uint(2)))
			gomega.Expect(complaints[2].UserID).To(gomega.Equal(uint(1)))
		})

		ginkgo.It("should return complaints from multiple users", func() {
			now := time.Now()

			complaint1 := &models.Complaint{
				UserID:      1,
				Subjects:    "Issue 1",
				Description: "Description 1",
				Status:      "open",
				CreatedAt:   &now,
			}
			err := db.DB.Create(complaint1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			complaint2 := &models.Complaint{
				UserID:      2,
				Subjects:    "Issue 2",
				Description: "Description 2",
				Status:      "responded",
				CreatedAt:   &now,
			}
			err = db.DB.Create(complaint2).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			complaints, err := GetAllComplaints()

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints).To(gomega.HaveLen(2))
		})
	})

	ginkgo.Describe("UpdateComplaintResponse", func() {
		ginkgo.It("should update complaint response and mark as responded", func() {
			now := time.Now()

			complaint := &models.Complaint{
				UserID:      1,
				Subjects:    "Issue",
				Description: "Description",
				Status:      "open",
				CreatedAt:   &now,
			}
			err := db.DB.Create(complaint).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = UpdateComplaintResponse(complaint.ID, "We have resolved your issue")

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify in DB
			var updated models.Complaint
			err = db.DB.First(&updated, complaint.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updated.AdminResponse).To(gomega.Equal("We have resolved your issue"))
			gomega.Expect(updated.Status).To(gomega.Equal("responded"))
		})

		ginkgo.It("should return error when complaint not found", func() {
			err := UpdateComplaintResponse(99999, "Response")

			gomega.Expect(err).To(gomega.HaveOccurred())
		})

		ginkgo.It("should overwrite previous response", func() {
			now := time.Now()

			complaint := &models.Complaint{
				UserID:         1,
				Subjects:       "Issue",
				Description:    "Description",
				Status:         "responded",
				AdminResponse:  "Old response",
				CreatedAt:      &now,
			}
			err := db.DB.Create(complaint).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = UpdateComplaintResponse(complaint.ID, "New response")

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var updated models.Complaint
			err = db.DB.First(&updated, complaint.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updated.AdminResponse).To(gomega.Equal("New response"))
		})

		ginkgo.It("should handle long response text", func() {
			now := time.Now()

			complaint := &models.Complaint{
				UserID:      1,
				Subjects:    "Issue",
				Description: "Description",
				Status:      "open",
				CreatedAt:   &now,
			}
			err := db.DB.Create(complaint).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			longResponse := fmt.Sprintf("%0*d", 1000, 0) // 1000 char response

			err = UpdateComplaintResponse(complaint.ID, longResponse)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var updated models.Complaint
			err = db.DB.First(&updated, complaint.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updated.AdminResponse).To(gomega.HaveLen(1000))
		})
	})

	ginkgo.Describe("GetComplaintsByUserID", func() {
		ginkgo.It("should return empty list when user has no complaints", func() {
			userID := uint(1)

			complaints, err := GetComplaintsByUserID(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints).To(gomega.BeEmpty())
		})

		ginkgo.It("should return complaints for specific user", func() {
			now := time.Now()

			complaint := &models.Complaint{
				UserID:      1,
				Subjects:    "Issue",
				Description: "Description",
				Status:      "open",
				CreatedAt:   &now,
			}
			err := db.DB.Create(complaint).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			complaints, err := GetComplaintsByUserID(1)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints).To(gomega.HaveLen(1))
			gomega.Expect(complaints[0].UserID).To(gomega.Equal(uint(1)))
		})

		ginkgo.It("should not return complaints from other users", func() {
			now := time.Now()

			complaint1 := &models.Complaint{
				UserID:      1,
				Subjects:    "Issue 1",
				Description: "Description 1",
				Status:      "open",
				CreatedAt:   &now,
			}
			err := db.DB.Create(complaint1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			complaint2 := &models.Complaint{
				UserID:      2,
				Subjects:    "Issue 2",
				Description: "Description 2",
				Status:      "open",
				CreatedAt:   &now,
			}
			err = db.DB.Create(complaint2).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			complaints, err := GetComplaintsByUserID(1)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints).To(gomega.HaveLen(1))
			gomega.Expect(complaints[0].UserID).To(gomega.Equal(uint(1)))
		})

		ginkgo.It("should return multiple complaints for same user sorted by desc id", func() {
			now := time.Now()

			for i := 1; i <= 3; i++ {
				complaint := &models.Complaint{
					UserID:      1,
					Subjects:    fmt.Sprintf("Issue %d", i),
					Description: fmt.Sprintf("Description %d", i),
					Status:      "open",
					CreatedAt:   &now,
				}
				err := db.DB.Create(complaint).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
				time.Sleep(1 * time.Millisecond)
			}

			complaints, err := GetComplaintsByUserID(1)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints).To(gomega.HaveLen(3))
			// Should be ordered by desc id
			gomega.Expect(complaints[0].Subjects).To(gomega.Equal("Issue 3"))
			gomega.Expect(complaints[1].Subjects).To(gomega.Equal("Issue 2"))
			gomega.Expect(complaints[2].Subjects).To(gomega.Equal("Issue 1"))
		})

		ginkgo.It("should return complaints with different statuses", func() {
			now := time.Now()

			complaint1 := &models.Complaint{
				UserID:      1,
				Subjects:    "Open issue",
				Description: "Description",
				Status:      "open",
				CreatedAt:   &now,
			}
			err := db.DB.Create(complaint1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			complaint2 := &models.Complaint{
				UserID:      1,
				Subjects:    "Responded issue",
				Description: "Description",
				Status:      "responded",
				CreatedAt:   &now,
			}
			err = db.DB.Create(complaint2).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			complaints, err := GetComplaintsByUserID(1)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints).To(gomega.HaveLen(2))
		})
	})

	ginkgo.Describe("Complaint Service Integration", func() {
		ginkgo.It("should support full complaint workflow: create → respond → retrieve", func() {
			userID := uint(1)

			// Create complaint
			req := dto.ComplaintRequest{
				Subjects:    "Service issue",
				Description: "Poor quality",
			}
			err := CreateComplaint(userID, req, "internal/uploads/complaints/doc.pdf")
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify created
			complaints, err := GetComplaintsByUserID(userID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints).To(gomega.HaveLen(1))
			gomega.Expect(complaints[0].Status).To(gomega.Equal("open"))

			// Admin responds
			complaintID := complaints[0].ID
			err = UpdateComplaintResponse(complaintID, "Thank you for reporting")
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify responded
			complaints, err = GetComplaintsByUserID(userID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints[0].Status).To(gomega.Equal("responded"))
			gomega.Expect(complaints[0].AdminResponse).To(gomega.Equal("Thank you for reporting"))
		})
	})
})
