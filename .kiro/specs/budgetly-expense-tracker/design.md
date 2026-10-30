# Design Document

## Overview

This document outlines the architecture and design of **Budgetly**, a mobile-friendly web application for tracking daily spending and visualizing expenses. The application is built using vanilla JavaScript, HTML, and CSS with Chart.js for visualizations, storing all data client-side using Local Storage.

## Architecture

Budgetly follows a **Model-View-Controller (MVC)** pattern adapted for a single-page vanilla JavaScript application:

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface (View)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Input Form  │  │Transaction  │  │      Pie Chart      │  │
│  │             │  │    List     │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │               │                    │               │
│         ▼               ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                Controller (Event Handlers)              │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │               │                    │               │
│         ▼               ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Model (Data Layer)                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │Transaction  │  │   Storage   │  │   Chart Data    │ │ │
│  │  │   Manager   │  │   Service   │  │   Generator     │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Client-Only Architecture**: No backend server; all data persists in browser's Local Storage
2. **Modular JavaScript**: Separation of concerns with distinct modules for data management, UI rendering, and chart handling
3. **Event-Driven Updates**: UI components react to data changes through a centralized update mechanism
4. **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with JS for better UX

## Components and Interfaces

### 1. Transaction Model
**Purpose**: Represents a single expense entry with validation logic.

**Structure**:
```javascript
{
  id: string,           // Unique identifier (timestamp + random)
  name: string,         // Item name (1-100 characters)
  amount: number,       // Positive number with 2 decimal places
  category: string,     // One of: 'Food', 'Transport', 'Fun' (or custom)
  timestamp: number     // Creation timestamp (milliseconds)
}
```

**Validation Rules**:
- `name`: Required, non-empty string, trimmed, max 100 characters
- `amount`: Required, positive number, parsed as float with 2 decimal precision
- `category`: Required, must be valid category (predefined or custom)

### 2. Transaction Manager
**Purpose**: Centralized service for CRUD operations on transactions.

**Methods**:
- `addTransaction(transaction)`: Validates and adds to collection
- `removeTransaction(id)`: Removes by ID
- `getAllTransactions()`: Returns all transactions
- `getTransactionsByCategory()`: Groups by category for chart data
- `getTotalBalance()`: Calculates sum of all amounts
- `clearAll()`: Removes all transactions (for testing/reset)

### 3. Storage Service
**Purpose**: Abstracts Local Storage interactions with error handling.

**Methods**:
- `saveTransactions(transactions)`: Serializes and saves to localStorage
- `loadTransactions()`: Deserializes from localStorage, returns array
- `clearStorage()`: Clears all Budgetly data from localStorage
- `isStorageAvailable()`: Checks if localStorage is accessible

### 4. UI Controller
**Purpose**: Handles DOM events and coordinates between model and view.

**Responsibilities**:
- Form submission handling with validation
- Delete button event delegation
- Chart initialization and updates
- Theme switching (dark/light mode)
- Sorting controls

### 5. Chart Manager
**Purpose**: Manages Chart.js instance and data updates.

**Methods**:
- `initializeChart(canvasElement)`: Creates pie chart with default config
- `updateChartData(transactions)`: Regenerates chart data from transactions
- `destroyChart()`: Cleanup for theme changes or reset
- `getChartConfig(theme)`: Returns chart configuration based on current theme

## Interfaces

### 1. User Interface Layout
```
┌─────────────────────────────────────────────────────────────┐
│                       Budgetly Header                        │
│  [Logo] Budgetly                      [Theme Toggle]        │
│  Total Balance: $XXX.XX                                     │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Transaction Input Form                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───┐  │
│  │ Item Name   │  │   Amount    │  │  Category   │  │Add│  │
│  │_____________│  │_____________│  │_____________│  │___│  │
│  │             │  │             │  │▼ Food       │  │   │  │
│  │             │  │             │  │  Transport  │  │   │  │
│  │             │  │             │  │  Fun        │  │   │  │
│  │             │  │             │  │  + Custom   │  │   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Spending Visualization                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      Pie Chart                        │  │
│  │                                                       │  │
│  │                                                       │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Transaction History                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [X] Groceries      $45.99     Food                   │  │
│  │  [X] Gas            $35.50     Transport              │  │
│  │  [X] Movie Tickets  $24.00     Fun                    │  │
│  │  [Sort by: Amount ▼] [Sort by: Category ▼]            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Data Flow
1. **User Input** → Form validation → Transaction creation
2. **Transaction added** → Model updated → Storage saved
3. **Model change** → UI update (balance, list, chart)
4. **Delete action** → Model updated → Storage saved → UI update
5. **Theme change** → CSS class toggle → Chart theme update

### 3. API Surface (Module Exports)
```javascript
// Main application module
const BudgetlyApp = {
  init: function() { /* Initialize all components */ },
  addTransaction: function(name, amount, category) { /* Public API */ },
  deleteTransaction: function(id) { /* Public API */ },
  toggleTheme: function() { /* Switch dark/light mode */ },
  sortTransactions: function(by, order) { /* Sort by field */ }
};

