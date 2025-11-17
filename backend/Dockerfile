FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh



ARG BACKEND_PORT
ENV BACKEND_PORT=${BACKEND_PORT}

# Expose dynamic port
EXPOSE ${BACKEND_PORT}

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Run gunicorn
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${BACKEND_PORT} --workers 3 resume_generator.wsgi:application"]
