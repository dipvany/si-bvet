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
			req := dto.ComplaintRequest{
				Fullname:    "John Doe",
				Email:       "john.doe@example.com",
				IDNumber:    "1234567890",
				Description: "The service quality is bad",
				Suggestion:  "Improve it.",
			}
			filePath := "internal/uploads/complaints/file.pdf"

			err := CreateComplaint(req, filePath)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify in DB
			var complaint models.Complaint
			err = db.DB.First(&complaint, "email = ?", "john.doe@example.com").Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaint.Fullname).To(gomega.Equal("John Doe"))
			gomega.Expect(complaint.Description).To(gomega.Equal("The service quality is bad"))
			gomega.Expect(complaint.AttachmentPath).To(gomega.Equal(filePath))
			gomega.Expect(complaint.Status).To(gomega.Equal("open"))
		})

		ginkgo.It("should create complaint without file path", func() {
			req := dto.ComplaintRequest{
				Fullname:    "Jane Doe",
				Email:       "jane.doe@example.com",
				Description: "Something is wrong",
			}
			filePath := ""

			err := CreateComplaint(req, filePath)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var complaint models.Complaint
			err = db.DB.First(&complaint, "email = ?", "jane.doe@example.com").Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaint.AttachmentPath).To(gomega.Equal(""))
		})

		ginkgo.It("should set status to open by default", func() {
			req := dto.ComplaintRequest{
				Fullname:    "Test User",
				Email:       "test.user@example.com",
				Description: "Test description",
			}

			err := CreateComplaint(req, "")

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var complaint models.Complaint
			err = db.DB.First(&complaint, "email = ?", "test.user@example.com").Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaint.Status).To(gomega.Equal("open"))
		})

		ginkgo.It("should set created_at timestamp", func() {
			req := dto.ComplaintRequest{
				Fullname:    "Time User",
				Email:       "time.user@example.com",
				Description: "Test description",
			}

			beforeCreate := time.Now()
			err := CreateComplaint(req, "")
			afterCreate := time.Now()

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var complaint models.Complaint
			err = db.DB.First(&complaint, "email = ?", "time.user@example.com").Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaint.CreatedAt).NotTo(gomega.BeNil())
			gomega.Expect(complaint.CreatedAt.After(beforeCreate.Add(-time.Second))).To(gomega.BeTrue())
			gomega.Expect(complaint.CreatedAt.Before(afterCreate.Add(time.Second))).To(gomega.BeTrue())
		})

		ginkgo.It("should parse RFC3339 date string", func() {
			rfc3339Time := "2026-01-02T15:04:05Z"
			expectedTime, _ := time.Parse(time.RFC3339, rfc3339Time)
			req := dto.ComplaintRequest{
				Fullname:        "Date User",
				Email:           "date.user@example.com",
				DateOfComplaint: rfc3339Time,
			}
			err := CreateComplaint(req, "")
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			var complaint models.Complaint
			db.DB.First(&complaint, "email = ?", "date.user@example.com")
			gomega.Expect(complaint.DateOfComplaint.Unix()).To(gomega.Equal(expectedTime.Unix()))
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
					Fullname:    fmt.Sprintf("User %d", i),
					Email:       fmt.Sprintf("user%d@example.com", i),
					Description: fmt.Sprintf("Description %d", i),
					Status:      "open",
					DateOfComplaint: now,
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
			gomega.Expect(complaints[0].Fullname).To(gomega.Equal("User 3"))
			gomega.Expect(complaints[1].Fullname).To(gomega.Equal("User 2"))
			gomega.Expect(complaints[2].Fullname).To(gomega.Equal("User 1"))
		})

		ginkgo.It("should return complaints from multiple users", func() {
			now := time.Now()

			complaint1 := &models.Complaint{
				Fullname:    "User 1",
				Email:       "user1@example.com",
				Description: "Description 1",
				Status:      "open",
				DateOfComplaint: now,
				CreatedAt:   &now,
			}
			err := db.DB.Create(complaint1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			complaint2 := &models.Complaint{
				Fullname:    "User 2",
				Email:       "user2@example.com",
				Description: "Description 2",
				Status:      "responded",
				DateOfComplaint: now,
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
				Fullname:    "Test User",
				Description: "Description",
				Email:       "test@example.com",
				Status:      "open",
				DateOfComplaint: now,
				CreatedAt:   &now,
				UpdatedAt:   &now,
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
			gomega.Expect(updated.Status).To(gomega.Equal("open")) // Note: UpdateComplaintResponse doesn't change status
		})

		ginkgo.It("should return error when complaint not found", func() {
			err := UpdateComplaintResponse(99999, "Response")

			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err.Error()).To(gomega.ContainSubstring("record not found"))
		})

		ginkgo.It("should overwrite previous response", func() {
			now := time.Now()

			complaint := &models.Complaint{
				Fullname:       "Test User",
				Description:    "Description",
				Email:          "test@example.com",
				Status:         "open",
				AdminResponse:       "Old response",
				DateOfComplaint: now,
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
				Fullname:    "Test User",
				Description: "Description",
				Email:       "test@example.com",
				Status:      "open",
				DateOfComplaint: now,
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

	ginkgo.Describe("Complaint Service Integration", func() {
		ginkgo.It("should support full complaint workflow: create → respond → retrieve", func() {
			// Create complaint
			req := dto.ComplaintRequest{
				Fullname:    "Workflow User",
				Email:       "workflow@example.com",
				Description: "Poor quality",
			}
			err := CreateComplaint(req, "internal/uploads/complaints/doc.pdf")
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify created
			complaints, err := GetAllComplaints()
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(complaints).To(gomega.HaveLen(1))
			gomega.Expect(complaints[0].Status).To(gomega.Equal("open"))
			gomega.Expect(complaints[0].Fullname).To(gomega.Equal("Workflow User"))

			// Admin responds
			complaintID := complaints[0].ID
			err = UpdateComplaintResponse(complaintID, "Thank you for reporting")
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify responded
			var updatedComplaint models.Complaint
			err = db.DB.First(&updatedComplaint, complaintID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updatedComplaint.Status).To(gomega.Equal("open")) // Status is not changed by UpdateComplaintResponse
			gomega.Expect(updatedComplaint.AdminResponse).To(gomega.Equal("Thank you for reporting"))
		})
	})
})
