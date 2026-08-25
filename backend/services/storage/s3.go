package storage

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"wanpictures-backend/models"
)

type S3Engine struct {
	Config models.S3Config
	client *http.Client
}

func NewS3Engine(cfg models.S3Config) *S3Engine {
	return &S3Engine{
		Config: cfg,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

// buildURL constructs full S3 endpoint URL for the object
func (s *S3Engine) buildURL(storageKey string) (*url.URL, string, error) {
	cleanKey := strings.TrimPrefix(storageKey, "/")
	endpoint := s.Config.Endpoint
	if !strings.HasPrefix(endpoint, "http://") && !strings.HasPrefix(endpoint, "https://") {
		endpoint = "https://" + endpoint
	}
	endpoint = strings.TrimSuffix(endpoint, "/")

	var fullURLStr string
	if s.Config.ForcePathStyle || s.Config.Bucket == "" {
		if s.Config.Bucket != "" {
			fullURLStr = fmt.Sprintf("%s/%s/%s", endpoint, s.Config.Bucket, cleanKey)
		} else {
			fullURLStr = fmt.Sprintf("%s/%s", endpoint, cleanKey)
		}
	} else {
		// Virtual-hosted style: https://bucket.endpoint/key
		u, err := url.Parse(endpoint)
		if err != nil {
			return nil, "", err
		}
		host := fmt.Sprintf("%s.%s", s.Config.Bucket, u.Host)
		fullURLStr = fmt.Sprintf("%s://%s/%s", u.Scheme, host, cleanKey)
	}

	parsed, err := url.Parse(fullURLStr)
	return parsed, cleanKey, err
}

func (s *S3Engine) publicURL(storageKey string) string {
	cleanKey := strings.TrimPrefix(storageKey, "/")
	if s.Config.CustomDomain != "" {
		domain := strings.TrimSuffix(s.Config.CustomDomain, "/")
		if !strings.HasPrefix(domain, "http://") && !strings.HasPrefix(domain, "https://") {
			domain = "https://" + domain
		}
		return fmt.Sprintf("%s/%s", domain, cleanKey)
	}
	u, _, _ := s.buildURL(storageKey)
	if u != nil {
		return u.String()
	}
	return storageKey
}

func (s *S3Engine) signRequest(req *http.Request, bodyHash string) {
	if s.Config.AccessKeyID == "" || s.Config.SecretAccessKey == "" {
		return
	}

	region := s.Config.Region
	if region == "" {
		region = "us-east-1"
	}
	service := "s3"
	now := time.Now().UTC()
	dateStamp := now.Format("20060102")
	amzDate := now.Format("20060102T150405Z")

	req.Header.Set("x-amz-date", amzDate)
	req.Header.Set("x-amz-content-sha256", bodyHash)
	if s.Config.ACL != "" {
		req.Header.Set("x-amz-acl", s.Config.ACL)
	}

	// Canonical headers
	host := req.Host
	if host == "" {
		host = req.URL.Host
	}

	canonicalHeaders := fmt.Sprintf("host:%s\nx-amz-content-sha256:%s\nx-amz-date:%s\n", host, bodyHash, amzDate)
	signedHeaders := "host;x-amz-content-sha256;x-amz-date"
	if s.Config.ACL != "" {
		canonicalHeaders = fmt.Sprintf("host:%s\nx-amz-acl:%s\nx-amz-content-sha256:%s\nx-amz-date:%s\n", host, s.Config.ACL, bodyHash, amzDate)
		signedHeaders = "host;x-amz-acl;x-amz-content-sha256;x-amz-date"
	}

	canonicalURI := req.URL.EscapedPath()
	if canonicalURI == "" {
		canonicalURI = "/"
	}

	canonicalRequest := fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n%s",
		req.Method,
		canonicalURI,
		req.URL.RawQuery,
		canonicalHeaders,
		signedHeaders,
		bodyHash,
	)

	credScope := fmt.Sprintf("%s/%s/%s/aws4_request", dateStamp, region, service)
	h := sha256.New()
	h.Write([]byte(canonicalRequest))
	canonicalRequestHash := hex.EncodeToString(h.Sum(nil))

	stringToSign := fmt.Sprintf("AWS4-HMAC-SHA256\n%s\n%s\n%s", amzDate, credScope, canonicalRequestHash)

	// Derive signing key
	kDate := hmacSHA256([]byte("AWS4"+s.Config.SecretAccessKey), dateStamp)
	kRegion := hmacSHA256(kDate, region)
	kService := hmacSHA256(kRegion, service)
	kSigning := hmacSHA256(kService, "aws4_request")

	signature := hex.EncodeToString(hmacSHA256(kSigning, stringToSign))

	authHeader := fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		s.Config.AccessKeyID, credScope, signedHeaders, signature)
	req.Header.Set("Authorization", authHeader)
}

