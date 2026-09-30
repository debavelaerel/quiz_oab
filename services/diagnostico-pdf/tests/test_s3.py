import s3


def test_configurado_so_precisa_do_bucket(monkeypatch):
    monkeypatch.delenv("BUCKET_NAME", raising=False)
    assert s3.configurado() is False
    monkeypatch.setenv("BUCKET_NAME", "b")
    assert s3.configurado() is True


def test_sem_chaves_usa_iam_role(monkeypatch):
    monkeypatch.setenv("BUCKET_NAME", "b")
    monkeypatch.delenv("ACCESS_KEY", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("S3_ENDPOINT", raising=False)
    kw = s3.kwargs_cliente()
    assert "aws_access_key_id" not in kw
    assert "endpoint_url" not in kw


def test_com_chaves_usa_as_chaves(monkeypatch):
    monkeypatch.setenv("BUCKET_NAME", "b")
    monkeypatch.setenv("ACCESS_KEY", "ak")
    monkeypatch.setenv("SECRET_KEY", "sk")
    kw = s3.kwargs_cliente()
    assert kw["aws_access_key_id"] == "ak"
    assert kw["aws_secret_access_key"] == "sk"


def test_endpoint_customizado_liga_path_style(monkeypatch):
    monkeypatch.setenv("BUCKET_NAME", "b")
    monkeypatch.setenv("S3_ENDPOINT", "http://minio:9000")
    kw = s3.kwargs_cliente()
    assert kw["endpoint_url"] == "http://minio:9000"
    assert kw["config"].s3["addressing_style"] == "path"
