package services_test

import (
	"bytes"
	"si-bvet/internal/db"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	. "si-bvet/internal/services"

	"github.com/glebarez/sqlite"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"github.com/xuri/excelize/v2"
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
		err = db.DB.AutoMigrate(&models.User{}, &models.Notification{}, &models.Submission{}, &models.SubmissionSampleTemplate{}, &models.Sample{}, &models.TestService{}, &models.TestRequest{}, &models.Billing{}, &models.LhuDocument{})
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
						SampleModel:    "unggas",
						SpecimenType:   "swab",
						Species:        "dog",
						Age:            2,
						Volume:         "5ml",
						Condition:      "fresh",
						LocationSmpl:   "clinic",
						TotalSample:    1,
						Tests:          []dto.TestInput{{TestServiceID: 1}},
					},
				},
			}

			// Act
			id, err := CreateSubmissionWithSamplesAndTests(10, req)

			// Assert
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			gomega.Expect(id).ToNot(gomega.Equal(uint(0)))

			var subs []models.Submission
			gomega.Expect(db.DB.Find(&subs).Error).ToNot(gomega.HaveOccurred())
			gomega.Expect(len(subs)).To(gomega.BeNumerically(">=", 1))
			gomega.Expect(subs[0].NoTicket).ToNot(gomega.BeEmpty())
			gomega.Expect(subs[0].NoTicket).To(gomega.HavePrefix("TCK-"))

			var samples []models.Sample
			gomega.Expect(db.DB.Find(&samples).Error).ToNot(gomega.HaveOccurred())
			gomega.Expect(len(samples)).To(gomega.BeNumerically(">=", 1))
			gomega.Expect(samples[0].SpecimenType).To(gomega.Equal("swab"))

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
						SampleModel:    "swab",
						SpecimenType:   "blood",
						Species:        "cat",
						Age:            1,
						Volume:         "2ml",
						Condition:      "fresh",
						LocationSmpl:   "clinic",
						TotalSample:    1,
						Tests:          []dto.TestInput{{TestServiceID: 999}},
					},
				},
			}

			// Act
			id, err := CreateSubmissionWithSamplesAndTests(11, req)

			// Assert - expect error and no submission persisted
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(id).To(gomega.Equal(uint(0)))

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
				SubmissionID:   sub.ID,
				SampleCodeCust: "OLD-1",
				SampleModel:    "blood",
				SpecimenType:   "swab",
				Species:        "cat",
				LocationSmpl:   "farm",
				TotalSample:    1,
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
						SampleCodeCust: "NEW-1",
						SampleModel:    "mamalia",
						SpecimenType:   "nasal swab",
						Species:        "dog",
						LocationSmpl:   "lab",
						TotalSample:    2,
						Tests:          []dto.TestInput{{TestServiceID: svcNew.ID}},
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
			gomega.Expect(samples[0].SpecimenType).To(gomega.Equal("nasal swab"))

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
				SubmissionID:   sub.ID,
				SampleCodeCust: "KEEP-1",
				SampleModel:    "mamalia",
				Species:        "goat",
				LocationSmpl:   "field",
				TotalSample:    1,
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
						SampleCodeCust: "BROKEN-1",
						SampleModel:    "swab",
						SpecimenType:   "blood",
						Species:        "dog",
						LocationSmpl:   "lab",
						TotalSample:    1,
						Tests:          []dto.TestInput{{TestServiceID: 999999}},
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

	ginkgo.Describe("SampleTemplateExcel", func() {
		ginkgo.It("generates sample template excel successfully", func() {
			buf, err := GenerateSampleTemplateExcel()
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			gomega.Expect(buf).ToNot(gomega.BeNil())
			gomega.Expect(buf.Len()).To(gomega.BeNumerically(">", 0))
		})

		ginkgo.It("parses valid sample template rows", func() {
			f := excelize.NewFile()
			sheet := f.GetSheetName(0)
			f.SetCellValue(sheet, "A1", "sample_code_cust")
			f.SetCellValue(sheet, "B1", "sample_model")
			f.SetCellValue(sheet, "C1", "total_sample")
			f.SetCellValue(sheet, "D1", "test_service_ids")
			f.SetCellValue(sheet, "E1", "age")
			f.SetCellValue(sheet, "F1", "production_date")

			f.SetCellValue(sheet, "A2", "S-001")
			f.SetCellValue(sheet, "B2", "Serum")
			f.SetCellValue(sheet, "C2", "2")
			f.SetCellValue(sheet, "D2", "1,2")
			f.SetCellValue(sheet, "E2", "1.5")
			f.SetCellValue(sheet, "F2", "2026-05-19")

			buf := new(bytes.Buffer)
			err := f.Write(buf)
			gomega.Expect(err).ToNot(gomega.HaveOccurred())

			samples, err := ParseSamplesFromTemplateExcel(bytes.NewReader(buf.Bytes()))
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			gomega.Expect(samples).To(gomega.HaveLen(1))
			gomega.Expect(samples[0].SampleCodeCust).To(gomega.Equal("S-001"))
			gomega.Expect(samples[0].SampleModel).To(gomega.Equal("Serum"))
			gomega.Expect(samples[0].TotalSample).To(gomega.Equal(int64(2)))
			gomega.Expect(samples[0].Age).To(gomega.Equal(1.5))
			gomega.Expect(samples[0].Tests).To(gomega.HaveLen(2))
			gomega.Expect(samples[0].Tests[0].TestServiceID).To(gomega.Equal(uint(1)))
			gomega.Expect(samples[0].Tests[1].TestServiceID).To(gomega.Equal(uint(2)))
		})

		ginkgo.It("parses date fields in template display format", func() {
			f := excelize.NewFile()
			sheet := f.GetSheetName(0)
			f.SetCellValue(sheet, "A1", "sample_code_cust")
			f.SetCellValue(sheet, "B1", "sample_model")
			f.SetCellValue(sheet, "C1", "total_sample")
			f.SetCellValue(sheet, "D1", "test_service_ids")
			f.SetCellValue(sheet, "E1", "production_date")
			f.SetCellValue(sheet, "F1", "expired_date")

			f.SetCellValue(sheet, "A2", "S-003")
			f.SetCellValue(sheet, "B2", "Serum")
			f.SetCellValue(sheet, "C2", "1")
			f.SetCellValue(sheet, "D2", "1")
			f.SetCellValue(sheet, "E2", "01/05/2026")
			f.SetCellValue(sheet, "F2", "03/05/2026")

			buf := new(bytes.Buffer)
			err := f.Write(buf)
			gomega.Expect(err).ToNot(gomega.HaveOccurred())

			samples, err := ParseSamplesFromTemplateExcel(bytes.NewReader(buf.Bytes()))
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			gomega.Expect(samples).To(gomega.HaveLen(1))
			gomega.Expect(samples[0].ProductionDate).To(gomega.Equal("01/05/2026"))
			gomega.Expect(samples[0].ExpiredDate).To(gomega.Equal("03/05/2026"))
		})

		ginkgo.It("parses templates with flexible headers and a title row", func() {
			f := excelize.NewFile()
			sheet := f.GetSheetName(0)
			f.SetCellValue(sheet, "A1", "Customer Sample Bulk Template")
			f.SetCellValue(sheet, "A2", "Kode Sampel")
			f.SetCellValue(sheet, "B2", "Model Sampel")
			f.SetCellValue(sheet, "C2", "Specimen Group")
			f.SetCellValue(sheet, "D2", "Specimen")
			f.SetCellValue(sheet, "E2", "Hewan / Species")
			f.SetCellValue(sheet, "F2", "Batch")
			f.SetCellValue(sheet, "G2", "Pengawet")
			f.SetCellValue(sheet, "H2", "Kemasan")
			f.SetCellValue(sheet, "I2", "Tanggal Produksi")
			f.SetCellValue(sheet, "J2", "Volume")
			f.SetCellValue(sheet, "K2", "Tanggal Kadaluarsa")
			f.SetCellValue(sheet, "L2", "Jenis Kelamin")
			f.SetCellValue(sheet, "M2", "Umur")
			f.SetCellValue(sheet, "N2", "Unit Umur")
			f.SetCellValue(sheet, "O2", "Pemilik Hewan")
			f.SetCellValue(sheet, "P2", "Jenis Uji")
			f.SetCellValue(sheet, "Q2", "Jenis Lokasi")
			f.SetCellValue(sheet, "R2", "Lokasi Sampel")
			f.SetCellValue(sheet, "S2", "Telah Divaksin")
			f.SetCellValue(sheet, "A3", "S-002")
			f.SetCellValue(sheet, "B3", "Serum")
			f.SetCellValue(sheet, "C3", "Darah")
			f.SetCellValue(sheet, "D3", "Serum")
			f.SetCellValue(sheet, "E3", "Ayam")
			f.SetCellValue(sheet, "F3", "BATCH-01")
			f.SetCellValue(sheet, "G3", "None")
			f.SetCellValue(sheet, "H3", "Tube")
			f.SetCellValue(sheet, "I3", "2026-05-01")
			f.SetCellValue(sheet, "J3", "5 ml")
			f.SetCellValue(sheet, "K3", "2026-05-03")
			f.SetCellValue(sheet, "L3", "Jantan")
			f.SetCellValue(sheet, "M3", "1")
			f.SetCellValue(sheet, "N3", "Hari")
			f.SetCellValue(sheet, "O3", "PT Contoh")
			f.SetCellValue(sheet, "P3", "Diagnostik")
			f.SetCellValue(sheet, "Q3", "Kandang")
			f.SetCellValue(sheet, "R3", "Bandung")
			f.SetCellValue(sheet, "S3", "Ya")

			buf := new(bytes.Buffer)
			err := f.Write(buf)
			gomega.Expect(err).ToNot(gomega.HaveOccurred())

			samples, err := ParseSamplesFromTemplateExcel(bytes.NewReader(buf.Bytes()))
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			gomega.Expect(samples).To(gomega.HaveLen(1))
			gomega.Expect(samples[0].SampleCodeCust).To(gomega.Equal("S-002"))
			gomega.Expect(samples[0].SampleModel).To(gomega.Equal("Serum"))
			gomega.Expect(samples[0].SpecimenGroup).To(gomega.Equal("Darah"))
			gomega.Expect(samples[0].SpecimenType).To(gomega.Equal("Serum"))
			gomega.Expect(samples[0].Species).To(gomega.Equal("Ayam"))
			gomega.Expect(samples[0].TotalSample).To(gomega.Equal(int64(1)))
			gomega.Expect(samples[0].Tests).To(gomega.BeNil())
		})

		ginkgo.It("returns error when required headers are missing", func() {
			f := excelize.NewFile()
			sheet := f.GetSheetName(0)
			f.SetCellValue(sheet, "A1", "Kode Sampel")
			f.SetCellValue(sheet, "A2", "S-001")

			buf := new(bytes.Buffer)
			err := f.Write(buf)
			gomega.Expect(err).ToNot(gomega.HaveOccurred())

			_, err = ParseSamplesFromTemplateExcel(bytes.NewReader(buf.Bytes()))
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(err.Error()).To(gomega.ContainSubstring("missing required column"))
		})
	})

})
