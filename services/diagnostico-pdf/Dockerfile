# bookworm explícito: "slim" puro aponta para o Debian 13, que o `playwright install --with-deps`
# (1.49.1) ainda não conhece.
FROM python:3.12-slim-bookworm
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install --with-deps chromium
COPY main.py render.py s3.py ./
COPY vendor ./vendor
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