// For testing and debugging
window.Budgetly = BudgetlyApp;
```

## Data Models

### 1. Transaction Schema
```javascript
// Transaction object structure
{
  id: 'tx_1648753200000_abc123',  // Format: tx_<timestamp>_<random6>
  name: 'Groceries',
  amount: 45.99,                  // Stored as number, displayed with 2 decimals
  category: 'Food',               // Default categories or custom
  timestamp: 1648753200000        // Date.now() at creation
}

// Validation function
function isValidTransaction(tx) {
  return tx &&
    typeof tx.id === 'string' &&
    typeof tx.name === 'string' && tx.name.trim().length > 0 &&
    typeof tx.amount === 'number' && tx.amount > 0 &&
    typeof tx.category === 'string' && tx.category.trim().length > 0 &&
    typeof tx.timestamp === 'number';
}
```

### 2. Storage Schema
```javascript
// LocalStorage key structure
localStorage.setItem('budgetly_transactions', JSON.stringify([
  { /* transaction objects */ }
]));

localStorage.setItem('budgetly_settings', JSON.stringify({
  theme: 'light',                 // 'light' or 'dark'
  customCategories: ['Medical', 'Education', 'Shopping'],
  sortPreference: { by: 'timestamp', order: 'desc' }
}));
```

### 3. Chart Data Structure
```javascript
// Data format for Chart.js
const chartData = {
  labels: ['Food', 'Transport', 'Fun', 'Custom'],  // Category names
  datasets: [{
    data: [120.50, 85.75, 45.25, 30.00],          // Amounts per category
    backgroundColor: [
      '#7C3AED',  // Purple - Food
      '#8B5CF6',  // Lighter purple - Transport  
      '#A78BFA',  // Even lighter - Fun
      '#C4B5FD'   // Lightest - Custom categories
    ],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  }]
};
```

## Error Handling

### 1. Validation Errors
```javascript
// Form validation error types
const ValidationError = {
  EMPTY_NAME: 'Item name is required',
  EMPTY_AMOUNT: 'Amount is required',
  INVALID_AMOUNT: 'Amount must be a positive number',
  EMPTY_CATEGORY: 'Category is required',
  INVALID_CATEGORY: 'Category must be selected from the list'
};

// Validation function
function validateTransactionInput(name, amount, category) {
  const errors = [];
  
  if (!name || name.trim().length === 0) {
    errors.push(ValidationError.EMPTY_NAME);
  }
  
  if (!amount && amount !== 0) {
    errors.push(ValidationError.EMPTY_AMOUNT);
  } else if (isNaN(amount) || parseFloat(amount) <= 0) {
    errors.push(ValidationError.INVALID_AMOUNT);
  }
  
  if (!category) {
    errors.push(ValidationError.EMPTY_CATEGORY);
  }
  
  return errors;
}
```

### 2. Storage Errors
```javascript
// localStorage error handling
function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return { success: true };
  } catch (error) {
    console.error('Storage error:', error);
    
    // Handle specific storage errors
    if (error.name === 'QuotaExceededError') {
      return { 
        success: false, 
        error: 'Storage limit exceeded. Please delete some transactions.' 
      };
    }
    
    return { 
      success: false, 
      error: 'Failed to save data. Please try again.' 
    };
  }
}
```

### 3. Chart Errors
```javascript
// Chart.js error handling
function updateChart(transactions) {
  try {
    if (!window.Chart) {
      throw new Error('Chart.js library not loaded');
    }
    
    const chartData = generateChartData(transactions);
    chartInstance.data = chartData;
    chartInstance.update();
    
  } catch (error) {
    console.error('Chart update failed:', error);
    showNotification('Chart update failed. Please refresh the page.');
  }
}
```

### 4. User Feedback Mechanisms
- **Inline validation**: Red borders and error messages below invalid fields
- **Toast notifications**: Temporary success/error messages (3-second timeout)
- **Loading states**: Disabled buttons with spinners during async operations
- **Empty states**: Helpful messages when no transactions exist

## Performance Considerations

### 1. DOM Optimization
- **Debounced updates**: Chart updates debounced to 250ms to prevent rapid re-renders
- **Event delegation**: Single event listener on transaction list for delete buttons
- **Virtual scrolling**: For large transaction lists (beyond 100 items)
- **CSS containment**: Isolate expensive UI operations

### 2. Memory Management
- **Transaction limit**: Warning at 500 transactions, hard limit at 1000
- **Data cleanup**: Old transactions (beyond 1 year) suggested for archiving
- **Chart cleanup**: Proper destruction of Chart.js instance on page unload

### 3. Render Performance
```javascript
// Efficient UI updates
function updateUI(transactions) {
  // Batch DOM updates
  requestAnimationFrame(() => {
    updateBalance(transactions);
    updateTransactionList(transactions);
    debouncedUpdateChart(transactions);
  });
}

