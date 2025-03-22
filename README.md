# QueueMincer

A configurable MCP (Model Context Protocol) server for managing flexible item queues with dynamic tool configurations.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

QueueMincer provides a customizable queue management system available through the Anthropic Model Context Protocol (MCP). It allows different AI agents to interact with the same queue infrastructure using agent-specific terminology and access controls.

## Motivation

When working with multiple AI agents in a workflow, each may have different requirements for how they access and manipulate queues:
- Some agents need read-only access
- Others need write-only access
- Some might use task-specific terminology ("readTodo" vs "getNextTask")
- Different queue storage backends may be required

QueueMincer solves these challenges by providing:
- Configurable tool names and visibility
- Multiple storage backends (JSON, CSV, Google Sheets, memory)
- Parameter exposure control
- Flexible item schema validation

## An AI-Assisted Project

QueueMincer was developed through human-AI collaboration:

- Initial specifications were drafted with ChatGPT-4o
- Specifications were refined and improved with Claude 3.7 Sonnet
- Implementation was done by Claude 3.7 Max (taking approximately 10 minutes with 40 tool calls)
- Human direction provided by Martin Schlott

The project demonstrates effective development strategies:
- Creating all interfaces first before implementation
- Building a complete skeleton with stub implementations
- Iteratively implementing components
- Debugging was completed in approximately 1 hour
- Only one correction cycle was needed

## Key Features

### Dynamic Tool Configuration

- Tools can be renamed for different agent contexts (e.g., "get" → "readTodo")
- Visibility of each tool can be controlled
- Parameter exposure is configurable (e.g., whether direction is exposed)
- Default values can be specified

### Multiple Storage Options

- **JSON Files**: Queue items stored in JSON format
- **CSV Files**: Items in tabular format
- **Google Sheets**: Remote spreadsheet-based storage
- **Memory**: In-memory queue for testing and development

### Configurable Operation Modes

- **Get**: Read items from front/back of the queue
- **Push**: Add items to front/back of the queue
- **Load**: Reset/replace queue from templates

### Built-in Debug Support

- Inspector-based debugging even in stdio mode
- Configurable port and breakpoint settings
- Helpful for development in MCP environment

## Configuration

QueueMincer is configured via a JSON file with a structure like:

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
  },
  "debug": {
    "active": true,
    "port": 9229,
    "break": true
  }
}
```

## Example Usage

### Basic Memory Queue

```json
{
  "tools": {
    "get": {
      "alias": "getNextTask"
    },
    "push": {
      "alias": "addTask"
    }
  },
  "queue": {
    "loader": "memory",
    "inMemory": true,
    "put": true,
    "itemTemplate": {
      "task": "string",
      "priority": "number",
      "assignee": "string"
    }
  }
}
```

### JSON File Queue with Limited Access

```json
{
  "tools": {
    "get": {
      "visible": true
    },
    "push": {
      "visible": false
    },
    "load": {
      "alias": "reloadQueue",
      "visible": true,
      "templateIdExposed": true
    }
  },
  "queue": {
    "loader": "json",
    "inMemory": true
  }
}
```

## Development Notes

The implementation follows strict TypeScript coding guidelines with a focus on:

- Clear separation of concerns
- Interface-first development
- Modular components
- Defensive programming with validation
- Simplified error handling

The project structure separates configuration, loaders, tools, and queue management into distinct modules.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

*"QueueMincer: Flexible queue management for AI agent workflows, taming complexity through configuration."*