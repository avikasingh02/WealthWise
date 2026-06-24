import boto3
from botocore.exceptions import ClientError
from app.config import settings

_s3 = None


def get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
        )
        # Ensure bucket exists
        try:
            _s3.head_bucket(Bucket=settings.S3_BUCKET)
        except ClientError:
            _s3.create_bucket(Bucket=settings.S3_BUCKET)
    return _s3


def put_object(key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    get_s3().put_object(Bucket=settings.S3_BUCKET, Key=key, Body=data, ContentType=content_type)


def get_object(key: str) -> bytes:
    resp = get_s3().get_object(Bucket=settings.S3_BUCKET, Key=key)
    return resp["Body"].read()
