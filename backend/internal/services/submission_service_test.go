package services_test

import (
	"si-bvet/internal/db"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	. "si-bvet/internal/services"

	"github.com/glebarez/sqlite"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"gorm.io/gorm"
)

var _ = ginkgo.Describe("SubmissionService", func() {
    var gdb *gorm.DB

    ginkgo.BeforeEach(func() {
        var err error
        gdb, err = gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
        gomega.Expect(err).ToNot(gomega.HaveOccurred())

        // set global DB used by repositories
        db.DB = gdb

        // Auto migrate minimal models used
        err = db.DB.AutoMigrate(&models.User{}, &models.Notification{}, &models.Submission{}, &models.Sample{}, &models.TestService{}, &models.TestRequest{}, &models.Billing{}, &models.LhuDocument{})
        gomega.Expect(err).ToNot(gomega.HaveOccurred())
    })

    ginkgo.Describe("CreateSubmissionWithSamplesAndTests", func() {
        ginkgo.It("creates submission, samples and test requests successfully", func() {
            // Arrange: insert a TestService used by test requests
            svc := models.TestService{ID: 1, TestName: "Test A", Price: 150000}
            gomega.Expect(db.DB.Create(&svc).Error).ToNot(gomega.HaveOccurred())

            req := dto.SubmissionRequest{
                TypeService:   "regular",
                PurposeOfTest: "diagnosis",
                SampleTaker:   "vet",
                Notes:         "notes",
                Samples: []dto.SampleInput{
                    {
                        SampleCodeCust: "S1",
                        SampleType:     "blood",
                        Species:        "dog",
                        Age:            "2",
                        Volume:         "5ml",
                        Condition:      "fresh",
                        LocationSmplTaken: "clinic",
                        TotalSample:    1,
                        Tests: []dto.TestInput{{TestServiceID: 1}},
                    },
                },
            }

            // Act
            err := CreateSubmissionWithSamplesAndTests(10, req)

            // Assert
            gomega.Expect(err).ToNot(gomega.HaveOccurred())

            var subs []models.Submission
            gomega.Expect(db.DB.Find(&subs).Error).ToNot(gomega.HaveOccurred())
            gomega.Expect(len(subs)).To(gomega.BeNumerically(">=", 1))

            var samples []models.Sample
            gomega.Expect(db.DB.Find(&samples).Error).ToNot(gomega.HaveOccurred())
            gomega.Expect(len(samples)).To(gomega.BeNumerically(">=", 1))

            var tests []models.TestRequest
            gomega.Expect(db.DB.Find(&tests).Error).ToNot(gomega.HaveOccurred())
            gomega.Expect(len(tests)).To(gomega.BeNumerically(">=", 1))
            gomega.Expect(tests[0].PriceAtMoment).To(gomega.Equal(svc.Price))
        })

        ginkgo.It("rolls back transaction when test service not found", func() {
            // Arrange: no test service with ID 999
            req := dto.SubmissionRequest{
                TypeService:   "regular",
                PurposeOfTest: "diagnosis",
                SampleTaker:   "vet",
                Notes:         "notes",
                Samples: []dto.SampleInput{
                    {
                        SampleCodeCust: "S2",
                        SampleType:     "swab",
                        Species:        "cat",
                        Age:            "1",
                        Volume:         "2ml",
                        Condition:      "fresh",
                        LocationSmplTaken: "clinic",
                        TotalSample:    1,
                        Tests: []dto.TestInput{{TestServiceID: 999}},
                    },
                },
            }

            // Act
            err := CreateSubmissionWithSamplesAndTests(11, req)

            // Assert - expect error and no submission persisted
            gomega.Expect(err).To(gomega.HaveOccurred())

            var subs []models.Submission
            gomega.Expect(db.DB.Find(&subs).Error).ToNot(gomega.HaveOccurred())
            // no submission for user 11
            var count int64
            db.DB.Model(&models.Submission{}).Where("user_id = ?", 11).Count(&count)
            gomega.Expect(count).To(gomega.Equal(int64(0)))
        })
    })

    ginkgo.Describe("UpdateSubmissionWithSamplesAndTests", func() {
        ginkgo.It("updates submission and replaces old samples/tests", func() {
            // Arrange
            svcOld := models.TestService{ID: 11, TestName: "Old", Price: 10000}
            svcNew := models.TestService{ID: 12, TestName: "New", Price: 25000}
            gomega.Expect(db.DB.Create(&svcOld).Error).ToNot(gomega.HaveOccurred())
            gomega.Expect(db.DB.Create(&svcNew).Error).ToNot(gomega.HaveOccurred())

            sub := models.Submission{
                UserID:        21,
                NoTicket:      "TCK-update-1",
                TypeService:   "old-service",
                PurposeOfTest: "old-purpose",
                SampleTaker:   "old-taker",
                Notes:         "old-notes",
                SamplesCount:  1,
                ProcessStatus: "pending_verification",
            }
            gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

            oldSample := models.Sample{
                SubmissionID:      sub.ID,
                SampleCodeCust:    "OLD-1",
                SampleType:        "blood",
                Species:           "cat",
                LocationSmplTaken: "farm",
                TotalSample:       1,
            }
            gomega.Expect(db.DB.Create(&oldSample).Error).ToNot(gomega.HaveOccurred())

            oldTest := models.TestRequest{
                SampleID:      oldSample.ID,
                TestServiceID: svcOld.ID,
                PriceAtMoment: svcOld.Price,
            }
            gomega.Expect(db.DB.Create(&oldTest).Error).ToNot(gomega.HaveOccurred())

            updateReq := dto.UpdateSubmissionRequest{
                TypeService:   "new-service",
                PurposeOfTest: "new-purpose",
                SampleTaker:   "new-taker",
                Notes:         "new-notes",
                Samples: []dto.SampleInput{
                    {
                        SampleCodeCust:    "NEW-1",
                        SampleType:        "swab",
                        Species:           "dog",
                        LocationSmplTaken: "lab",
                        TotalSample:       2,
                        Tests:             []dto.TestInput{{TestServiceID: svcNew.ID}},
                    },
                },
            }

            // Act
            err := UpdateSubmissionWithSamplesAndTests(sub.ID, 21, updateReq)

            // Assert
            gomega.Expect(err).ToNot(gomega.HaveOccurred())

            var updated models.Submission
            gomega.Expect(db.DB.First(&updated, sub.ID).Error).ToNot(gomega.HaveOccurred())
            gomega.Expect(updated.TypeService).To(gomega.Equal("new-service"))
            gomega.Expect(updated.PurposeOfTest).To(gomega.Equal("new-purpose"))
            gomega.Expect(updated.SampleTaker).To(gomega.Equal("new-taker"))
            gomega.Expect(updated.Notes).To(gomega.Equal("new-notes"))
            gomega.Expect(updated.SamplesCount).To(gomega.Equal(1))

            var samples []models.Sample
            gomega.Expect(db.DB.Where("submission_id = ?", sub.ID).Find(&samples).Error).ToNot(gomega.HaveOccurred())
            gomega.Expect(samples).To(gomega.HaveLen(1))
            gomega.Expect(samples[0].SampleCodeCust).To(gomega.Equal("NEW-1"))

            var tests []models.TestRequest
            gomega.Expect(db.DB.Joins("JOIN Samples ON Samples.id = TestRequest.samples_id").Where("Samples.submission_id = ?", sub.ID).Find(&tests).Error).ToNot(gomega.HaveOccurred())
            gomega.Expect(tests).To(gomega.HaveLen(1))
            gomega.Expect(tests[0].TestServiceID).To(gomega.Equal(svcNew.ID))
            gomega.Expect(tests[0].PriceAtMoment).To(gomega.Equal(svcNew.Price))
        })

        ginkgo.It("rolls back update when new test service is invalid", func() {
            // Arrange
            svcOld := models.TestService{ID: 31, TestName: "Old", Price: 11000}
            gomega.Expect(db.DB.Create(&svcOld).Error).ToNot(gomega.HaveOccurred())

            sub := models.Submission{
                UserID:        22,
                NoTicket:      "TCK-update-rollback-1",
                TypeService:   "stable-service",
                PurposeOfTest: "stable-purpose",
                SampleTaker:   "stable-taker",
                Notes:         "stable-notes",
                SamplesCount:  1,
                ProcessStatus: "pending_verification",
            }
            gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

            sample := models.Sample{
                SubmissionID:      sub.ID,
                SampleCodeCust:    "KEEP-1",
                SampleType:        "blood",
                Species:           "goat",
                LocationSmplTaken: "field",
                TotalSample:       1,
            }
            gomega.Expect(db.DB.Create(&sample).Error).ToNot(gomega.HaveOccurred())

            testReq := models.TestRequest{
                SampleID:      sample.ID,
                TestServiceID: svcOld.ID,
                PriceAtMoment: svcOld.Price,
            }
            gomega.Expect(db.DB.Create(&testReq).Error).ToNot(gomega.HaveOccurred())

            updateReq := dto.UpdateSubmissionRequest{
                TypeService:   "broken-service",
                PurposeOfTest: "broken-purpose",
                SampleTaker:   "broken-taker",
                Notes:         "broken-notes",
                Samples: []dto.SampleInput{
                    {
                        SampleCodeCust:    "BROKEN-1",
                        SampleType:        "swab",
                        Species:           "dog",
                        LocationSmplTaken: "lab",
                        TotalSample:       1,
                        Tests:             []dto.TestInput{{TestServiceID: 999999}},
                    },
                },
            }

            // Act
            err := UpdateSubmissionWithSamplesAndTests(sub.ID, 22, updateReq)

            // Assert
            gomega.Expect(err).To(gomega.HaveOccurred())

            var unchanged models.Submission
            gomega.Expect(db.DB.First(&unchanged, sub.ID).Error).ToNot(gomega.HaveOccurred())
            gomega.Expect(unchanged.TypeService).To(gomega.Equal("stable-service"))
            gomega.Expect(unchanged.PurposeOfTest).To(gomega.Equal("stable-purpose"))
            gomega.Expect(unchanged.SampleTaker).To(gomega.Equal("stable-taker"))
            gomega.Expect(unchanged.Notes).To(gomega.Equal("stable-notes"))

            var sampleCount int64
            db.DB.Model(&models.Sample{}).Where("submission_id = ?", sub.ID).Count(&sampleCount)
            gomega.Expect(sampleCount).To(gomega.Equal(int64(1)))

            var testCount int64
            db.DB.Model(&models.TestRequest{}).
                Joins("JOIN Samples ON Samples.id = TestRequest.samples_id").
                Where("Samples.submission_id = ?", sub.ID).
                Count(&testCount)
            gomega.Expect(testCount).To(gomega.Equal(int64(1)))
        })

        ginkgo.It("returns unauthorized if user does not own submission", func() {
            // Arrange: create submission owned by user 1
            sub := models.Submission{UserID: 1, ProcessStatus: "pending_verification", TypeService: "t", NoTicket: "TCK-test-1"}
            gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

            // Act
            err := UpdateSubmissionWithSamplesAndTests(sub.ID, 2, dto.UpdateSubmissionRequest{})

            // Assert
            gomega.Expect(err).To(gomega.HaveOccurred())
            gomega.Expect(err.Error()).To(gomega.ContainSubstring("unauthorized"))
        })

        ginkgo.It("returns error when submission status is not editable", func() {
            // Arrange: create submission owned by user 3 but already approved
            sub := models.Submission{UserID: 3, ProcessStatus: "approved", TypeService: "t", NoTicket: "TCK-test-2"}
            gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

            // Act
            err := UpdateSubmissionWithSamplesAndTests(sub.ID, 3, dto.UpdateSubmissionRequest{})

            // Assert
            gomega.Expect(err).To(gomega.HaveOccurred())
            gomega.Expect(err.Error()).To(gomega.ContainSubstring("submission cannot be edited"))
        })
    })

    ginkgo.Describe("GetSubmissionTracking", func() {
        ginkgo.It("returns billing and lhu availability for owned submission", func() {
            // Arrange
            sub := models.Submission{
                UserID:        77,
                NoTicket:      "TCK-track-1",
                TypeService:   "svc",
                PurposeOfTest: "purpose",
                ProcessStatus: "processed",
            }
            gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

            bill := models.Billing{SubmissionID: sub.ID, PaymentStatus: "paid", TotalAmount: 10000}
            gomega.Expect(db.DB.Create(&bill).Error).ToNot(gomega.HaveOccurred())

            lhu := models.LhuDocument{SubmissionID: sub.ID, NoLhu: "LHU-001", FilePath: "uploads/lhu.pdf"}
            gomega.Expect(db.DB.Create(&lhu).Error).ToNot(gomega.HaveOccurred())

            // Act
            resp, err := GetSubmissionTracking(sub.ID, 77)

            // Assert
            gomega.Expect(err).ToNot(gomega.HaveOccurred())
            gomega.Expect(resp.SubmissionID).To(gomega.Equal(sub.ID))
            gomega.Expect(resp.ProcessStatus).To(gomega.Equal("processed"))
            gomega.Expect(resp.BillingStatus).To(gomega.Equal("paid"))
            gomega.Expect(resp.LHUAvailable).To(gomega.BeTrue())
        })

        ginkgo.It("returns unauthorized when submission is not owned", func() {
            // Arrange
            sub := models.Submission{
                UserID:        88,
                NoTicket:      "TCK-track-2",
                TypeService:   "svc",
                PurposeOfTest: "purpose",
                ProcessStatus: "pending_verification",
            }
            gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

            // Act
            _, err := GetSubmissionTracking(sub.ID, 99)

            // Assert
            gomega.Expect(err).To(gomega.HaveOccurred())
            gomega.Expect(err.Error()).To(gomega.ContainSubstring("unauthorized"))
        })
    })

    ginkgo.Describe("GetSubmissionTrackingTimeline", func() {
        ginkgo.It("maps key statuses into expected timeline states", func() {
            testCases := []struct {
                status      string
                expectStep  int
                expectLabel string
            }{
                {status: "pending_verification", expectStep: 1, expectLabel: "Pengajuan dibuat"},
                {status: "awaiting_payment", expectStep: 3, expectLabel: "Menunggu pembayaran"},
                {status: "awaiting_verification", expectStep: 3, expectLabel: "Menunggu pembayaran"},
                {status: "processed", expectStep: 4, expectLabel: "Sedang diproses lab"},
                {status: "done", expectStep: 5, expectLabel: "LHU tersedia"},
            }

            for i, tc := range testCases {
                sub := models.Submission{
                    UserID:        120,
                    NoTicket:      "TCK-timeline-case-" + string(rune('A'+i)),
                    TypeService:   "svc",
                    PurposeOfTest: "purpose",
                    ProcessStatus: tc.status,
                }
                gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

                resp, err := GetSubmissionTrackingTimeline(sub.ID, 120)
                gomega.Expect(err).ToNot(gomega.HaveOccurred())
                gomega.Expect(resp.CurrentStep).To(gomega.Equal(tc.expectStep))
                gomega.Expect(resp.Timeline[tc.expectStep-1].Label).To(gomega.Equal(tc.expectLabel))
                gomega.Expect(resp.Timeline[tc.expectStep-1].Status).To(gomega.Equal("current"))
            }
        })

        ginkgo.It("maps statuses to timeline steps correctly", func() {
            // Arrange: create submission for user 7 with different statuses and assert mapping
            sub := models.Submission{UserID: 7, ProcessStatus: "awaiting_payment", NoTicket: "TCK-test-3"}
            gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

            // Act
            resp, err := GetSubmissionTrackingTimeline(sub.ID, 7)

            // Assert
            gomega.Expect(err).ToNot(gomega.HaveOccurred())
            gomega.Expect(resp.SubmissionID).To(gomega.Equal(sub.ID))
            gomega.Expect(resp.CurrentStep).To(gomega.Equal(3))
            gomega.Expect(resp.CurrentStatus).To(gomega.Equal(sub.ProcessStatus))
        })

        ginkgo.It("returns unauthorized when requesting other user's timeline", func() {
            // Arrange: create submission for user 8
            sub := models.Submission{UserID: 8, ProcessStatus: "pending_verification", NoTicket: "TCK-test-4"}
            gomega.Expect(db.DB.Create(&sub).Error).ToNot(gomega.HaveOccurred())

            // Act
            _, err := GetSubmissionTrackingTimeline(sub.ID, 9)

            // Assert
            gomega.Expect(err).To(gomega.HaveOccurred())
            gomega.Expect(err.Error()).To(gomega.ContainSubstring("unauthorized"))
        })
    })

})
