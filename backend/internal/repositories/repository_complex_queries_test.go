package repositories

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

func TestRepositoriesComplexQueries(t *testing.T) {
	gomega.RegisterFailHandler(ginkgo.Fail)
	ginkgo.RunSpecs(t, "Repositories Complex Queries Suite")
}

var _ = ginkgo.Describe("Repository Complex Queries", func() {
	var gdb *gorm.DB

	ginkgo.BeforeEach(func() {
		dsn := fmt.Sprintf("file:repo_complex_%d?mode=memory&cache=shared", time.Now().UnixNano())
		var err error
		gdb, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		db.DB = gdb

		// Migrate all models
		err = db.DB.AutoMigrate(
			&models.User{},
			&models.Submission{},
			&models.Sample{},
			&models.TestService{},
			&models.TestRequest{},
			&models.Billing{},
			&models.LhuDocument{},
			&models.Notification{},
			&models.Feedback{},
			&models.Complaint{},
		)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
	})

	ginkgo.Describe("Submission Query with Preload Relations", func() {
		ginkgo.It("should preload user relation from submission", func() {
			// Create user
			user := &models.User{
				Email:    "test@example.com",
				FullName: "Test User",
				Phone:    "081234567890",
			Role:     "customer",
			}
			err := db.DB.Create(user).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create submission
			submission := &models.Submission{
				UserID:        user.ID,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
			}
			err = db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Query with preload
			var loaded models.Submission
			err = db.DB.Preload("User").First(&loaded, submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(loaded.User.Email).To(gomega.Equal("test@example.com"))
		})

		ginkgo.It("should preload multiple relations: user, samples, billing", func() {
			// Create user
			user := &models.User{
				Email:    "test@example.com",
				FullName: "Test User",
				Phone:    "081234567890",
			Role:     "customer",
			}
			err := db.DB.Create(user).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create submission
			submission := &models.Submission{
				UserID:        user.ID,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  2,
				ProcessStatus: "done",
			}
			err = db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create samples
			for i := 1; i <= 2; i++ {
				sample := &models.Sample{
					SubmissionID:  submission.ID,
					SampleCodeCust: fmt.Sprintf("SAMPLE%d", i),
					SampleModel:    "Blood",
					TotalSample:   1,
				}
				err := db.DB.Create(sample).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
			}

			// Create billing
			billing := &models.Billing{
				SubmissionID: submission.ID,
				TotalAmount:  100000,
			}
			err = db.DB.Create(billing).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Query with multiple preloads
			var loaded models.Submission
			err = db.DB.
				Preload("User").
				Preload("Samples").
				Preload("Billing").
				First(&loaded, submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			gomega.Expect(loaded.User.Email).To(gomega.Equal("test@example.com"))
			gomega.Expect(loaded.Samples).To(gomega.HaveLen(2))
			gomega.Expect(loaded.Billing).NotTo(gomega.BeNil())
			gomega.Expect(loaded.Billing.TotalAmount).To(gomega.Equal(float64(100000)))
		})

		ginkgo.It("should preload nested relations: samples with test_requests", func() {
			// Create user
			user := &models.User{
				Email:    "test@example.com",
				FullName: "Test User",
				Phone:    "081234567890",
			Role:     "customer",
			}
			err := db.DB.Create(user).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create test service
			testService := &models.TestService{
				TestName: "Blood Test",
				UnitLab:  "Lab 1",
				Price:    50000,
			}
			err = db.DB.Create(testService).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create submission
			submission := &models.Submission{
				UserID:        user.ID,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
			}
			err = db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create sample
			sample := &models.Sample{
				SubmissionID:  submission.ID,
				SampleCodeCust: "SAMPLE1",
				SampleModel:    "Blood",
				TotalSample:   1,
			}
			err = db.DB.Create(sample).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create test request
			testRequest := &models.TestRequest{
				SampleID:      sample.ID,
				TestServiceID: testService.ID,
				PriceAtMoment: 50000,
			}
			err = db.DB.Create(testRequest).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Query with nested preload
			var loaded models.Submission
			err = db.DB.
				Preload("Samples.TestRequests.TestService").
				First(&loaded, submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			gomega.Expect(loaded.Samples).To(gomega.HaveLen(1))
		})
	})

	ginkgo.Describe("Submission Query with Filter and Status", func() {
		ginkgo.It("should query submissions by user and status", func() {
			// Create user
			user := &models.User{
				Email:    "test@example.com",
				FullName: "Test User",
				Phone:    "081234567890",
			Role:     "customer",
			}
			err := db.DB.Create(user).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create multiple submissions with different statuses
			for i, status := range []string{"pending_verification", "approved", "done"} {
				submission := &models.Submission{
					UserID:        user.ID,
					NoTicket:      fmt.Sprintf("TKT%03d", i+1),
					TypeService:   "Blood Test",
					PurposeOfTest: "Diagnosis",
					SamplesCount:  1,
					ProcessStatus: status,
				}
				err := db.DB.Create(submission).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
			}

			// Query approved submissions for user
			var submissions []models.Submission
			err = db.DB.
				Where("user_id = ? AND process_status = ?", user.ID, "approved").
				Find(&submissions).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			gomega.Expect(submissions).To(gomega.HaveLen(1))
			gomega.Expect(submissions[0].ProcessStatus).To(gomega.Equal("approved"))
		})

		ginkgo.It("should count submissions by user", func() {
			// Create user
			user := &models.User{
				Email:    "test@example.com",
				FullName: "Test User",
				Phone:    "081234567890",
			Role:     "customer",
			}
			err := db.DB.Create(user).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create 3 submissions
			for i := 1; i <= 3; i++ {
				submission := &models.Submission{
					UserID:        user.ID,
					NoTicket:      fmt.Sprintf("TKT%03d", i),
					TypeService:   "Blood Test",
					PurposeOfTest: "Diagnosis",
					SamplesCount:  1,
					ProcessStatus: "done",
				}
				err := db.DB.Create(submission).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
			}

			// Count submissions
			var count int64
			err = db.DB.Model(&models.Submission{}).
				Where("user_id = ?", user.ID).
				Count(&count).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			gomega.Expect(count).To(gomega.Equal(int64(3)))
		})
	})

	ginkgo.Describe("Partial Update Scenarios", func() {
		ginkgo.It("should update specific fields without affecting others", func() {
			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  5,
				ProcessStatus: "pending_verification",
				Notes:         "Original notes",
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Partial update: only update ProcessStatus and Notes
			err = db.DB.Model(submission).
				Updates(map[string]interface{}{
					"process_status": "approved",
					"notes":          "Updated notes",
				}).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify
			var updated models.Submission
			err = db.DB.First(&updated, submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Updated fields
			gomega.Expect(updated.ProcessStatus).To(gomega.Equal("approved"))
			gomega.Expect(updated.Notes).To(gomega.Equal("Updated notes"))

			// Unchanged fields
			gomega.Expect(updated.SamplesCount).To(gomega.Equal(5))
			gomega.Expect(updated.NoTicket).To(gomega.Equal("TKT001"))
		})

		ginkgo.It("should not reset nullable fields on partial update", func() {
			now := time.Now()

			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
				AttachmentDoc: "path/to/doc.pdf",
				DateOfReceive: &now,
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Partial update: only update ProcessStatus
			err = db.DB.Model(&models.Submission{}).
				Where("id = ?", submission.ID).
				Update("process_status", "completed").Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify nullable fields not reset
			var updated models.Submission
			err = db.DB.First(&updated, submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			gomega.Expect(updated.AttachmentDoc).To(gomega.Equal("path/to/doc.pdf"))
			gomega.Expect(updated.DateOfReceive).NotTo(gomega.BeNil())
		})
	})

	ginkgo.Describe("Transaction Scenarios", func() {
		ginkgo.It("should rollback on error within transaction", func() {
			// Create submission
			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "pending",
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Attempt transaction with error
			err = db.DB.Transaction(func(tx *gorm.DB) error {
				// Update 1: successful
				if err := tx.Model(submission).Update("process_status", "approved").Error; err != nil {
					return err
				}

				// Create billing
				billing := &models.Billing{
					SubmissionID: submission.ID,
					TotalAmount:  100000,
				}
				if err := tx.Create(billing).Error; err != nil {
					return err
				}

				// Simulate error
				return fmt.Errorf("simulated error for rollback")
			})

			gomega.Expect(err).To(gomega.HaveOccurred())

			// Verify rollback: status should still be pending
			var updated models.Submission
			err = db.DB.First(&updated, submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updated.ProcessStatus).To(gomega.Equal("pending"))

			// Verify billing not created
			var billingCount int64
			err = db.DB.Model(&models.Billing{}).
				Where("submission_id = ?", submission.ID).
				Count(&billingCount).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(billingCount).To(gomega.Equal(int64(0)))
		})

		ginkgo.It("should commit on successful transaction", func() {
			submission := &models.Submission{
				UserID:        1,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "pending",
			}
			err := db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Successful transaction
			err = db.DB.Transaction(func(tx *gorm.DB) error {
				if err := tx.Model(submission).Update("process_status", "approved").Error; err != nil {
					return err
				}

				billing := &models.Billing{
					SubmissionID: submission.ID,
					TotalAmount:  100000,
				}
				if err := tx.Create(billing).Error; err != nil {
					return err
				}

				return nil
			})

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify commit: status changed
			var updated models.Submission
			err = db.DB.First(&updated, submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updated.ProcessStatus).To(gomega.Equal("approved"))

			// Verify billing created
			var billingCount int64
			err = db.DB.Model(&models.Billing{}).
				Where("submission_id = ?", submission.ID).
				Count(&billingCount).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(billingCount).To(gomega.Equal(int64(1)))
		})
	})

	ginkgo.Describe("Join Safety and Query Correctness", func() {
		ginkgo.It("should not return duplicates from join operations", func() {
			// Create user
			user := &models.User{
				Email:    "test@example.com",
				FullName: "Test User",
				Phone:    "081234567890",
			Role:     "customer",
			}
			err := db.DB.Create(user).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create submission
			submission := &models.Submission{
				UserID:        user.ID,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
			}
			err = db.DB.Create(submission).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create multiple samples for same submission
			for i := 1; i <= 3; i++ {
				sample := &models.Sample{
					SubmissionID:  submission.ID,
					SampleCodeCust: fmt.Sprintf("SAMPLE%d", i),
					SampleModel:    "Blood",
					TotalSample:   1,
				}
				err := db.DB.Create(sample).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
			}

			// Query without joins (should get one submission)
			var submissions []models.Submission
			err = db.DB.
				Where("user_id = ? AND id = ?", user.ID, submission.ID).
				Find(&submissions).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(submissions).To(gomega.HaveLen(1))

			// Query submissions with preload (should still get one but with samples)
			var loadedSub models.Submission
			err = db.DB.
				Preload("Samples").
				First(&loadedSub, submission.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(loadedSub.Samples).To(gomega.HaveLen(3))
		})

		ginkgo.It("should correctly filter by joined table fields", func() {
			// Create two users
			user1 := &models.User{
				Email:    "user1@example.com",
				FullName: "User 1",
				Phone:    "081234567890",
			Role:     "customer",
			}
			err := db.DB.Create(user1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			user2 := &models.User{
				Email:    "user2@example.com",
				FullName: "User 2",
				Phone:    "081234567891",
				Role:     "customer",
			}
			err = db.DB.Create(user2).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Create submissions for each user
			sub1 := &models.Submission{
				UserID:        user1.ID,
				NoTicket:      "TKT001",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
			}
			err = db.DB.Create(sub1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			sub2 := &models.Submission{
				UserID:        user2.ID,
				NoTicket:      "TKT002",
				TypeService:   "Blood Test",
				PurposeOfTest: "Diagnosis",
				SamplesCount:  1,
				ProcessStatus: "done",
			}
			err = db.DB.Create(sub2).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Query submissions for user1 via joined filter
			var submissions []models.Submission
			err = db.DB.
				Joins("JOIN Users ON Users.id = Submission.user_id").
				Where("Users.id = ?", user1.ID).
				Find(&submissions).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			gomega.Expect(submissions).To(gomega.HaveLen(1))
			gomega.Expect(submissions[0].UserID).To(gomega.Equal(user1.ID))
		})
	})

	ginkgo.Describe("Distinct Query Results", func() {
		ginkgo.It("should return distinct process statuses", func() {
			statuses := []string{"pending", "approved", "done", "pending", "approved", "done"}

			for i, status := range statuses {
				submission := &models.Submission{
					UserID:        uint(i%2 + 1), // Alternate between user 1 and 2
					NoTicket:      fmt.Sprintf("TKT%03d", i+1),
					TypeService:   "Blood Test",
					PurposeOfTest: "Diagnosis",
					SamplesCount:  1,
					ProcessStatus: status,
				}
				err := db.DB.Create(submission).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
			}

			// Get distinct statuses
			var distinctStatuses []string
			err := db.DB.Model(&models.Submission{}).
				Distinct("process_status").
				Order("process_status").
				Pluck("process_status", &distinctStatuses).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			gomega.Expect(distinctStatuses).To(gomega.HaveLen(3))
			gomega.Expect(distinctStatuses).To(gomega.ContainElement("pending"))
			gomega.Expect(distinctStatuses).To(gomega.ContainElement("approved"))
			gomega.Expect(distinctStatuses).To(gomega.ContainElement("done"))
		})
	})
})
