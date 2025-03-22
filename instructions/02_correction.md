# QueueMincer Loader Fix Instructions

## Problem Statement

The current implementation has a critical flaw: The `inMemory` flag exists in the configuration but has no real effect on the loader behavior. Currently, all loaders only load data at initialization but do not write back to the source when the queue is modified.

The intended behavior is:
- When `inMemory: true` - Load the data at startup and manage only in memory
- When `inMemory: false` - Read/write directly from/to the source for each operation

## Current Implementation Issues

1. The `QueueManager` implementation:
   - Keeps all items in memory
   - Checks `inMemory` flag before rejecting operations, but never persists changes back to source
   - Has no mechanism to update the original data source

2. The `QueueLoader` interface:
   - Only has methods for reading (`getItems()`, `loadTemplate()`)
   - Missing methods for writing operations

3. All loader implementations:
   - Only implement read operations
   - No write operations to their respective storage backends

## Required Changes

### 1. Update `QueueLoader` Interface

Enhance the QueueLoader interface with methods for write operations:

- `saveItems`: Save a complete list of items to the source
- `addItem`: Add a single item to the source at specified position
- `removeItem`: Remove an item from the source at specified position

### 2. Update Loader Implementations

Each loader implementation needs new methods to handle write operations to their respective storage backends:

#### Memory Loader
- In-memory operations with an internal array
- No need for actual persistence

#### JSON Loader
- Read/write operations directly to JSON files
- Handle file operations for each queue modification

#### CSV Loader
- Read/write operations for CSV files
- Handle row operations and header management

#### Google Sheet Loader
- API operations for reading and writing sheets
- Row manipulation for sheet operations

### 3. Update Queue Manager

The QueueManager should:
- Check the `inMemory` flag for all operations
- When `inMemory` is true, continue with current behavior (manipulate in-memory array)
- When `inMemory` is false, delegate to the loader for direct source operations
- Convert synchronous operations to asynchronous where needed

### 4. Update Tool Implementations

Tool implementations need to:
- Handle asynchronous operations from the queue manager
- Properly await results when `inMemory` is false
- Return results with appropriate error handling

## Implementation Priority

1. First update the interface definitions
2. Update the simplest loader (memory loader) to implement the new methods
3. Implement JSON loader as it's the next simplest
4. Implement CSV loader
5. Implement Google Sheet loader (most complex)
6. Update the queue manager to use the appropriate loader methods based on inMemory flag
7. Update the tool implementations to work with async operations