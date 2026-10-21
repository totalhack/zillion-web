FROM tiangolo/uvicorn-gunicorn-fastapi:python3.11-slim-2026-05-04

WORKDIR /app/

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN sed -i \
    -e 's|^mozilla/emSign_ECC_Root_CA_-_G3.crt|!&|' \
    -e 's|^mozilla/Comodo_AAA_Services_root.crt|!&|' \
    /etc/ca-certificates.conf \
    && update-ca-certificates --fresh

RUN python -m pip install --cert /etc/ssl/certs/ca-certificates.crt --upgrade "pip==26.2.2" "certifi==2026.10.19"

# Install Poetry
RUN python -m venv /opt/poetry/venv && \
    python -m pip --python /opt/poetry/venv/bin/python install --upgrade "pip==26.2.2" "certifi==2026.10.19" poetry && \
    cd /usr/local/bin && \
    ln -s /opt/poetry/venv/bin/poetry && \
    poetry config virtualenvs.create false

# Copy poetry.lock* in case it doesn't exist in the repo
COPY ./app/pyproject.toml ./app/poetry.lock* /app/

# Allow installing dev dependencies to run tests
ARG INSTALL_DEV=false
RUN bash -c "if [ $INSTALL_DEV == 'true' ] ; then poetry install --no-root ; else poetry install --no-root --only main ; fi"

COPY ./app /app

ENV PYTHONPATH=/app
