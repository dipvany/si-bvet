package dto

type ExportSubmissionRequest struct {
	ExportAll     bool   `json:"export_all"`
	SubmissionIDs []uint `json:"submission_ids"`
}