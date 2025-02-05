# AWS Configuration for Video Project

This guide provides a step-by-step approach to configure AWS services for handling video uploads, conversion, and streaming using S3 and MediaConvert.

---

## 1. Create an IAM User
1. Go to the IAM console and create a new IAM user.
2. Attach the following policies to the user:
   - `AmazonAPIGatewayInvokeFullAccess`
   - `AmazonS3FullAccess`
   - `AWSElementalMediaConvertFullAccess`
3. Create an access key for this user and note down the following environment variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
4. Get the ARN of this user, which will be used later to configure the S3 policy.

---

## 2. Create an IAM Role for MediaConvert
1. Go to the IAM console and create a new IAM role.
2. Select **AWS Service** and then choose **MediaConvert**.
3. Attach the following policies to the role:
   - `AmazonAPIGatewayInvokeFullAccess`
   - `AmazonS3FullAccess`
   - `AWSElementalMediaConvertFullAccess`
4. Note down the ARN of the role, which will be used as the environment variable:
   - `MEDIA_CONVERT_AWS_ROLE`

---

## 3. Create an S3 Bucket
1. Create a general-purpose S3 bucket for storing video files and HLS streams.
2. Configure the S3 bucket policy as shown below:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": [
                    "<IAM_ROLE>",
                    "<IAM_USER>"
                ]
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::<BUCKET_NAME>/*"
        },
        {
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::<BUCKET_NAME>/images/*"
        },
        {
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::<BUCKET_NAME>/hls/*",
            "Condition": {
                "StringLike": {
                    "aws:Referer": "<WEBSITE_URL>/*"
                }
            }
        }
    ]
}
```

### 3.1 S3 CORS Policy
Configure the S3 CORS policy as shown below:

```json
[
    {
        "AllowedHeaders": [
            "Content-Type",
            "Authorization",
            "x-amz-security-token",
            "x-amz-request-payer",
            "x-amz-meta-*"
        ],
        "AllowedMethods": [
            "GET",
            "POST",
            "PUT",
            "DELETE"
        ],
        "AllowedOrigins": [
            "<WEBSITE_URL>"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 600
    }
]
```

### 3.2 Block Public Access Settings
1. Go to **Block public access settings**.
2. Check **only the first two sub-checkboxes** to ensure appropriate access control.

---

## 4. S3 Base URL
Your S3 base URL will be:

```
https://<BUCKET_NAME>.s3.<REGION_NAME>.amazonaws.com
```

---

## Environment Variables Summary
Make sure you have the following environment variables configured in your application:

```bash
AWS_ACCESS_KEY_ID=<Your IAM User Access Key>
AWS_SECRET_ACCESS_KEY=<Your IAM User Secret Key>
MEDIA_CONVERT_AWS_ROLE=<Your IAM Role ARN>
```

---

Follow these steps to set up AWS for your video project. Once done, you can proceed with integrating video upload and HLS streaming functionality in your application.
