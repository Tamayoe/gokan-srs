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
  region = var.aws_region
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

# CloudFront Origin Access Control
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