func hmacSHA256(key []byte, data string) []byte {
	h := hmac.New(sha256.New, key)
	h.Write([]byte(data))
	return h.Sum(nil)
}

func (s *S3Engine) Save(ctx context.Context, storageKey string, reader io.Reader, size int64, contentType string) (string, error) {
	reqURL, _, err := s.buildURL(storageKey)
	if err != nil {
		return "", err
	}

	// Read body to compute sha256 if needed
	var bodyBytes []byte
	if reader != nil {
		b, err := io.ReadAll(reader)
		if err != nil {
			return "", err
		}
		bodyBytes = b
	}

	hash := sha256.Sum256(bodyBytes)
	bodyHash := hex.EncodeToString(hash[:])

	req, err := http.NewRequestWithContext(ctx, "PUT", reqURL.String(), bytes.NewReader(bodyBytes))
	if err != nil {
		return "", err
	}

	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	req.Header.Set("Content-Length", fmt.Sprintf("%d", len(bodyBytes)))

	s.signRequest(req, bodyHash)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("S3 upload request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return s.publicURL(storageKey), nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return "", fmt.Errorf("S3 upload failed with HTTP %d: %s", resp.StatusCode, string(respBody))
}

func (s *S3Engine) Delete(ctx context.Context, storageKey string) error {
	reqURL, _, err := s.buildURL(storageKey)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "DELETE", reqURL.String(), nil)
	if err != nil {
		return err
	}

	emptyHash := hex.EncodeToString(sha256.New().Sum(nil))
	s.signRequest(req, emptyHash)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("S3 delete request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound || (resp.StatusCode >= 200 && resp.StatusCode < 300) {
		return nil
	}

	return fmt.Errorf("S3 delete failed with HTTP %d", resp.StatusCode)
}

func (s *S3Engine) Exists(ctx context.Context, storageKey string) (bool, error) {
	reqURL, _, err := s.buildURL(storageKey)
	if err != nil {
		return false, err
	}

	req, err := http.NewRequestWithContext(ctx, "HEAD", reqURL.String(), nil)
	if err != nil {
		return false, err
	}

	emptyHash := hex.EncodeToString(sha256.New().Sum(nil))
	s.signRequest(req, emptyHash)

	resp, err := s.client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return true, nil
	}
	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}
	return false, fmt.Errorf("S3 HEAD returned HTTP %d", resp.StatusCode)
}

func (s *S3Engine) TestConnection(ctx context.Context) error {
	if s.Config.Endpoint == "" || s.Config.Bucket == "" {
		return fmt.Errorf("S3 endpoint and bucket are required")
	}
	testKey := fmt.Sprintf(".test_probe_%d", time.Now().Unix())
	_, err := s.Save(ctx, testKey, bytes.NewReader([]byte("ping")), 4, "text/plain")
	if err != nil {
		return err
	}
	_ = s.Delete(ctx, testKey)
	return nil
}
