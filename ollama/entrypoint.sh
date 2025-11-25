#!/bin/bash
set -e

# Set OLLAMA_HOST to bind to all interfaces on the specified port
if [ -n "${OLLAMA_PORT}" ]; then
    export OLLAMA_HOST="0.0.0.0:${OLLAMA_PORT}"
    OLLAMA_API_URL="http://localhost:${OLLAMA_PORT}"
else
    export OLLAMA_HOST="0.0.0.0:11434"
    OLLAMA_API_URL="http://localhost:11434"
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
    
    echo "Warming up Ollama runner with dummy prompt..."
    WARMUP_RETRY=0
    MAX_WARMUP_RETRIES=10
    
    sleep 2
    
    WARMUP_SUCCESS=false
    while [ $WARMUP_RETRY -lt $MAX_WARMUP_RETRIES ]; do
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${OLLAMA_API_URL}/api/generate" \
            -H "Content-Type: application/json" \
            -d "{
                \"model\": \"${OLLAMA_MODEL}\",
                \"prompt\": \"I am going to send job descriptions. Format according to the instructions provided.\",
                \"stream\": false
            }" 2>&1)
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        
        if [ "$HTTP_CODE" = "200" ]; then
            WARMUP_SUCCESS=true
            echo "Ollama runner warmed up and ready!"
            break
        else
            echo "Waiting for runner to be ready for warmup... (attempt $((WARMUP_RETRY + 1))/${MAX_WARMUP_RETRIES})"
            sleep 3
            WARMUP_RETRY=$((WARMUP_RETRY + 1))
        fi
    done
    
    if [ "$WARMUP_SUCCESS" = false ]; then
        echo "Warning: Failed to warm up runner after ${MAX_WARMUP_RETRIES} retries, but continuing..."
        echo "Note: First request may take longer to start the runner"
    fi
fi

# Keep the server running in foreground
echo "Ollama server is running and ready to accept requests..."
wait $OLLAMA_PID

