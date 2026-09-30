"""Upload do PDF. `configurado()` só exige BUCKET_NAME; sem ACCESS_KEY/SECRET_KEY o boto3
usa a cadeia padrão (IAM role). S3_ENDPOINT + path-style para MinIO local."""
import asyncio
import os

import boto3
from botocore.config import Config


def configurado() -> bool:
    return bool(os.environ.get("BUCKET_NAME"))


def kwargs_cliente() -> dict:
    cfg: dict = {"connect_timeout": 5, "read_timeout": 20, "retries": {"max_attempts": 2}}
    kw: dict = {"region_name": os.environ.get("REGION", "us-east-1")}
    if os.environ.get("S3_ENDPOINT"):
        kw["endpoint_url"] = os.environ["S3_ENDPOINT"]
        cfg["s3"] = {"addressing_style": "path"}
    if os.environ.get("ACCESS_KEY") and os.environ.get("SECRET_KEY"):
        kw["aws_access_key_id"] = os.environ["ACCESS_KEY"]
        kw["aws_secret_access_key"] = os.environ["SECRET_KEY"]
    kw["config"] = Config(**cfg)
    return kw


async def upload_pdf(chave: str, pdf: bytes) -> str:
    def _put() -> None:
        boto3.client("s3", **kwargs_cliente()).put_object(
            Bucket=os.environ["BUCKET_NAME"], Key=chave, Body=pdf, ContentType="application/pdf",
        )

    await asyncio.to_thread(_put)
    return chave
