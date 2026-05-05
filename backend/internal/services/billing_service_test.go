package services_test

import (
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"
	. "si-bvet/internal/services"

	"github.com/glebarez/sqlite"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"gorm.io/gorm"
)

var _ = ginkgo.Describe("BillingService", func() {
	var gdb *gorm.DB

	ginkgo.BeforeEach(func() {
		var err error
		gdb, err = gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
		gomega.Expect(err).ToNot(gomega.HaveOccurred())

		db.DB = gdb

		err = db.DB.AutoMigrate(&models.User{}, &models.Notification{}, &models.Submission{}, &models.Billing{}, &models.LhuDocument{})
		gomega.Expect(err).ToNot(gomega.HaveOccurred())
	})

	ginkgo.Describe("CreateBilling", func() {
		ginkgo.It("creates billing and transitions submission to awaiting_payment", func() {
			// Arrange
			sub := models.Submission{
				UserID:        50,
				NoTicket:      "TCK-bill-1",
				TypeService:   "svc",
				PurposeOfTest: "purpose",
				ProcessStatus: "pending_verification",
			}
			gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

			now := time.Date(2026, 5, 5, 10, 0, 0, 0, time.UTC)

			// Act
			err := CreateBilling(sub.ID, "EBILL-001", 150000, "REG-001", "EPI-001", now)

			// Assert
			gomega.Expect(err).ToNot(gomega.HaveOccurred())

			var bill models.Billing
			gomega.Expect(db.DB.First(&bill, "submission_id = ?", sub.ID).Error).ToNot(gomega.HaveOccurred())
			gomega.Expect(bill.EBillingCode).To(gomega.Equal("EBILL-001"))
			gomega.Expect(bill.TotalAmount).To(gomega.Equal(150000.0))
			gomega.Expect(bill.PaymentStatus).To(gomega.Equal("unpaid"))
			gomega.Expect(bill.IssuedAt).To(gomega.Equal(&now))

			var updatedSub models.Submission
			gomega.Expect(db.DB.First(&updatedSub, sub.ID).Error).ToNot(gomega.HaveOccurred())
			gomega.Expect(updatedSub.ProcessStatus).To(gomega.Equal("awaiting_payment"))
			gomega.Expect(updatedSub.NoRegistration).To(gomega.Equal("REG-001"))
			gomega.Expect(updatedSub.NoEpi).To(gomega.Equal("EPI-001"))
		})

		ginkgo.It("returns error when billing already exists", func() {
			// Arrange
			sub := models.Submission{
				UserID:        51,
				NoTicket:      "TCK-bill-2",
				TypeService:   "svc",
				PurposeOfTest: "purpose",
				ProcessStatus: "pending_verification",
			}
			gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

			firstBill := models.Billing{
				SubmissionID:  sub.ID,
				EBillingCode:  "EBILL-001",
				TotalAmount:   150000,
				PaymentStatus: "unpaid",
			}
			gomega.Expect(db.DB.Create(&firstBill).Error).ToNot(gomega.HaveOccurred())

			// Act
			err := CreateBilling(sub.ID, "EBILL-002", 200000, "REG-001", "EPI-001", time.Now())

			// Assert
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err.Error()).To(gomega.ContainSubstring("already exists"))
		})
	})

	ginkgo.Describe("UpdateBilling", func() {
		ginkgo.It("updates billing code and amount", func() {
			// Arrange
			sub := models.Submission{
				UserID:        52,
				NoTicket:      "TCK-bill-3",
				TypeService:   "svc",
				PurposeOfTest: "purpose",
				ProcessStatus: "awaiting_payment",
			}
			gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

			bill := models.Billing{
				SubmissionID:  sub.ID,
				EBillingCode:  "EBILL-OLD",
				TotalAmount:   100000,
				PaymentStatus: "unpaid",
			}
			gomega.Expect(db.DB.Create(&bill).Error).ToNot(gomega.HaveOccurred())

			// Act
			err := UpdateBilling(sub.ID, "EBILL-NEW", 200000, "REG-NEW", "EPI-NEW")

			// Assert
			gomega.Expect(err).ToNot(gomega.HaveOccurred())

			var updated models.Billing
			gomega.Expect(db.DB.First(&updated, "submission_id = ?", sub.ID).Error).ToNot(gomega.HaveOccurred())
			gomega.Expect(updated.EBillingCode).To(gomega.Equal("EBILL-NEW"))
			gomega.Expect(updated.TotalAmount).To(gomega.Equal(200000.0))

			var updatedSub models.Submission
			gomega.Expect(db.DB.First(&updatedSub, sub.ID).Error).ToNot(gomega.HaveOccurred())
			gomega.Expect(updatedSub.NoRegistration).To(gomega.Equal("REG-NEW"))
			gomega.Expect(updatedSub.NoEpi).To(gomega.Equal("EPI-NEW"))
		})
	})

	ginkgo.Describe("UploadBillingProof", func() {
		ginkgo.It("uploads proof and marks billing with proof path", func() {
			// Arrange
			sub := models.Submission{
				UserID:        53,
				NoTicket:      "TCK-bill-4",
				TypeService:   "svc",
				PurposeOfTest: "purpose",
				ProcessStatus: "awaiting_payment",
			}
			gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

			bill := models.Billing{
				SubmissionID:  sub.ID,
				EBillingCode:  "EBILL-001",
				TotalAmount:   150000,
				PaymentStatus: "unpaid",
			}
			gomega.Expect(db.DB.Create(&bill).Error).ToNot(gomega.HaveOccurred())

			// Act
			err := UploadBillingProof(sub.ID, "uploads/proof-001.jpg")

			// Assert
			gomega.Expect(err).ToNot(gomega.HaveOccurred())

			var updated models.Billing
			gomega.Expect(db.DB.First(&updated, "submission_id = ?", sub.ID).Error).ToNot(gomega.HaveOccurred())
			gomega.Expect(updated.ProofPayment).To(gomega.Equal("uploads/proof-001.jpg"))
		})
	})

	ginkgo.Describe("VerifyPayment", func() {
		ginkgo.It("marks billing as paid and transitions submission to processed", func() {
			// Arrange
			sub := models.Submission{
				UserID:        54,
				NoTicket:      "TCK-bill-5",
				TypeService:   "svc",
				PurposeOfTest: "purpose",
				ProcessStatus: "awaiting_payment",
			}
			gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

			bill := models.Billing{
				SubmissionID:  sub.ID,
				EBillingCode:  "EBILL-001",
				TotalAmount:   150000,
				PaymentStatus: "unpaid",
			}
			gomega.Expect(db.DB.Create(&bill).Error).ToNot(gomega.HaveOccurred())

			// Act
			err := VerifyPayment(sub.ID)

			// Assert
			gomega.Expect(err).ToNot(gomega.HaveOccurred())

			var updated models.Billing
			gomega.Expect(db.DB.First(&updated, "submission_id = ?", sub.ID).Error).ToNot(gomega.HaveOccurred())
			gomega.Expect(updated.PaymentStatus).To(gomega.Equal("paid"))
			gomega.Expect(updated.PaidAt).ToNot(gomega.BeNil())

			var updatedSub models.Submission
			gomega.Expect(db.DB.First(&updatedSub, sub.ID).Error).ToNot(gomega.HaveOccurred())
			gomega.Expect(updatedSub.ProcessStatus).To(gomega.Equal("processed"))
		})
	})

	ginkgo.Describe("RejectPayment", func() {
		ginkgo.It("updates submission status to payment_rejected", func() {
			// Arrange
			sub := models.Submission{
				UserID:        55,
				NoTicket:      "TCK-bill-6",
				TypeService:   "svc",
				PurposeOfTest: "purpose",
				ProcessStatus: "awaiting_payment",
			}
			gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

			bill := models.Billing{
				SubmissionID:  sub.ID,
				EBillingCode:  "EBILL-001",
				TotalAmount:   150000,
				PaymentStatus: "unpaid",
			}
			gomega.Expect(db.DB.Create(&bill).Error).ToNot(gomega.HaveOccurred())

			// Act
			err := RejectPayment(sub.ID)

			// Assert
			gomega.Expect(err).ToNot(gomega.HaveOccurred())

			var updatedSub models.Submission
			gomega.Expect(db.DB.First(&updatedSub, sub.ID).Error).ToNot(gomega.HaveOccurred())
			gomega.Expect(updatedSub.ProcessStatus).To(gomega.Equal("payment_rejected"))
		})
	})

	ginkgo.Describe("GetBillingBySubmissionID", func() {
		ginkgo.It("retrieves billing record for submission", func() {
			// Arrange
			sub := models.Submission{
				UserID:        56,
				NoTicket:      "TCK-bill-7",
				TypeService:   "svc",
				PurposeOfTest: "purpose",
				ProcessStatus: "awaiting_payment",
			}
			gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

			bill := models.Billing{
				SubmissionID:  sub.ID,
				EBillingCode:  "EBILL-123",
				TotalAmount:   175000,
				PaymentStatus: "unpaid",
			}
			gomega.Expect(db.DB.Create(&bill).Error).ToNot(gomega.HaveOccurred())

			// Act
			retrieved, err := GetBillingBySubmissionID(sub.ID)

			// Assert
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			gomega.Expect(retrieved).ToNot(gomega.BeNil())
			gomega.Expect(retrieved.EBillingCode).To(gomega.Equal("EBILL-123"))
			gomega.Expect(retrieved.TotalAmount).To(gomega.Equal(175000.0))
			gomega.Expect(retrieved.PaymentStatus).To(gomega.Equal("unpaid"))
		})

		ginkgo.It("returns error when billing not found", func() {
			// Act
			retrieved, err := GetBillingBySubmissionID(99999)

			// Assert
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(retrieved.ID).To(gomega.Equal(uint(0)))
		})
	})

})
