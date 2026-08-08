FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY *.py .
ENV CACHE_HOST=0.0.0.0
ENV CACHE_PORT=8787
ENV CACHE_DATA_DIR=/data
EXPOSE 8787
VOLUME ["/data"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8787"]
