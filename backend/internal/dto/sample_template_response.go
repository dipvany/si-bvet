package dto

type SampleTemplateImportResponse struct {
	SubmissionID uint          `json:"submission_id"`
	Samples      []SampleInput `json:"samples"`
	TotalSamples int           `json:"total_samples"`
}
