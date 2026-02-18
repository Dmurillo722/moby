FROM ghcr.io/astral-sh/uv:debian-slim 

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml uv.lock /app

RUN uv sync --locked

COPY . /app

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--log-level", "info", "--reload", "--host", "0.0.0.0", "--port", "8000"]