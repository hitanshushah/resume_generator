FROM ubuntu:22.04

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y curl git python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama CLI
RUN curl -fsSL https://ollama.com/install.sh | sh

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV OLLAMA_PORT=${OLLAMA_PORT}
ENV OLLAMA_MODEL=${OLLAMA_MODEL}
EXPOSE ${OLLAMA_PORT}

# Use entrypoint script
CMD ["/app/entrypoint.sh"]
