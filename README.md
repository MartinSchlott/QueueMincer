# QueueMincer

QueueMincer is a configurable MCP (Model Context Protocol) server for managing item queues. It provides tools for reading, writing, and manipulating queues with configurable naming, visibility, and parameter exposure for different agent types.

## Features

- Configure custom tools with different names and parameters exposed
- Support for different data sources (memory, JSON files, CSV files, Google Sheets)
- Dynamic queue operations (get, push, load from templates)
- Flexible configuration options for tools and queue behavior

## Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/queuemincer.git
cd queuemincer

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

1. Create a configuration file (see `config.json` for an example)
2. Start the server:

```bash
# Using the default config.json in the current directory
npm start

# Or specify a custom configuration file
npm start -- /path/to/config.json
```

## Configuration

QueueMincer is configured using a JSON file with two main sections:

### Tools Configuration

Configures how tools are exposed to the AI assistant:

```json
"tools": {
  "get": {
    "alias": "readTodo",
    "visible": true,
    "directionExposed": false,
    "default": "front",
    "description": "Get the next task from the queue"
  },
  "push": {
    "alias": "writeTodo",
    "visible": true,
    "directionExposed": true,
    "default": "back",
    "description": "Add a new task to the queue"
  },
  "load": {
    "alias": "resetTasks",
    "visible": true,
    "templateIdExposed": true,
    "actionExposed": true,
    "default": "replace",
    "description": "Load tasks from template"
  }
}
```

### Queue Configuration

Configures the data source and item structure:

```json
"queue": {
  "loader": "memory",
  "inMemory": true,
  "put": true,
  "itemTemplate": {
    "task": "string",
    "done": "boolean",
    "due": "string",
    "priority": "number"
  }
}
```

## Data Sources

QueueMincer supports several data sources:

- **Memory**: In-memory queue with no persistence
- **JSON**: Load items from JSON files
- **CSV**: Load items from CSV files
- **Google Sheets**: Load items from Google Sheets

## Development

```bash
# Run in development mode with auto-reloading
npm run dev
```

## License

ISC 