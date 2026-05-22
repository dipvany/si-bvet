package storage

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"github.com/google/uuid"
	"google.golang.org/api/option"
)

type DocumentStorage interface {
	SaveRegistrationDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	SaveBillingProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	SaveComplaintAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	SaveLHUFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error)
	ResolveDownloadLocation(ctx context.Context, location string) (string, error)
}

type LocalDocumentStorage struct {
	baseDir string
}

func NewLocalDocumentStorage(baseDir string) *LocalDocumentStorage {
	if baseDir == "" {
		baseDir = filepath.Join("internal", "uploads")
	}

	return &LocalDocumentStorage{baseDir: baseDir}
}

func (s *LocalDocumentStorage) SaveRegistrationDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "registration-docs", fileHeader)
}

func (s *LocalDocumentStorage) SaveBillingProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "billing-proofs", fileHeader)
}

func (s *LocalDocumentStorage) SaveComplaintAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "complaints", fileHeader)
}

func (s *LocalDocumentStorage) SaveLHUFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "lhu", fileHeader)
}

func (s *LocalDocumentStorage) ResolveDownloadLocation(ctx context.Context, location string) (string, error) {
	_ = ctx

	if location == "" {
		return "", nil
	}

	if strings.HasPrefix(location, "/uploads/") {
		relativePath := strings.TrimPrefix(location, "/uploads/")
		return filepath.Join(s.baseDir, filepath.FromSlash(relativePath)), nil
	}

	if strings.HasPrefix(location, "internal/uploads/") {
		return filepath.Clean(location), nil
	}

	return location, nil
}

func (s *LocalDocumentStorage) saveMultipartFile(ctx context.Context, objectPrefix string, fileHeader *multipart.FileHeader) (string, error) {
	_ = ctx

	if fileHeader == nil {
		return "", fmt.Errorf("file is required")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	name := sanitizeFileName(fileHeader.Filename)
	if name == "" {
		name = objectPrefix
	}

	relativePath := filepath.Join(objectPrefix, fmt.Sprintf("%d-%s-%s", time.Now().UnixNano(), uuid.NewString(), name))
	absolutePath := filepath.Join(s.baseDir, relativePath)

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return "", err
	}

	destination, err := os.Create(absolutePath)
	if err != nil {
		return "", err
	}
	defer destination.Close()

	if _, err := io.Copy(destination, file); err != nil {
		return "", err
	}

	return "/uploads/" + filepath.ToSlash(relativePath), nil
}

type GCSDocumentStorage struct {
	bucketName string
	client     *storage.Client
}

func NewGCSDocumentStorage(ctx context.Context, bucketName string, credentialsFile string) (*GCSDocumentStorage, error) {
	if bucketName == "" {
		return nil, fmt.Errorf("GCS bucket name is required")
	}

	var opts []option.ClientOption
	if credentialsFile != "" {
		opts = append(opts, option.WithCredentialsFile(credentialsFile))
	}

	client, err := storage.NewClient(ctx, opts...)
	if err != nil {
		return nil, err
	}

	return &GCSDocumentStorage{
		bucketName: bucketName,
		client:     client,
	}, nil
}

func (s *GCSDocumentStorage) SaveRegistrationDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "registration-docs", fileHeader)
}

func (s *GCSDocumentStorage) SaveBillingProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "billing-proofs", fileHeader)
}

func (s *GCSDocumentStorage) SaveComplaintAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "complaints", fileHeader)
}

func (s *GCSDocumentStorage) SaveLHUFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return s.saveMultipartFile(ctx, "lhu", fileHeader)
}

func (s *GCSDocumentStorage) ResolveDownloadLocation(ctx context.Context, location string) (string, error) {
	if location == "" {
		return "", nil
	}

	if strings.HasPrefix(location, "http://") || strings.HasPrefix(location, "https://") {
		return location, nil
	}

	bucketName, objectName, ok := parseGCSLocation(location)
	if !ok {
		return location, nil
	}

	if bucketName != s.bucketName {
		return "", fmt.Errorf("gcs object belongs to unsupported bucket %s", bucketName)
	}

	url, err := storage.SignedURL(s.bucketName, objectName, &storage.SignedURLOptions{
		Method:  http.MethodGet,
		Expires: time.Now().Add(24 * time.Hour),
		Scheme:  storage.SigningSchemeV4,
	})
	if err != nil {
		return "", err
	}

	return url, nil
}

func (s *GCSDocumentStorage) saveMultipartFile(ctx context.Context, objectPrefix string, fileHeader *multipart.FileHeader) (string, error) {
	if fileHeader == nil {
		return "", fmt.Errorf("file is required")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	name := sanitizeFileName(fileHeader.Filename)
	if name == "" {
		name = objectPrefix
	}

	objectName := fmt.Sprintf("%s/%d-%s-%s", objectPrefix, time.Now().UnixNano(), uuid.NewString(), name)
	writer := s.client.Bucket(s.bucketName).Object(objectName).NewWriter(ctx)
	writer.ContentType = fileHeader.Header.Get("Content-Type")

	if _, err := io.Copy(writer, file); err != nil {
		_ = writer.Close()
		return "", err
	}

	if err := writer.Close(); err != nil {
		return "", err
	}

	return gcsLocation(s.bucketName, objectName), nil
}

func sanitizeFileName(fileName string) string {
	fileName = filepath.Base(strings.TrimSpace(fileName))
	fileName = strings.ReplaceAll(fileName, " ", "_")
	fileName = strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= 'A' && r <= 'Z':
			return r
		case r >= '0' && r <= '9':
			return r
		case r == '.', r == '-', r == '_':
			return r
		default:
			return '-'
		}
	}, fileName)
	return strings.Trim(fileName, "-._")
}

func NewRegistrationDocumentStorage(ctx context.Context) (DocumentStorage, error) {
	return NewUploadStorage(ctx)
}

func NewUploadStorage(ctx context.Context) (DocumentStorage, error) {
	bucketName := os.Getenv("GCS_BUCKET_NAME")
	if bucketName == "" {
		bucketName = os.Getenv("GCS_BUCKET")
	}

	if bucketName != "" {
		credentialsFile := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
		return NewGCSDocumentStorage(ctx, bucketName, credentialsFile)
	}

	return NewLocalDocumentStorage(""), nil
}

func gcsLocation(bucketName, objectName string) string {
	return "gs://" + bucketName + "/" + filepath.ToSlash(objectName)
}

func parseGCSLocation(location string) (string, string, bool) {
	if !strings.HasPrefix(location, "gs://") {
		return "", "", false
	}

	trimmed := strings.TrimPrefix(location, "gs://")
	parts := strings.SplitN(trimmed, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}

	return parts[0], parts[1], true
}