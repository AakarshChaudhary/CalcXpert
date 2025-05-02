document.addEventListener("DOMContentLoaded", function () {
    // Enable passive event listeners for better touch performance on Android
    const passiveSupported = false;
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get: function() { passiveSupported = true; return true; }
      });
      window.addEventListener("test", null, opts);
      window.removeEventListener("test", null, opts);
    } catch(err) {}
    
    // Event options for performance optimization
    const eventOptions = passiveSupported ? { passive: true } : false;
    
    // Calculator state with mobile optimization additions for Samsung M52
    const state = {
      displayValue: "0",
      pendingValues: [],
      pendingOperators: [],
      equationDisplay: "",
      waitingForOperand: false,
      clearOnNextInput: false,
      isDarkMode: true,
      history: [],
      showHistory: false,
      touchActive: false,      // Track touch states for avoiding duplicate events
      lastFrameTime: 0,        // Track frame timing for smoother animations
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isAndroid: /Android/i.test(navigator.userAgent),
    };
  
    // DOM Elements
    const expression = document.getElementById("expression");
    const result = document.getElementById("result");
    const themeToggle = document.getElementById("themeToggle");
    const historyToggle = document.getElementById("historyToggle");
    const historyPanel = document.getElementById("historyPanel");
    const historyList = document.getElementById("historyList");
    const clearHistory = document.getElementById("clearHistory");
    const closeHistory = document.getElementById("closeHistory");
    const numberButtons = document.querySelectorAll("[data-number]");
    const operationButtons = document.querySelectorAll("[data-operation]");
    const functionButtons = document.querySelectorAll("[data-action]");
  
    // Operation symbols for display
    const operationSymbols = {
      add: "+",
      subtract: "−",
      multiply: "×",
      divide: "÷",
    };
  
    // Initialize calculator
    init();
  
    // Initialize function
    function init() {
      // Add event listeners to number buttons with touch detection optimization for Samsung M52
      numberButtons.forEach((button) => {
        // Use requestAnimationFrame for smoother rendering
        const handleButtonPress = (e) => {
          // Track touch/click state
          if (e.type === 'touchstart') {
            state.touchActive = true;
          }
          
          // Avoid duplicate triggering when both touch and click fire
          if (e.type === 'click' && state.touchActive) {
            state.touchActive = false;
            return;
          }
          
          requestAnimationFrame(() => {
            animateButtonPress(button);
            const number = button.dataset.number;
            inputDigit(number);
          });
        };
        
        // Add both click and touch events for comprehensive support
        button.addEventListener("click", handleButtonPress);
        button.addEventListener("touchstart", handleButtonPress, eventOptions);
      });
  
      // Add event listeners to operation buttons with touch optimization
      operationButtons.forEach((button) => {
        const handleOperationPress = (e) => {
          // Track touch/click state to prevent duplicate firing
          if (e.type === 'touchstart') {
            state.touchActive = true;
          }
          
          // Avoid duplicate triggering when both touch and click fire
          if (e.type === 'click' && state.touchActive) {
            state.touchActive = false;
            return;
          }
          
          requestAnimationFrame(() => {
            animateButtonPress(button);
            const operation = button.dataset.operation;
            inputOperator(operation);
          });
        };
        
        button.addEventListener("click", handleOperationPress);
        button.addEventListener("touchstart", handleOperationPress, eventOptions);
      });
  
      // Add event listeners to function buttons with Samsung M52 touch optimization
      functionButtons.forEach((button) => {
        const handleFunctionPress = (e) => {
          // Track touch/click state
          if (e.type === 'touchstart') {
            state.touchActive = true;
          }
          
          // Avoid duplicate triggering when both touch and click fire
          if (e.type === 'click' && state.touchActive) {
            state.touchActive = false;
            return;
          }
          
          requestAnimationFrame(() => {
            animateButtonPress(button);
            const action = button.dataset.action;
            
            switch (action) {
              case "clear":
                clearCalculator();
                break;
              case "toggle-sign":
                toggleSign();
                break;
              case "percent":
                percentOperation();
                break;
              case "decimal":
                inputDecimal();
                break;
              case "backspace":
                backspace();
                break;
              case "calculate":
                evaluateExpression();
                // Add special animation for equals button
                button.classList.add("equals-pressed");
                setTimeout(() => {
                  button.classList.remove("equals-pressed");
                }, 300);
                break;
              default:
                break;
            }
          });
        };
        
        button.addEventListener("click", handleFunctionPress);
        button.addEventListener("touchstart", handleFunctionPress, eventOptions);
      });
  
      // Theme toggle event listener with touch optimization
      const handleThemeToggle = (e) => {
        if (e.type === 'touchstart') {
          state.touchActive = true;
        }
        
        if (e.type === 'click' && state.touchActive) {
          state.touchActive = false;
          return;
        }
        
        requestAnimationFrame(() => {
          toggleTheme();
        });
      };
      
      themeToggle.addEventListener("click", handleThemeToggle);
      themeToggle.addEventListener("touchstart", handleThemeToggle, eventOptions);
  
      // History panel listeners with optimized touch events for Samsung M52
      const handleHistoryToggle = (e) => {
        if (e.type === 'touchstart') {
          state.touchActive = true;
        }
        
        if (e.type === 'click' && state.touchActive) {
          state.touchActive = false;
          return;
        }
        
        requestAnimationFrame(() => {
          toggleHistoryPanel();
        });
      };
      
      const handleClearHistory = (e) => {
        if (e.type === 'touchstart') {
          state.touchActive = true;
        }
        
        if (e.type === 'click' && state.touchActive) {
          state.touchActive = false;
          return;
        }
        
        requestAnimationFrame(() => {
          clearHistoryList();
        });
      };
      
      historyToggle.addEventListener("click", handleHistoryToggle);
      historyToggle.addEventListener("touchstart", handleHistoryToggle, eventOptions);
      closeHistory.addEventListener("click", handleHistoryToggle);
      closeHistory.addEventListener("touchstart", handleHistoryToggle, eventOptions);
      clearHistory.addEventListener("click", handleClearHistory);
      clearHistory.addEventListener("touchstart", handleClearHistory, eventOptions);
  
      // Load history from localStorage if available
      loadHistory();
  
      // Keyboard support with passive option for better performance
      document.addEventListener("keydown", handleKeyboardInput, eventOptions);
  
      // Initialize display
      updateDisplay();
    }
  
    // Format numbers with commas
    function formatNumber(num) {
      if (num === "") return "";
  
      // Check if it's an error message
      if (typeof num === "string" && (num === "Error" || num === "Infinity")) {
        return num;
      }
  
      // Handle negative numbers
      const isNegative = parseFloat(num) < 0;
      let absNum = isNegative ? num.toString().slice(1) : num.toString();
  
      // Split number at decimal point
      const parts = absNum.split(".");
  
      // Add commas to the integer part
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
      // Join with decimal part if it exists
      absNum = parts.join(".");
  
      // Add negative sign back if needed
      return isNegative ? "-" + absNum : absNum;
    }
  
    // Update the display
    function updateDisplay() {
      // Use a fade-in animation for new results by first removing text
      // Then adding it with animation after a brief delay
      const currentText = result.textContent;
      const newText = formatNumber(state.displayValue);
  
      if (currentText !== newText) {
        // Create temporary element for smooth animation
        const oldResult = document.createElement("div");
        oldResult.classList.add("result", "old-result");
        oldResult.textContent = currentText;
  
        // Position over the current result
        oldResult.style.position = "absolute";
        oldResult.style.top = `${result.offsetTop}px`;
        oldResult.style.right = `${result.offsetRight}px`;
        oldResult.style.width = "100%";
        oldResult.style.textAlign = "right";
  
        // Use requestAnimationFrame for smoother animation on mobile
      requestAnimationFrame(() => {
        document.querySelector(".calculator-display").appendChild(oldResult);
      });
  
        // Apply fade out animation to old result
        oldResult.style.animation = "fade-out-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards";
  
        // Determine if this is a calculation result (equals button was pressed)
        const isCalculationResult = state.clearOnNextInput && 
                                   state.pendingValues.length === 0 && 
                                   state.pendingOperators.length === 0;
  
        // Delay updating the actual result for smooth transition
        setTimeout(() => {
          // Apply the new-result animation class if this is a calculation result
          if (isCalculationResult) {
            result.classList.add("new-result");
  
            // Highlight the calculator display
            document.querySelector(".calculator-display").classList.add("highlight-result");
  
            // Remove classes after animation completes
            setTimeout(() => {
              result.classList.remove("new-result");
              document.querySelector(".calculator-display").classList.remove("highlight-result");
            }, 800);
          }
  
          result.textContent = newText;
          // Remove old result after animation
          oldResult.remove();
        }, 200);
      } else {
        result.textContent = newText;
      }
  
      // Need to use innerHTML since operator highlights use HTML spans
      expression.innerHTML = state.equationDisplay;
    }
  
    // Add button press animation - optimized for smooth Android performance
    function animateButtonPress(button) {
      // Don't run animations if there was a recent frame - helps reduce lag on rapid taps
      const now = performance.now();
      if (now - state.lastFrameTime < 16) { // Skip if less than one frame (~16ms) has passed
        return;
      }
      state.lastFrameTime = now;
      
      // Check if it's light mode
      const isLightMode = document.body.classList.contains('light-mode');
  
      // Check if it's an operator, clear, or backspace button to apply special animations
      if (button.classList.contains('operation')) {
        // Apply the specialized operator animation based on theme
        if (isLightMode) {
          button.style.animation = "light-operator-press 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, operator-glow 2s infinite 0.4s";
        } else {
          button.style.animation = "operator-press 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, operator-glow 2s infinite 0.4s";
        }
  
        // Use a single reusable ripple element to avoid DOM thrashing
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.top = '0';
        ripple.style.left = '0';
        ripple.style.width = '100%';
        ripple.style.height = '100%';
        ripple.style.borderRadius = '16px';
        ripple.style.background = isLightMode 
          ? 'radial-gradient(circle at center, rgba(33, 150, 243, 0.8), transparent 70%)'
          : 'radial-gradient(circle at center, rgba(75, 94, 252, 0.8), transparent 70%)';
        ripple.style.opacity = '0';
        ripple.style.zIndex = '1';
        ripple.style.pointerEvents = 'none';
        ripple.style.animation = 'ripple 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
        // Use requestAnimationFrame for smoother animations on Android
        requestAnimationFrame(() => {
          button.appendChild(ripple);
        });
  
        // Remove ripple element after animation completes
        setTimeout(() => {
          ripple.remove();
          button.style.animation = "operator-glow 2s infinite";
        }, 600);
      } else if (button.getAttribute('data-action') === 'clear' || button.getAttribute('data-action') === 'backspace') {
        // Apply the specialized danger button animation
        if (isLightMode) {
          button.style.animation = "light-danger-press 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, danger-glow 2s infinite 0.4s";
        } else {
          button.style.animation = "danger-press 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, danger-glow 2s infinite 0.4s";
        }
  
        // Create ripple effect for danger buttons with better Android performance
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.top = '0';
        ripple.style.left = '0';
        ripple.style.width = '100%';
        ripple.style.height = '100%';
        ripple.style.borderRadius = '16px';
        ripple.style.background = isLightMode
          ? 'radial-gradient(circle at center, rgba(244, 67, 54, 0.6), transparent 70%)'
          : 'radial-gradient(circle at center, rgba(255, 82, 82, 0.8), transparent 70%)';
        ripple.style.opacity = '0';
        ripple.style.zIndex = '1';
        ripple.style.pointerEvents = 'none';
        ripple.style.animation = 'ripple 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
        // Use requestAnimationFrame for smoother animations on Android
        requestAnimationFrame(() => {
          button.appendChild(ripple);
        });
  
        // Remove ripple element after animation completes
        setTimeout(() => {
          ripple.remove();
          button.style.animation = "danger-glow 2s infinite";
        }, 600);
      } else if (button.classList.contains('equals')) {
        // Special equals button animation
        button.classList.add("equals-pressed");
  
        // Add an extra shine effect in light mode
        if (isLightMode) {
          const shine = document.createElement('div');
          shine.style.position = 'absolute';
          shine.style.top = '0';
          shine.style.left = '0';
          shine.style.width = '100%';
          shine.style.height = '100%';
          shine.style.borderRadius = '16px';
          shine.style.background = 'radial-gradient(circle at center, rgba(33, 150, 243, 0.8), transparent 70%)';
          shine.style.opacity = '0';
          shine.style.zIndex = '1';
          shine.style.pointerEvents = 'none';
          shine.style.animation = 'ripple 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
          // Avoid button jank on Android with requestAnimationFrame
          requestAnimationFrame(() => {
            button.appendChild(shine);
          });
  
          // Remove shine element after animation completes
          setTimeout(() => {
            shine.remove();
          }, 800);
        }
  
        setTimeout(() => {
          button.classList.remove("equals-pressed");
        }, 600);
      } else {
        // Default button animation for numbers and other buttons
        if (isLightMode) {
          // Use the light mode specific animation
          button.classList.add("button-pressed");
  
          // Add a subtle light effect
          const lightEffect = document.createElement('div');
          lightEffect.style.position = 'absolute';
          lightEffect.style.top = '0';
          lightEffect.style.left = '0';
          lightEffect.style.width = '100%';
          lightEffect.style.height = '100%';
          lightEffect.style.borderRadius = '16px';
          lightEffect.style.background = 'radial-gradient(circle at center, rgba(255, 255, 255, 0.8), transparent 70%)';
          lightEffect.style.opacity = '0';
          lightEffect.style.zIndex = '1';
          lightEffect.style.pointerEvents = 'none';
          lightEffect.style.animation = 'ripple 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
          // Use requestAnimationFrame for smoother rendering on Samsung M52
          requestAnimationFrame(() => {
            button.appendChild(lightEffect);
          });
  
          // Remove light effect after animation completes
          setTimeout(() => {
            lightEffect.remove();
            button.classList.remove("button-pressed");
          }, 300);
        } else {
          // Dark mode animation
          button.classList.add("button-pressed");
          setTimeout(() => {
            button.classList.remove("button-pressed");
          }, 300);
        }
      }
    }
  
    // Input digit
    function inputDigit(digit) {
      if (state.clearOnNextInput) {
        state.displayValue = digit;
        state.equationDisplay = "";
        state.clearOnNextInput = false;
      } else if (state.waitingForOperand) {
        state.displayValue = digit;
        state.waitingForOperand = false;
      } else {
        state.displayValue =
          state.displayValue === "0" ? digit : state.displayValue + digit;
      }
      updateExpressionString();
      updateDisplay();
    }
  
    // Input decimal point
    function inputDecimal() {
      if (state.clearOnNextInput) {
        state.displayValue = "0.";
        state.equationDisplay = "";
        state.clearOnNextInput = false;
      } else if (state.waitingForOperand) {
        state.displayValue = "0.";
        state.waitingForOperand = false;
      } else if (!state.displayValue.includes(".")) {
        state.displayValue += ".";
      }
      updateExpressionString();
      updateDisplay();
    }
  
    // Input operator
    function inputOperator(operator) {
      const currentValue = parseFloat(state.displayValue);
  
      if (state.clearOnNextInput) {
        // If we have a result from previous calculation
        state.pendingValues = [parseFloat(state.displayValue)];
        state.pendingOperators = [operator];
        state.waitingForOperand = true;
        state.clearOnNextInput = false;
      } else if (state.waitingForOperand && state.pendingOperators.length > 0) {
        // Replace the last operator
        state.pendingOperators[state.pendingOperators.length - 1] = operator;
      } else {
        // Add the current value and operator
        state.pendingValues.push(currentValue);
        state.pendingOperators.push(operator);
        state.waitingForOperand = true;
      }
  
      updateExpressionString();
      updateDisplay();
    }
  
    // Update expression string for display
    function updateExpressionString() {
      let equationStr = "";
  
      // Build the equation string from pending values and operators
      for (let i = 0; i < state.pendingValues.length; i++) {
        equationStr += formatNumber(state.pendingValues[i]);
  
        if (i < state.pendingOperators.length) {
          // Wrap operators in a span with class to style them blue
          equationStr += `<span class="operator-highlight">${operationSymbols[state.pendingOperators[i]]}</span>`;
        }
      }
  
      // Add current input if not waiting for an operand
      if (
        !state.waitingForOperand &&
        !state.clearOnNextInput &&
        state.pendingValues.length > 0
      ) {
        equationStr += formatNumber(state.displayValue);
      }
  
      state.equationDisplay = equationStr;
    }
  
    // Evaluate expression following BODMAS/DMAS rules
    function evaluateExpression() {
      // If there's nothing to evaluate
      if (state.pendingValues.length === 0 && state.displayValue === "0") {
        return;
      }
  
      // If there are pending operations
      if (state.pendingValues.length > 0) {
        // Complete the expression with the current value if needed
        if (!state.waitingForOperand && !state.clearOnNextInput) {
          state.pendingValues.push(parseFloat(state.displayValue));
        }
  
        // Save the complete equation for display
        const fullEquation = buildFullEquation();
  
        try {
          // Use direct array references instead of spreads for better performance
          // on mobile devices without copying large arrays
          const values = state.pendingValues.slice();
          const operators = state.pendingOperators.slice();
  
          // First apply multiplication and division (left to right)
          for (let i = 0; i < operators.length; i++) {
            if (operators[i] === "multiply" || operators[i] === "divide") {
              let result;
  
              if (operators[i] === "multiply") {
                result = values[i] * values[i + 1];
              } else {
                if (values[i + 1] === 0) {
                  throw new Error("Division by zero");
                }
                result = values[i] / values[i + 1];
              }
  
              // Replace the two operands with their result
              values.splice(i, 2, result);
              // Remove the operator
              operators.splice(i, 1);
              // Adjust index since arrays are now shorter
              i--;
            }
          }
  
          // Now apply addition and subtraction (left to right)
          let finalResult = values[0];
          for (let i = 0; i < operators.length; i++) {
            if (operators[i] === "add") {
              finalResult += values[i + 1];
            } else if (operators[i] === "subtract") {
              finalResult -= values[i + 1];
            }
          }
  
          // Add to history
          addToHistory(fullEquation, finalResult);
  
          // Format and display the result
          state.displayValue = String(finalResult);
          state.equationDisplay = fullEquation;
          state.clearOnNextInput = true;
          state.pendingValues = [];
          state.pendingOperators = [];
        } catch (error) {
          state.displayValue = "Error";
          state.equationDisplay = "Error";
          state.clearOnNextInput = true;
          state.pendingValues = [];
          state.pendingOperators = [];
        }
      }
  
      updateDisplay();
    }
  
    // Build the full equation string for display after evaluation
    function buildFullEquation() {
      let equationStr = "";
  
      // Include all pending values and operators
      for (let i = 0; i < state.pendingValues.length; i++) {
        equationStr += formatNumber(state.pendingValues[i]);
  
        if (i < state.pendingOperators.length) {
          // Use the same format as the updateExpressionString function
          equationStr += `<span class="operator-highlight">${operationSymbols[state.pendingOperators[i]]}</span>`;
        }
      }
  
      return equationStr + '<span class="operator-highlight equals">=</span>';
    }
  
    // Add calculation to history
    function addToHistory(equation, result) {
      // Create history item
      const historyItem = {
        equation,
        result: formatNumber(result),
        timestamp: new Date().getTime(),
      };
  
      // Add to history array
      state.history.unshift(historyItem);
  
      // Keep history limited to last 20 items
      if (state.history.length > 20) {
        state.history.pop();
      }
  
      // Save to localStorage
      saveHistory();
  
      // Update history panel if visible
      if (state.showHistory) {
        renderHistoryItems();
      }
  
      // Add highlight animation to the calculator display
      const calculatorDisplay = document.querySelector(".calculator-display");
      if (calculatorDisplay) {
        // Remove previous animation if exists
        calculatorDisplay.classList.remove("highlight-result");
  
        // Force a reflow to ensure animation plays again if already added
        void calculatorDisplay.offsetWidth;
  
        // Add animation class
        calculatorDisplay.classList.add("highlight-result");
  
        // Remove class after animation completes to allow it to play again
        setTimeout(() => {
          calculatorDisplay.classList.remove("highlight-result");
        }, 800); // Match animation duration
      }
    }
  
    // Save history to localStorage
    // Save calculated history to localStorage with debounce for better mobile performance
    const saveHistory = (() => {
      let timeoutId;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          try {
            localStorage.setItem("calculatorHistory", JSON.stringify(state.history));
          } catch (e) {
            console.error("Could not save history to localStorage:", e);
          }
        }, 300);
      };
    })();
  
    // Load history from localStorage
    function loadHistory() {
      try {
        const savedHistory = localStorage.getItem("calculatorHistory");
        if (savedHistory) {
          state.history = JSON.parse(savedHistory);
        }
      } catch (e) {
        console.error("Could not load history from localStorage:", e);
        state.history = [];
      }
    }
  
    // Render history items in the panel with optimized animations for Samsung M52
    function renderHistoryItems() {
      // Don't render if we're in the middle of a frame (optimization for Android)
      const now = performance.now();
      if (now - state.lastFrameTime < 16) { // Skip if less than one frame has passed
        requestAnimationFrame(renderHistoryItems);
        return;
      }
      state.lastFrameTime = now;
      
      // Clear the list with optimized DOM operation
      while (historyList.firstChild) {
        historyList.removeChild(historyList.firstChild);
      }
  
      // If no history items
      if (state.history.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.classList.add("empty-history");
        emptyMessage.textContent = "No calculation history yet";
        
        // Use simplified animation technique for Android
        emptyMessage.style.opacity = "0";
        requestAnimationFrame(() => {
          emptyMessage.style.opacity = "1";
          emptyMessage.style.transition = "opacity 0.3s ease";
        });
        
        historyList.appendChild(emptyMessage);
        return;
      }
  
      // Create a document fragment for better performance
      const fragment = document.createDocumentFragment();
  
      // Add each history item with optimized animations for Samsung M52
      state.history.forEach((item, index) => {
        const historyItem = document.createElement("div");
        historyItem.classList.add("history-item");
        historyItem.dataset.index = index;
  
        // Use lighter animation for Android devices
        historyItem.style.transform = 'translateX(5px)';  // Reduced distance for smoother animation
        historyItem.style.opacity = '0';
        
        // Use will-change sparingly for GPU acceleration
        if (index < 5) { // Only apply to visible items for performance
          historyItem.style.willChange = 'transform, opacity';
        }
        
        // Group animations with requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          // Optimize animation timing for buttery smooth performance on Android
          setTimeout(() => {
            historyItem.style.transform = 'translateX(0)';
            historyItem.style.opacity = '1';
            historyItem.style.transition = `transform ${state.isAndroid ? 0.15 : 0.2}s var(--mobile-bezier), opacity ${state.isAndroid ? 0.15 : 0.2}s var(--mobile-bezier)`;
            
            // Remove will-change after animation to free GPU resources
            setTimeout(() => {
              historyItem.style.willChange = 'auto';
            }, 300);
          }, 20 + (index * 15)); // Reduced stagger time for faster rendering
        });
  
        const historyContent = document.createElement("div");
        historyContent.classList.add("history-content");
  
        const equation = document.createElement("div");
        equation.classList.add("history-equation");
        equation.innerHTML = item.equation; // Use innerHTML instead of textContent to render the HTML
  
        // Simplified animation for equation (lighter for mobile)
        equation.style.opacity = '0';
        equation.style.transform = 'translateY(3px)';
        setTimeout(() => {
          equation.style.opacity = '1';
          equation.style.transform = 'translateY(0)';
          equation.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        }, 100 + (index * 25));
  
        const historyResult = document.createElement("div");
        historyResult.classList.add("history-result");
        historyResult.textContent = item.result;
  
        // Simplified animation for result (lighter for mobile)
        historyResult.style.opacity = '0';
        historyResult.style.transform = 'translateY(3px)';
        setTimeout(() => {
          historyResult.style.opacity = '1';
          historyResult.style.transform = 'translateY(0)';
          historyResult.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, 150 + (index * 25));
  
        historyContent.appendChild(equation);
        historyContent.appendChild(historyResult);
  
        // Add the delete button with enhanced hover effect
        const deleteBtn = document.createElement("button");
        deleteBtn.classList.add("history-item-delete");
        deleteBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        `;
  
        // Add a subtle hover effect
        deleteBtn.addEventListener('mouseover', () => {
          deleteBtn.style.transform = 'scale(1.1) rotate(90deg)';
          deleteBtn.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        });
  
        deleteBtn.addEventListener('mouseout', () => {
          deleteBtn.style.transform = 'scale(1) rotate(0deg)';
        });
  
        // Add delete event (with stopPropagation to prevent triggering parent click)
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          // Add a small tactile animation before deleting
          deleteBtn.style.transform = 'scale(0.8)';
          setTimeout(() => {
            deleteHistoryItem(index);
          }, 150);
        });
  
        // Add click event to use this calculation with visual feedback
        historyContent.addEventListener("click", () => {
          // Add visual feedback on click
          historyItem.classList.add('selected');
  
          // Add a brief transition effect before using the item
          setTimeout(() => {
            useHistoryItem(index);
          }, 300);
        });
  
        historyItem.appendChild(historyContent);
        historyItem.appendChild(deleteBtn);
  
        // Add to fragment instead of directly to DOM
        fragment.appendChild(historyItem);
      });
  
      // Add all items to DOM at once (more efficient)
      historyList.appendChild(fragment);
  
      // Add animation class to history panel to trigger its animation
      if (historyPanel.classList.contains("show")) {
        // Force a reflow to restart the animation
        historyPanel.classList.remove("animate-panel");
        void historyPanel.offsetWidth; // Trigger reflow
        historyPanel.classList.add("animate-panel");
  
        // Add a subtle background wave animation
        setTimeout(() => {
          historyPanel.classList.add('animated-bg');
  
          // Remove it after a few seconds
          setTimeout(() => {
            historyPanel.classList.remove('animated-bg');
          }, 3000);
        }, 500);
      }
    }
  
    // Delete a specific history item with animation
    function deleteHistoryItem(index) {
      // Get the DOM element
      const historyItemElem = document.querySelector(
        `.history-item[data-index="${index}"]`,
      );
  
      if (historyItemElem) {
        // Add the removing class for animation
        historyItemElem.classList.add("removing");
  
        // Wait for animation to complete before actually removing from array
        setTimeout(() => {
          // Remove the item from history array
          state.history.splice(index, 1);
  
          // Save updated history
          saveHistory();
  
          // Re-render the history list
          renderHistoryItems();
        }, 300); // Match the animation duration (0.3s)
      } else {
        // Fallback if element not found
        state.history.splice(index, 1);
        saveHistory();
        renderHistoryItems();
      }
    }
  
    // Use a history item with visual feedback
    function useHistoryItem(index) {
      // Get the history item element
      const historyItemElem = document.querySelector(
        `.history-item[data-index="${index}"]`,
      );
  
      if (historyItemElem) {
        // Add selected class for visual feedback
        historyItemElem.classList.add("selected");
  
        // Wait a moment before closing panel for animation to be visible
        setTimeout(() => {
          const item = state.history[index];
          state.displayValue = item.result.toString().replace(/,/g, ""); // Remove formatting
          state.equationDisplay = item.equation;
          state.clearOnNextInput = true;
          state.pendingValues = [];
          state.pendingOperators = [];
          updateDisplay();
  
          // Close the history panel
          toggleHistoryPanel();
        }, 300);
      } else {
        // Fallback if element not found
        const item = state.history[index];
        state.displayValue = item.result.toString().replace(/,/g, ""); // Remove formatting
        state.equationDisplay = item.equation;
        state.clearOnNextInput = true;
        state.pendingValues = [];
        state.pendingOperators = [];
        updateDisplay();
        toggleHistoryPanel();
      }
    }
  
    // Toggle history panel visibility with optimized animations for Samsung M52
    function toggleHistoryPanel() {
      // Check frame timing to prevent jank
      const now = performance.now();
      if (now - state.lastFrameTime < 16) {
        requestAnimationFrame(toggleHistoryPanel);
        return;
      }
      state.lastFrameTime = now;
      
      state.showHistory = !state.showHistory;
      const historyToggle = document.querySelector('.history-toggle');
      const app = document.querySelector('.app-container');
  
      if (state.showHistory) {
        // Use requestAnimationFrame for smoother panel opening
        requestAnimationFrame(() => {
          // Open the history panel
          historyPanel.classList.add("show");
          app.classList.add('show-history');
    
          // Add animation classes to history toggle button
          if (historyToggle) {
            historyToggle.classList.add('active');
            historyToggle.classList.remove('closing');
            
            // Apply GPU acceleration for the animation
            historyToggle.style.willChange = 'transform';
            setTimeout(() => {
              historyToggle.style.willChange = 'auto';
            }, 300);
          }
    
          // Render history items
          renderHistoryItems();
    
          // Optimized animation for better performance on Android devices
          setTimeout(() => {
            const historyItems = document.querySelectorAll('.history-item');
            // Use requestAnimationFrame for smoother animations
            requestAnimationFrame(() => {
              historyItems.forEach((item, index) => {
                // Simplified animation with reduced properties for better performance
                if (index < 10) { // Only animate visible items
                  item.style.animation = state.isAndroid ? 
                    'slide-in 0.2s ease-out' : 
                    'slide-in 0.3s ease-out, history-item-glow 2s infinite 1s';
                }
              });
            });
          }, 100); // Reduced delay
    
          // Add highlight to header with optimized animation
          const header = document.querySelector('.history-header');
          if (header) {
            header.style.animation = 'header-appear 0.3s forwards';
          }
        });
      } else {
        // Use requestAnimationFrame for smoother panel closing
        requestAnimationFrame(() => {
          // Close the history panel
          historyPanel.classList.remove("show");
          app.classList.remove('show-history');
    
          // Add closing animation to toggle button
          if (historyToggle) {
            historyToggle.classList.remove('active');
            historyToggle.classList.add('closing');
            
            // Apply GPU acceleration for the animation
            historyToggle.style.willChange = 'transform';
            
            // Remove will-change and closing class after animation completes
            setTimeout(() => {
              historyToggle.classList.remove('closing');
              historyToggle.style.willChange = 'auto';
            }, 300);
          }
        });
      }
    }
  
    // Clear all history with animation
    function clearHistoryList() {
      // Get all history items
      const historyItems = document.querySelectorAll(".history-item");
  
      // If no items, just clear the state
      if (historyItems.length === 0) {
        state.history = [];
        saveHistory();
        renderHistoryItems();
        return;
      }
  
      // Add clearing animation class to each item with staggered delays
      historyItems.forEach((item, index) => {
        // Add staggered animation by using setTimeout with increasing delays
        setTimeout(() => {
          item.classList.add("clearing");
        }, index * 50); // 50ms staggered delay
      });
  
      // Wait for animations to complete before clearing state
      // Use the longest possible animation time (last item + animation duration)
      const lastItemIndex = historyItems.length - 1;
      const totalDelay = lastItemIndex * 50 + 400; // Last item delay + animation duration
  
      setTimeout(() => {
        state.history = [];
        saveHistory();
        renderHistoryItems();
      }, totalDelay);
    }
  
    // Clear calculator
    function clearCalculator() {
      state.displayValue = "0";
      state.pendingValues = [];
      state.pendingOperators = [];
      state.equationDisplay = "";
      state.waitingForOperand = false;
      state.clearOnNextInput = false;
      updateDisplay();
    }
  
    // Toggle sign (+/-)
    function toggleSign() {
      if (state.displayValue === "0") return;
      state.displayValue = (parseFloat(state.displayValue) * -1).toString();
      updateExpressionString();
      updateDisplay();
    }
  
    // Percentage operation
    function percentOperation() {
      if (state.displayValue === "0") return;
      state.displayValue = (parseFloat(state.displayValue) / 100).toString();
      updateExpressionString();
      updateDisplay();
    }
  
    // Backspace function
    function backspace() {
      if (
        state.displayValue === "0" ||
        state.displayValue === "Error" ||
        state.waitingForOperand ||
        state.clearOnNextInput
      )
        return;
      if (
        state.displayValue.length === 1 ||
        (state.displayValue.length === 2 && state.displayValue[0] === "-")
      ) {
        state.displayValue = "0";
      } else {
        state.displayValue = state.displayValue.slice(0, -1);
      }
      updateExpressionString();
      updateDisplay();
    }
  
    // Toggle theme
    function toggleTheme() {
      state.isDarkMode = !state.isDarkMode;
      document.body.classList.toggle("light-mode");
    }
  
    // Handle keyboard input
    function handleKeyboardInput(event) {
      const { key } = event;
  
      // Numbers
      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        inputDigit(key);
      }
      // Operators
      else if (key === "+") {
        event.preventDefault();
        inputOperator("add");
      } else if (key === "-") {
        event.preventDefault();
        inputOperator("subtract");
      } else if (key === "*") {
        event.preventDefault();
        inputOperator("multiply");
      } else if (key === "/") {
        event.preventDefault();
        inputOperator("divide");
      }
      // Equals and Enter
      else if (key === "=" || key === "Enter") {
        event.preventDefault();
        evaluateExpression();
      }
      // Decimal
      else if (key === ".") {
        event.preventDefault();
        inputDecimal();
      }
      // Backspace
      else if (key === "Backspace") {
        event.preventDefault();
        backspace();
      }
      // Clear
      else if (key === "Escape" || key === "c" || key === "C") {
        event.preventDefault();
        clearCalculator();
      }
      // Percent
      else if (key === "%") {
        event.preventDefault();
        percentOperation();
      }
      // History
      else if (key === "h" || key === "H") {
        event.preventDefault();
        toggleHistoryPanel();
      }
    }
  });
  
