#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Set environment variables
AWS_REGION="us-east-1"
APP_NAME="gt-sf-connector-middleware-api"
S3BucketName="gt-sf-connector-middleware-api-deployments-bucket"

# Determine the environment based on the branch
if [[ "$1" == "feature" ]]; then
  ENVIRONMENT="development"
elif [[ "$1" == "qa" ]]; then
  ENVIRONMENT="qa"
elif [[ "$1" == "uat" ]]; then
  ENVIRONMENT="uat"
elif [[ "$1" == "main" ]]; then
  ENVIRONMENT="production"
else
  echo "Invalid branch name. Use one of: feature, qa, uat, main."
  exit 1
fi

echo "Deploying to environment: $ENVIRONMENT"

# Install production dependencies
echo "Installing production dependencies..."
npm install

# Create the Lambda function zip
echo "Creating Lambda function zip..."
zip -r lambda-function.zip . -x '*.git*' '*.github*' '*.eslint*' '*.prettierrc*' '*.nycrc*' '*.env*' 'coverage*' 'package-lock.json' 'template.yaml' 'serverless.yml' 'local_deploy.sh' 'packaged.yaml' 'eslint.config.mjs' 'generateKey.js' 'node_modules/aws-sdk/*'

# Create the S3 bucket if it doesn't exist
echo "Checking or creating S3 bucket..."
aws s3api head-bucket --bucket ${S3BucketName}-${ENVIRONMENT} || \
aws s3api create-bucket --bucket ${S3BucketName}-${ENVIRONMENT} --region ${AWS_REGION}

# Upload the zip file to S3
S3_KEY="deployments/lambda-function-$(date +%Y%m%d%H%M%S).zip"
echo "Uploading Lambda function zip to S3..."
aws s3 cp lambda-function.zip s3://${S3BucketName}-${ENVIRONMENT}/$S3_KEY

# Package the CloudFormation template
echo "Packaging CloudFormation template..."
aws cloudformation package \
  --template-file template.yaml \
  --output-template-file packaged.yaml \
  --s3-bucket ${S3BucketName}-${ENVIRONMENT}

# Deploy the CloudFormation stack
echo "Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name ${APP_NAME}-${ENVIRONMENT} \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    LambdaS3Key=${S3_KEY}

echo "Deployment to $ENVIRONMENT completed successfully!"

# Cleanup temporary files
echo "Cleaning up temporary files..."
rm -f lambda-function.zip
rm -f packaged.yaml

echo "Cleanup completed!"