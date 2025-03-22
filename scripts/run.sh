#!/bin/bash

# Default configuration file
CONFIG_FILE="config.json"

# Check if a configuration file is provided
if [ "$1" != "" ]; then
    CONFIG_FILE="$1"
fi

# Build the project
echo "Building project..."
npm run build

# Run the application with the specified configuration
echo "Starting QueueMincer with configuration: $CONFIG_FILE"
npm start -- "$CONFIG_FILE" 