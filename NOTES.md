# Code Review Notes - TRD Blinkenlights

## Project Overview
- SvelteKit application for real-time monitoring system
- Uses MQTT for data streaming
- Server-Sent Events (SSE) for client updates
- Tailwind CSS for styling
- Dark mode support

## Architecture

### Data Flow
1. MQTT client subscribes to topics (tr-mqtt/main/#)
2. Server maintains state using Svelte's reactive stores
3. SSE endpoint notifies clients of updates
4. Components reactively update based on store changes

### Key Components
- SystemOverview: Dashboard with uPlot charts
- ActiveCalls: Real-time call monitoring
- Recorders: Recording device status
- StatusDots: Quick status indicators
- ThemeToggle: Dark/light mode switch

## Areas Needing Attention

### Security
1. MQTT Connection
   - Hardcoded localhost URL
   - No authentication
   - No TLS/SSL
   - No message validation

2. SSE Endpoint
   - No rate limiting
   - No authentication
   - Potential DoS vector

### Performance
1. Memory Management
   - uPlot charts not properly cleaned up
   - SSE connections may leak
   - Large arrays rebuilt frequently

2. State Management
   - Inconsistent use of derived stores
   - Redundant calculations
   - No pagination for large lists

### Code Quality
1. Error Handling
   - Missing error boundaries
   - MQTT reconnection logic needed
   - No retry mechanisms
   - Incomplete error states in UI

2. Loading States
   - Initial data fetch not handled
   - No loading indicators
   - No skeleton UI

3. Duplicate Code
   - Status badge styles repeated
   - Common formatting functions duplicated
   - Similar component structures

## Technical Debt

### Immediate Concerns
1. MQTT Connection Resilience
   - Add reconnection logic
   - Implement backoff strategy
   - Add connection status monitoring

2. Error Handling
   - Implement error boundaries
   - Add error states to components
   - Improve error messaging

3. Loading States
   - Add loading indicators
   - Implement skeleton UI
   - Handle initial data fetch

### Future Improvements
1. Performance
   - Virtual scrolling for lists
   - Pagination for finished calls
   - Optimize chart updates
   - Memoize calculations

2. Security
   - Move MQTT config to env vars
   - Add authentication
   - Implement rate limiting
   - Add message validation

3. Code Organization
   - Create shared components
   - Extract utility functions
   - Standardize error handling
   - Add TypeScript interfaces

4. Testing
   - Unit tests for state management
   - Component testing
   - E2E testing
   - Performance testing

## Best Practices to Implement

### State Management
```javascript
// Use derived stores consistently
const activeCalls = $derived(
    data.calls
        .filter(call => !call.finished)
        .sort((a, b) => b.startTime - a.startTime)
);
```

### Error Handling
```javascript
// Add error boundaries
<ErrorBoundary>
    <SystemOverview {data} />
</ErrorBoundary>
```

### Loading States
```javascript
// Add loading indicators
{#if loading}
    <LoadingSpinner />
{:else}
    <ComponentContent />
{/if}
```

### MQTT Connection
```javascript
// Add reconnection logic
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

client.on('close', () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(() => {
            reconnectAttempts++;
            client.reconnect();
        }, 1000 * Math.pow(2, reconnectAttempts));
    }
});
```

## Component Structure
Each component should follow this pattern:
1. Props/state declaration
2. Derived calculations
3. Event handlers
4. Lifecycle hooks
5. Template with error/loading states

## Future Considerations
1. Monitoring
   - Add performance monitoring
   - Track error rates
   - Monitor MQTT connection health
   - Track component render times

2. Scalability
   - Consider message batching
   - Implement data pruning
   - Add data archiving strategy
   - Consider WebSocket alternative

3. User Experience
   - Add error recovery flows
   - Improve loading states
   - Add offline support
   - Implement retry mechanisms

4. Documentation
   - Add component documentation
   - Document state management
   - Add setup instructions
   - Document error codes

## Maintenance Tasks
- Regular dependency updates
- Performance monitoring
- Error log review
- Code cleanup
- Testing coverage review
