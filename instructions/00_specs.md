# QueueMincer MCP Server Specification

## System Overview
QueueMincer is a configurable MCP (Model Context Protocol) server for managing item queues. It provides tools for reading, writing, and manipulating queues with configurable naming, visibility, and parameter exposure for different agent types.

## Configuration Structure
The configuration consists of two main sections:
- `tools`: Defines available operations, naming, visibility, and parameter exposure
- `queue`: Defines data source, storage behavior, and item structure

## JSON Schema Definitions

### Root Configuration Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "QueueMincer Configuration",
  "type": "object",
  "properties": {
    "tools": { "$ref": "#/definitions/toolsConfig" },
    "queue": { "$ref": "#/definitions/queueConfig" }
  },
  "required": ["tools", "queue"],
  "additionalProperties": false,
  "definitions": {
    "toolsConfig": {
      "type": "object",
      "properties": {
        "get": { "$ref": "#/definitions/getTool" },
        "push": { "$ref": "#/definitions/pushTool" },
        "load": { "$ref": "#/definitions/loadTool" }
      },
      "additionalProperties": false
    },
    "getTool": {
      "type": "object",
      "properties": {
        "alias": { "type": "string" },
        "visible": { "type": "boolean" },
        "directionExposed": { "type": "boolean" },
        "default": { 
          "type": "string", 
          "enum": ["front", "back"] 
        },
        "description": { "type": "string" }
      },
      "additionalProperties": false
    },
    "pushTool": {
      "type": "object",
      "properties": {
        "alias": { "type": "string" },
        "visible": { "type": "boolean" },
        "directionExposed": { "type": "boolean" },
        "default": { 
          "type": "string", 
          "enum": ["front", "back"] 
        },
        "description": { "type": "string" }
      },
      "additionalProperties": false
    },
    "loadTool": {
      "type": "object",
      "properties": {
        "alias": { "type": "string" },
        "visible": { "type": "boolean" },
        "actionExposed": { "type": "boolean" },
        "templateIdExposed": { "type": "boolean" },
        "default": { 
          "type": "string", 
          "enum": ["replace", "front", "back"] 
        },
        "description": { "type": "string" }
      },
      "additionalProperties": false
    },
    "queueConfig": {
      "type": "object",
      "properties": {
        "inMemory": {
          "type": "boolean",
          "description": "Whether to load an in-memory copy at startup"
        },
        "loader": {
          "type": "string",
          "enum": ["json", "csv", "googleSheet", "memory"],
          "description": "Which data source to use"
        },
        "put": {
          "type": "boolean",
          "description": "Only allowed when loader=memory - allows adding items"
        },
        "itemTemplate": {
          "type": "object",
          "description": "Structure of the item for put operations, if not automatically derived"
        }
      },
      "required": ["loader"],
      "allOf": [
        {
          "if": {
            "properties": { "loader": { "const": "memory" } }
          },
          "then": {
            "required": ["put"],
            "properties": {
              "put": { "const": true }
            }
          }
        }
      ],
      "additionalProperties": false
    }
  }
}
```

## Tools Specification

### `get` Tool
- Purpose: Retrieves the next item from the queue
- Configuration:
  - `alias`: Optional name override (e.g., "readTodo")
  - `visible`: Whether this tool is exposed to agents (default: true)
  - `directionExposed`: Whether direction parameter (front/back) is exposed (default: false)
  - `default`: Default direction to read from ("front" or "back")
  - `description`: Optional custom description

### `push` Tool
- Purpose: Adds an item to the queue
- Configuration:
  - `alias`: Optional name override (e.g., "writeTodo")
  - `visible`: Whether this tool is exposed to agents (default: true)
  - `directionExposed`: Whether direction parameter (front/back) is exposed (default: true)
  - `default`: Default direction ("front" or "back")
  - `description`: Optional custom description

### `load` Tool
- Purpose: Loads or replaces queue items from a template source
- Configuration:
  - `alias`: Optional name override (e.g., "reload")
  - `visible`: Whether this tool is exposed to agents (default: true)
  - `actionExposed`: Whether the action parameter is exposed (default: false)
  - `templateIdExposed`: Whether template ID parameter is exposed (default: true)
  - `default`: Default action ("replace", "front", "back")
  - `description`: Optional custom description

## Queue Specification

### General Configuration
- `inMemory`: Boolean indicating whether to maintain in-memory copy (default: false)
- `loader`: Data source type ("json", "csv", "googleSheet", "memory")
- `put`: Must be true for memory loader type
- `itemTemplate`: Object describing item structure (optional, derived from source if not provided)

### Loader Behavior

#### JSON Loader
- Loads items from a JSON file
- file must contain an array of objects
- Template ID for `load` tool refers to filename without extension

#### CSV Loader
- Loads items from a CSV file
- First row must contain headers
- Template ID for `load` tool refers to filename without extension

#### Google Sheet Loader
- Loads items from a Google Sheet
- First row must contain headers
- Template ID for `load` tool refers to sheet/tab name

#### Memory Loader
- Maintains queue only in memory
- `put` must be true
- `itemTemplate` defines the expected item structure
- Template ID for `load` tool is ignored; resets to initial state

## Tool Parameters

### `get` Tool Parameters
- `direction`: (Optional, if directionExposed=true) "front" or "back"

### `push` Tool Parameters
- `item`: The item to add (matching itemTemplate if specified)
- `direction`: (Optional, if directionExposed=true) "front" or "back"

### `load` Tool Parameters
- `templateId`: (Optional, if templateIdExposed=true) ID of template to load
- `action`: (Optional, if actionExposed=true) "replace", "front", or "back"

## Error Handling
- Configuration validation errors should occur at startup
- Runtime errors should return appropriate error messages through the MCP protocol
- Missing required parameters should return descriptive error messages

## Implementation Notes
- Follow MCP protocol for tool definition and response formats
- Use strict schema validation for configuration
- Implement appropriate logging for debugging
- For in-memory queues, maintain state between calls

## Complete Example Configuration

```json
{
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
  },
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
}
```