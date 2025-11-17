#!/bin/bash
set -e

# Set OLLAMA_HOST to bind to all interfaces on the specified port
if [ -n "${OLLAMA_PORT}" ]; then
    export OLLAMA_HOST="0.0.0.0:${OLLAMA_PORT}"
else
    export OLLAMA_HOST="0.0.0.0:11434"
fi

# Start Ollama server in the background
echo "Starting Ollama server on ${OLLAMA_HOST}..."
ollama serve &
OLLAMA_PID=$!

# Wait for server to be ready
echo "Waiting for Ollama server to start..."
RETRY_COUNT=0
MAX_RETRIES=10

until ollama list > /dev/null 2>&1; do
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "Error: Ollama server failed to start after ${MAX_RETRIES} retries"
        exit 1
    fi
    echo "Waiting for Ollama server to be ready... (attempt $((RETRY_COUNT + 1)))"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

echo "Ollama server is ready"

# Pull the model if specified
if [ -n "${OLLAMA_MODEL}" ]; then
    echo "Pulling model: ${OLLAMA_MODEL}"
    ollama pull ${OLLAMA_MODEL}
    echo "Model pulled successfully"
fi

# Keep the server running in foreground
echo "Ollama server is running..."
wait $OLLAMA_PID

