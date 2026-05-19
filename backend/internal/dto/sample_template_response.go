package dto

type SampleTemplateImportResponse struct {
	Samples      []SampleInput `json:"samples"`
	TotalSamples int           `json:"total_samples"`
}
