package services_test

import (
	"fmt"
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"gorm.io/gorm"
)

var _ = ginkgo.Describe("Admin Action Flows", func() {
	var gdb *gorm.DB

	ginkgo.BeforeEach(func() {
		var err error
		dsn := fmt.Sprintf("file:admin_action_%d?mode=memory&cache=shared", time.Now().UnixNano())
		gdb, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		db.DB = gdb

		err = db.DB.AutoMigrate(
			&models.User{},
			&models.Admin{},
			&models.Submission{},
			&models.Sample{},
			&models.TestRequest{},
			&models.TestService{},
			&models.Complaint{},
		)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
	})
	ginkgo.Describe("VerifyUserByID", func() {
		ginkgo.It("should verify unverified customer successfully", func() {
			user := models.User{
				FullName:     "Unverified Customer",
				Email:        "unverified@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   false,
				VerifiedAt:   nil,
			}
			db.DB.Create(&user)

			verified, err := services.VerifyUserByID(user.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(verified.IsVerified).To(gomega.BeTrue())
			gomega.Expect(verified.VerifiedAt).NotTo(gomega.BeNil())

			// Verify in database
			var updated models.User
			db.DB.First(&updated, user.ID)
			gomega.Expect(updated.IsVerified).To(gomega.BeTrue())
			gomega.Expect(updated.VerifiedAt).NotTo(gomega.BeNil())
		})

		ginkgo.It("should verify already verified customer", func() {
			now := time.Now()
			user := models.User{
				FullName:     "Already Verified",
				Email:        "verified@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   true,
				VerifiedAt:   &now,
			}
			db.DB.Create(&user)

			verified, err := services.VerifyUserByID(user.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(verified.IsVerified).To(gomega.BeTrue())
		})

		ginkgo.It("should return error for non-existent user", func() {
			_, err := services.VerifyUserByID(999999)
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err).To(gomega.Equal(services.ErrUserNotFound))
		})
	})

	ginkgo.Describe("ApproveSubmission", func() {
		ginkgo.It("should approve submission when status is pending_verification", func() {
			user := models.User{
				FullName:     "Test User",
				Email:        "test@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   true,
			}
			db.DB.Create(&user)

			submission := models.Submission{
				UserID:        user.ID,
				ProcessStatus: "pending_verification",
				TypeService:   "Test",
			}
			db.DB.Create(&submission)

			err := services.ApproveSubmission(submission.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var updated models.Submission
			db.DB.First(&updated, submission.ID)
			gomega.Expect(updated.ProcessStatus).To(gomega.Equal("approved"))
		})

		ginkgo.It("should return error when submission not found", func() {
			err := services.ApproveSubmission(999999)
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err.Error()).To(gomega.ContainSubstring("submission not found"))
		})

		ginkgo.It("should return error when status is not pending_verification", func() {
			user := models.User{
				FullName:     "Test User",
				Email:        "test@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   true,
			}
			db.DB.Create(&user)

			submission := models.Submission{
				UserID:        user.ID,
				ProcessStatus: "approved",
				TypeService:   "Test",
			}
			db.DB.Create(&submission)

			err := services.ApproveSubmission(submission.ID)
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err.Error()).To(gomega.ContainSubstring("can only be approved when status is pending_verification"))
		})

		ginkgo.It("should return error when status is rejected", func() {
			user := models.User{
				FullName:     "Test User",
				Email:        "test@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   true,
			}
			db.DB.Create(&user)

			submission := models.Submission{
				UserID:        user.ID,
				ProcessStatus: "rejected",
				TypeService:   "Test",
			}
			db.DB.Create(&submission)

			err := services.ApproveSubmission(submission.ID)
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err.Error()).To(gomega.ContainSubstring("can only be approved when status is pending_verification"))
		})
	})

	ginkgo.Describe("RejectSubmission", func() {
		ginkgo.It("should reject submission when status is pending_verification", func() {
			user := models.User{
				FullName:     "Test User",
				Email:        "test@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   true,
			}
			db.DB.Create(&user)

			submission := models.Submission{
				UserID:        user.ID,
				ProcessStatus: "pending_verification",
				TypeService:   "Test",
			}
			db.DB.Create(&submission)

			err := services.RejectSubmission(submission.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var updated models.Submission
			db.DB.First(&updated, submission.ID)
			gomega.Expect(updated.ProcessStatus).To(gomega.Equal("rejected"))
		})

		ginkgo.It("should return error when submission not found", func() {
			err := services.RejectSubmission(999999)
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err.Error()).To(gomega.ContainSubstring("submission not found"))
		})

		ginkgo.It("should return error when status is not pending_verification", func() {
			user := models.User{
				FullName:     "Test User",
				Email:        "test@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   true,
			}
			db.DB.Create(&user)

			submission := models.Submission{
				UserID:        user.ID,
				ProcessStatus: "approved",
				TypeService:   "Test",
			}
			db.DB.Create(&submission)

			err := services.RejectSubmission(submission.ID)
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err.Error()).To(gomega.ContainSubstring("can only be rejected when status is pending_verification"))
		})

		ginkgo.It("should return error when status is already rejected", func() {
			user := models.User{
				FullName:     "Test User",
				Email:        "test@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   true,
			}
			db.DB.Create(&user)

			submission := models.Submission{
				UserID:        user.ID,
				ProcessStatus: "rejected",
				TypeService:   "Test",
			}
			db.DB.Create(&submission)

			err := services.RejectSubmission(submission.ID)
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err.Error()).To(gomega.ContainSubstring("can only be rejected when status is pending_verification"))
		})
	})

	ginkgo.Describe("UpdateComplaintResponse", func() {
		ginkgo.It("should update complaint response successfully", func() {
			user := models.User{
				FullName:     "Customer",
				Email:        "customer@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   true,
			}
			db.DB.Create(&user)

			complaint := models.Complaint{
				UserID:      user.ID,
				Subjects:    "Late test result",
				Description: "I submitted my sample 3 days ago",
				Status:      "open",
			}
			db.DB.Create(&complaint)

			err := services.UpdateComplaintResponse(complaint.ID, "We apologize for the delay")
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var updated models.Complaint
			db.DB.First(&updated, complaint.ID)
			gomega.Expect(updated.AdminResponse).To(gomega.Equal("We apologize for the delay"))
		})

		ginkgo.It("should return error when complaint not found", func() {
			err := services.UpdateComplaintResponse(999999, "Response text")
			gomega.Expect(err).To(gomega.HaveOccurred())
		})
	})

	ginkgo.Describe("Admin Workflow Integration", func() {
		ginkgo.It("should complete full customer verification -> submission approval flow", func() {
			// Step 1: Create customer (unverified)
			user := models.User{
				FullName:     "New Customer",
				Email:        "newcustomer@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   false,
			}
			db.DB.Create(&user)

			// Step 2: Admin verifies customer
			verified, err := services.VerifyUserByID(user.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(verified.IsVerified).To(gomega.BeTrue())

			// Step 3: Verified customer submits samples (automatically pending_verification)
			submission := models.Submission{
				UserID:        user.ID,
				ProcessStatus: "pending_verification",
				TypeService:   "COVID Test",
			}
			db.DB.Create(&submission)

			// Step 4: Admin reviews and approves submission
			err = services.ApproveSubmission(submission.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var approvedSubmission models.Submission
			db.DB.First(&approvedSubmission, submission.ID)
			gomega.Expect(approvedSubmission.ProcessStatus).To(gomega.Equal("approved"))
		})

		ginkgo.It("should complete full customer verification -> submission rejection flow", func() {
			// Step 1: Create customer (unverified)
			user := models.User{
				FullName:     "Rejected Customer",
				Email:        "rejected@test.com",
				PasswordHash: "hash",
				Role:         "customer",
				IsVerified:   false,
			}
			db.DB.Create(&user)

			// Step 2: Admin verifies customer
			verified, err := services.VerifyUserByID(user.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(verified.IsVerified).To(gomega.BeTrue())

			// Step 3: Customer submits
			submission := models.Submission{
				UserID:        user.ID,
				ProcessStatus: "pending_verification",
				TypeService:   "COVID Test",
			}
			db.DB.Create(&submission)

			// Step 4: Admin rejects submission
			err = services.RejectSubmission(submission.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var rejectedSubmission models.Submission
			db.DB.First(&rejectedSubmission, submission.ID)
			gomega.Expect(rejectedSubmission.ProcessStatus).To(gomega.Equal("rejected"))
		})
	})
})
