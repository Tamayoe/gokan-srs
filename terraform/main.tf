terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: Store state in S3 (recommended for team projects)
  # Uncomment and configure if needed
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "gokan-srs/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region  = var.aws_region
  profile = "terraform-deploy"
}

# Provide an AWS provider specifically for the us-east-1 region (Required for CloudFront certs)
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = "terraform-deploy"
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-3"
}

variable "domain_name" {
  description = "Domain name for the website (optional)"
  type        = string
  default     = "gokan-srs.com"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "gokan-srs"
}

# S3 Bucket for website hosting (standard bucket, not website-enabled)
resource "aws_s3_bucket" "website" {
  bucket = "${var.project_name}-website-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-website"
    Environment = "production"
  }
}

# S3 Bucket Public Access Block (keep bucket private, CloudFront will access it)
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Versioning (optional but recommended)
resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id

  versioning_configuration {
    status = "Disabled" # Set to "Enabled" if you want versioning
  }
}

# ── CloudFront Logs ────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "cf_logs" {
  bucket = "${var.project_name}-cf-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-cf-logs"
    Environment = "production"
  }
}

resource "aws_s3_bucket_public_access_block" "cf_logs" {
  bucket                  = aws_s3_bucket.cf_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront requires ACL support to deliver logs to S3
resource "aws_s3_bucket_ownership_controls" "cf_logs" {
  bucket = aws_s3_bucket.cf_logs.id
  rule { object_ownership = "BucketOwnerPreferred" }
}

resource "aws_s3_bucket_acl" "cf_logs" {
  depends_on = [aws_s3_bucket_ownership_controls.cf_logs]
  bucket     = aws_s3_bucket.cf_logs.id
  acl        = "log-delivery-write"
}

# ── Athena ─────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "athena_results" {
  bucket = "${var.project_name}-athena-results-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-athena-results"
    Environment = "production"
  }
}

resource "aws_s3_bucket_public_access_block" "athena_results" {
  bucket                  = aws_s3_bucket.athena_results.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_athena_workgroup" "main" {
  name = "${var.project_name}-workgroup"

  configuration {
    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.bucket}/results/"
    }
  }
}

resource "aws_athena_database" "cf_logs" {
  name   = replace("${var.project_name}_logs", "-", "_")
  bucket = aws_s3_bucket.athena_results.bucket
}

resource "aws_athena_named_query" "create_cf_table" {
  name      = "create-cloudfront-logs-table"
  workgroup = aws_athena_workgroup.main.id
  database  = aws_athena_database.cf_logs.name
  query     = <<-EOT
    CREATE EXTERNAL TABLE IF NOT EXISTS cf_access_logs (
      `date` DATE, time STRING, location STRING, bytes BIGINT,
      request_ip STRING, method STRING, host STRING, uri STRING,
      status INT, referrer STRING, user_agent STRING, query_string STRING,
      cookie STRING, result_type STRING, request_id STRING,
      host_header STRING, request_protocol STRING, request_bytes BIGINT,
      time_taken FLOAT, xforwarded_for STRING, ssl_protocol STRING,
      ssl_cipher STRING, response_result_type STRING, http_version STRING,
      fle_status STRING, fle_encrypted_fields INT, c_port INT,
      time_to_first_byte FLOAT, x_edge_detailed_result_type STRING,
      sc_content_type STRING, sc_content_len BIGINT,
      sc_range_start BIGINT, sc_range_end BIGINT
    )
    ROW FORMAT DELIMITED FIELDS TERMINATED BY '\t'
    LOCATION 's3://${aws_s3_bucket.cf_logs.bucket}/cloudfront/'
    TBLPROPERTIES ('skip.header.line.count'='2');
  EOT
}

resource "aws_athena_named_query" "unique_visitors" {
  name      = "unique-visitors-last-30-days"
  workgroup = aws_athena_workgroup.main.id
  database  = aws_athena_database.cf_logs.name
  query     = <<-EOT
    SELECT
      date,
      COUNT(DISTINCT request_ip) AS unique_visitors,
      COUNT(*) AS total_requests
    FROM cf_access_logs
    WHERE uri = '/index.html'
      AND date >= CURRENT_DATE - INTERVAL '30' DAY
    GROUP BY date
    ORDER BY date DESC;
  EOT
}

# ── CloudFront Origin Access Control ──────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for ${var.project_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # Removed price_class = "PriceClass_100" to allow Flat Tier enrollment

  # Use domain if provided, otherwise use CloudFront domain
  aliases = var.domain_name != "" ? [var.domain_name] : []

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.website.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  logging_config {
    bucket          = aws_s3_bucket.cf_logs.bucket_domain_name
    include_cookies = false
    prefix          = "cloudfront/"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${aws_s3_bucket.website.id}"

    # Use AWS Managed Cache Policy required for Flat Tier (replaces legacy forwarded_values & TTLs)
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Custom error response for SPA routing (CloudFront handles this, not S3)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == "" ? true : false

    # Custom domain ACM certificate
    acm_certificate_arn      = aws_acm_certificate.website.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${var.project_name}-cdn"
    Environment = "production"
  }
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })
}

# Look up the existing Route 53 Hosted Zone
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# Request an SSL/TLS Certificate in us-east-1
resource "aws_acm_certificate" "website" {
  provider                  = aws.us_east_1
  domain_name               = data.aws_route53_zone.main.name
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Automatically create the DNS records required to validate the Certificate
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.website.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for the Certificate to be fully validated before proceeding
resource "aws_acm_certificate_validation" "website" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.website.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Create the DNS A-Record pointing your domain to the CloudFront distribution
resource "aws_route53_record" "website_a_record" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = data.aws_route53_zone.main.name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Outputs
output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.website.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.website.id
}

output "website_url" {
  description = "Website URL"
  value       = "https://${var.domain_name}"
}

output "cf_logs_bucket" {
  description = "S3 bucket for CloudFront access logs"
  value       = aws_s3_bucket.cf_logs.id
}

output "athena_workgroup" {
  description = "Athena workgroup name"
  value       = aws_athena_workgroup.main.id
}