// Debounced chart updates
const debouncedUpdateChart = debounce((transactions) => {
  chartManager.updateChartData(transactions);
}, 250);
```

## Styling and Theme System

### 1. Design Tokens
```css
:root {
  /* Color Palette - Light Theme */
  --color-primary: #7C3AED;
  --color-primary-light: #8B5CF6;
  --color-primary-lighter: #A78BFA;
  --color-primary-lightest: #C4B5FD;
  
  --color-background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%);
  --color-surface: rgba(255, 255, 255, 0.8);
  --color-text: #1F2937;
  --color-text-secondary: #6B7280;
  
  /* Glassmorphism */
  --glass-background: rgba(255, 255, 255, 0.25);
  --glass-border: rgba(255, 255, 255, 0.18);
  --glass-shadow: 0 8px 32px rgba(124, 58, 237, 0.1);
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
}

[data-theme="dark"] {
  /* Color Palette - Dark Theme */
  --color-primary: #8B5CF6;
  --color-primary-light: #A78BFA;
  --color-primary-lighter: #C4B5FD;
  --color-primary-lightest: #DDD6FE;
  
  --color-background: linear-gradient(135deg, #1E1B2E 0%, #2D2640 100%);
  --color-surface: rgba(30, 27, 46, 0.8);
  --color-text: #F3F4F6;
  --color-text-secondary: #D1D5DB;
  
  /* Glassmorphism */
  --glass-background: rgba(30, 27, 46, 0.5);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### 2. Glassmorphism Implementation
```css
.glass-card {
  background: var(--glass-background);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
}

.glass-input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.glass-button {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Form Validation Consistency

*For any* combination of form field values, validation passes if and only if all fields (name, amount, category) contain valid, non-empty values.

**Validates: Requirements 1.2, 1.4**

### Property 2: Transaction Creation Integrity

*For any* valid transaction input, when submitted through the form, the transaction should appear in the transaction list with all data preserved exactly as entered.

**Validates: Requirements 1.3, 2.2**

### Property 3: Balance Calculation Correctness

*For any* set of transactions, the displayed total balance must equal the mathematical sum of all transaction amounts, and this equality must hold after every addition or deletion operation.

**Validates: Requirements 3.2, 3.3**

### Property 4: Data Persistence Round-Trip

*For any* set of transactions stored in the application, after a page refresh or browser restart, all transactions must be restored from Local Storage with identical values and ordering.

**Validates: Requirements 2.5, 5.3**

### Property 5: Chart Data Consistency

*For any* set of transactions, the pie chart data must accurately reflect the categorical distribution of amounts, with each category's slice proportional to its total amount relative to the overall sum.

**Validates: Requirements 4.2, 4.4**

### Property 6: Delete Operation Completeness

*For any* transaction in the list, when its delete button is clicked, that specific transaction must be removed from both the UI list and the underlying data model, while all other transactions remain unchanged.

**Validates: Requirements 2.4**

### Property 7: UI Responsiveness Guarantee

*For any* user interaction (form submission, delete action, theme toggle), the UI must update with visible feedback within 100 milliseconds, maintaining responsiveness across all supported browsers.

**Validates: Requirements 6.9**

### Property 8: Category Management Extensibility

*For any* custom category name that follows validation rules (non-empty, unique, reasonable length), the system must allow its creation and subsequent use in transactions, with the category appearing in both the dropdown and chart visualization.

**Validates: Requirements 7.1**

### Property 9: Sorting Invariance

*For any* list of transactions, sorting by amount (ascending/descending) must produce a total-preserving permutation where each element's position respects the numerical ordering, and sorting by category must group transactions by category while preserving relative order within each group.

**Validates: Requirements 7.2, 7.3**

### Property 10: Theme Switching Idempotence

*For any* application state, toggling between dark and light mode twice must return the application to its original visual theme with all UI elements maintaining their functional state and data integrity.

**Validates: Requirements 7.4, 7.5, 7.6**

## Testing Strategy

### 1. Test Categories

#### Unit Tests
- **Transaction validation**: Test all validation rules with various inputs
- **Balance calculation**: Verify sum calculations with edge cases (empty, single, multiple transactions)
- **Data transformations**: Test transaction sorting, filtering, and grouping logic
- **Storage operations**: Test localStorage serialization/deserialization

#### Property-Based Tests
- Execute the 10 correctness properties defined in this document
- Each property test runs minimum 100 iterations with random inputs
- Focus on universal properties that should hold for all valid inputs
- Use property testing libraries (fast-check, jsverify) if available

#### Integration Tests
- **Form submission flow**: End-to-end test of adding a transaction
- **Delete functionality**: Complete delete operation with UI updates
- **Theme switching**: Verify visual theme changes persist
- **Chart updates**: Test chart responds to data changes

#### Manual Testing
- **Cross-browser testing**: Chrome, Firefox, Edge, Safari
- **Mobile responsiveness**: Various screen sizes and orientations
- **Accessibility**: Keyboard navigation, screen reader compatibility
- **Performance**: Load times, UI responsiveness under heavy data

### 2. Test Environment
- **No test framework setup required** (as per requirements)
- **Manual verification** for visual and interactive aspects
- **Browser Developer Tools** for debugging and validation
- **LocalStorage inspection** to verify data persistence

### 3. Test Data
- **Valid transactions**: Random names, amounts, categories
- **Edge cases**: Empty strings, zero amounts, special characters
- **Large datasets**: 100+ transactions for performance testing
- **Invalid inputs**: Malformed data, missing fields, incorrect types

### 4. Success Criteria
- All 10 correctness properties pass with 100+ iterations each
- Core functionality works in all 4 target browsers
- UI updates within 100ms for all operations
- No data loss after page refresh
- Chart accurately reflects transaction data

## Implementation Notes

### 1. Browser Compatibility
- Use feature detection for CSS `backdrop-filter` with fallbacks
- Polyfill for older browsers that don't support certain CSS features
- Test Local Storage availability before attempting operations
- Chart.js includes built-in browser compatibility

### 2. Mobile-First Considerations
- Touch-friendly button sizes (minimum 44×44px)
- Responsive typography scaling
- Virtual keyboard awareness for input fields
- Swipe gestures for transaction deletion (optional enhancement)

### 3. Accessibility
- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- Sufficient color contrast ratios (WCAG AA compliance)
- Screen reader announcements for dynamic updates
- Focus management for modal interactions

### 4. Testing Strategy
- **Unit Tests**: Core logic (validation, calculations, data transformations)
- **Property Tests**: Universal properties defined in this document
- **Integration Tests**: Cross-component interactions and localStorage operations
- **Manual Testing**: Browser compatibility, touch interactions, visual design

## Deployment Configuration

### 1. File Structure
```
budgetly/
├── index.html          # Main HTML file
├── css/
│   └── style.css      # Single CSS file
├── js/
│   └── app.js         # Single JavaScript file
└── README.md          # Deployment instructions
```

### 2. GitHub Pages Setup
```yaml
# .github/workflows/deploy.yml (optional)
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: echo "No build step needed - static files only"
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

### 3. CDN Configuration
```html
<!-- In index.html -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<!-- Optional: Include specific Chart.js version for stability -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
```

## Risk Mitigation

### 1. Technical Risks
- **Local Storage limitations**: Implement data cleanup and user warnings
- **Chart.js loading failures**: Fallback to textual data representation
- **Browser feature support**: Progressive enhancement with feature detection
- **Performance degradation with large datasets**: Implement pagination/virtual scrolling

### 2. User Experience Risks
- **Data loss**: Implement export/import functionality as enhancement
- **Confusing UI**: User testing with clear error messages and guidance
- **Mobile usability**: Thorough testing on various device sizes and orientations

### 3. Maintenance Risks
- **Chart.js version updates**: Pin to specific CDN version
- **Browser API changes**: Regular compatibility testing
- **Code complexity**: Maintain modular architecture with clear separation of concerns

## Conclusion

This design provides a comprehensive blueprint for implementing Budgetly as a mobile-friendly expense tracking web application. The architecture emphasizes simplicity, performance, and maintainability while adhering to the specified technical constraints. The property-based testing approach outlined in the correctness properties section will help ensure robust, reliable implementation that meets all functional requirements.