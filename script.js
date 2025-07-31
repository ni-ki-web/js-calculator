const buttons = document.querySelectorAll('button');
const displayExpression = document.getElementById('display-expression');
const liveResult = document.getElementById('result-preview');
const expressionLeft = document.getElementById('expression-text-left');
const expressionRight = document.getElementById('expression-text-right');
const cursor = document.getElementById('blinking-cursor');

let resultDisplayed = false;
let justCalculated = false;
let currentANS = 0;

function getFullExpression() {
    return expressionLeft.textContent + expressionRight.textContent;
}

function setExpression(left, right) {
    expressionLeft.textContent = left;
    expressionRight.textContent = right;
    scrollToCursor();
    updateLiveResult();
}

// Event listener for each UI button : ensure the keys work when clicked
buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const btnVal = btn.textContent.trim();

        if (btn.classList.contains('equal')) {
            calculate();
        } else if (btn.classList.contains('delete')) {
            deleteLast();
        } else if (btn.classList.contains('clear')) {
            clearDisplay();
        } else if (btn.classList.contains('left-arrow')) {
            moveCursorToLeft();
            scrollToCursor();
        } else if (btn.classList.contains('right-arrow')) {
            moveCursorToRight();
            scrollToCursor();
        } else {
            handleInput(btnVal);
        }
    });
});

// Keyboard clicks
document.addEventListener('keydown', (e) => {
    const allowedKeys = '0123456789+-*x/÷.%()';
    if (allowedKeys.includes(e.key)) {
       let keyVal = e.key === '*' ? 'x' : e.key === '/' ? '÷' : e.key;
       handleInput(keyVal);
    } else if (e.key.toLowerCase() === 'a') {
        handleInput('ANS');
    } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculate();
    } else if (e.key === 'Backspace') {
        deleteLast();
    } else if (e.key === 'Escape') {
        clearDisplay();
    } else if (e.key === 'ArrowLeft') {
        moveCursorToLeft();
        scrollToCursor();
    } else if (e.key === 'ArrowRight') {
        moveCursorToRight();
        scrollToCursor();
    }
});

// Show the expression on the display screen based on the key clicked
function handleInput(value) {

    if (resultDisplayed && expressionLeft.textContent === 'Syntax Error') {
        setExpression(value, '');
        resultDisplayed = false;
        justCalculated = false;
        cursor.classList.remove('no-cursor');
        scrollToCursor();
        updateLiveResult();
        return;
    }
    const isSymbol = ['+', '-', 'x', '÷', '%', '(', '*', '/'].includes(value);
    const isOperator = /[+\-x÷*/%]/.test(value);
    const left = expressionLeft.textContent;
    const lastChar = left.slice(-1);
    const ansChar = left.slice(-3);

    // 1. Restrict first character to '-', '(' digit or 'ANS'
    if (!left) {
        if (value !== 'ANS' && !/^[-|(|\d]$/.test(value)) return;
    }

    // 2. Prevent invalid character after '('
    if (lastChar === '(' && !(value === 'ANS' || /^\d$/.test(value) || value === '-' || value === '(')) return;

    // 3. Prevent ANSANS, ANSdigit or digitANS
    if ((lastChar === 'S' && value === 'ANS') || (/\d^/.test(lastChar) && value === 'ANS')) return;

    // 4. If the first char is '-', the second must be a digit
    if (
        (value === 'ANS' && (/\d$/.test(lastChar) || ansChar === 'ANS')) ||  // 5ANS or ANSANS
        (ansChar === 'ANS' && /^\d$/.test(value))                           // ANS5
    ) return;

    // 5. Prevent two consecutive operators
    if (isOperator && /[+\-x÷*/%]/.test(lastChar)) return;

    if (justCalculated || resultDisplayed) {
        if (value === ')') return;
        const newLeft = (value === 'ANS') ? 'ANS' : (isSymbol) ? 'ANS' + value : value;
        setExpression(newLeft, '');
        justCalculated = false;
        resultDisplayed = false;
    } else {
            expressionLeft.textContent += value;
    }

    cursor.classList.remove('no-cursor');
    scrollToCursor();
    updateLiveResult();
}

function convertToJSExpression(expression) {
    return expression
        .replace(/ANS/g, currentANS.toString())
        .replace(/x/g, '*')
        .replace(/÷/g, '/')
        .replace(/(\d)(\()/g, '$1*(')
        .replace(/(\))(\d)/g, ')*$2')
        .replace(/(\))(\()/g, ')*(');
}

// Core function
function calculate() {
    const fullExpression = getFullExpression().trim();
    // Exit early if expression is empty or only operator symbols
    if (!fullExpression || /^[\+\-x÷*/%.()]+$/.test(fullExpression)) return;
    
    // First character must be a number, ANS, or -
    if (!/^(ANS|[-\d])/.test(fullExpression)) return;

    // The last character must not be an operator, %, .
    if (/[+\-x÷*/%().]$/.test(fullExpression)) {
        setExpression('Syntax Error');
        liveResult.textContent = '';
        resultDisplayed = true;
        return;
    }

    if (!areParenthesisBalanced(fullExpression)) {
        liveResult.textContent = 'Syntax Error';
        resultDisplayed = false;
        return;
    }

    const jsExpression = convertToJSExpression(fullExpression);

    try {
        const result = math.evaluate(jsExpression);

        if (!isFinite(result)) throw new Error('Invalid result');
        
        const formatted = formatNumber(result);
        setExpression(formatted, '');
        document.getElementById('ans-val').textContent = formatted;
        currentANS = result;
        cursor.classList.add('no-cursor');
        justCalculated = true;
    } catch {
        clearDisplay();
        displayExpression.textContent = 'Error';
        resultDisplayed = true;
        cursor.classList.add('no-cursor');
    }

    liveResult.textContent = '';
    scrollToCursor();
}

// updateLiveResult function: should show the current total of the expression entered
function updateLiveResult() {
    const currentExpression = getFullExpression().trim();
    if (!currentExpression) {
        liveResult.textContent = '= 0';
        return;
    }

    if (!areParenthesisBalanced(currentExpression)) {
        liveResult.textContent = '= ...';
        return;
    }

    const previewJSExpression = convertToJSExpression(currentExpression);

    try {
        const previewResult = math.evaluate(previewJSExpression);
        if (isFinite(previewResult)) {
            liveResult.textContent = `= ${formatNumber(previewResult)}`;
            return;
        }
    } catch {
        // If live expression can't be calculated, fallback
    }

    // fallback: trim trailing operators and retry
    let trimmed = currentExpression.replace(/[\+\-\*x÷/%(\s]+$/, '');
    if(!trimmed) {
        liveResult.textContent = '= 0';
        return;
    }
    try {
        const fallbackExpression = convertToJSExpression(trimmed);
        const expressionResult = math.evaluate(fallbackExpression);

        if (isFinite(expressionResult)) {
            liveResult.textContent = `= ${formatNumber(expressionResult)}`;
        } 
    } catch {
        liveResult.textContent = '= ...';
    }
}

// clearDisplay function - called when Escape key is pressed or 'C' on keypad
function clearDisplay() {
    setExpression('', '');
    liveResult.textContent = '';
    cursor.classList.remove("no-cursor");
    resultDisplayed = false;
    justCalculated = false;
}

// deleteLast function - called when Backspace is pressed or 'DEL' on keypad
function deleteLast() {
    if (resultDisplayed) return clearDisplay();
    const left = expressionLeft.textContent;
    expressionLeft.textContent = left.endsWith('ANS') ? left.slice(0, -3) : left.slice(0, -1);
    updateLiveResult();
    scrollToCursor();
}

function formatNumber(num) {
    return (typeof num === 'number' && isFinite(num)) ? parseFloat(num.toFixed(5)) : 'Error';
}

// ====== Cursor functions ======
function scrollToCursor() {
    displayExpression.scrollLeft = displayExpression.scrollWidth;
}

function moveCursorToLeft() {
    const left = expressionLeft.textContent;
    if (left.endsWith('ANS')) {
            expressionLeft.textContent = left.slice(0, -3);
            expressionRight.textContent = 'ANS' + expressionRight.textContent;
    } else if (left.length) {
            expressionLeft.textContent = left.slice(0, -1);
            expressionRight.textContent = left.slice(-1) + expressionRight.textContent;
    }
}

function moveCursorToRight() {
    const right = expressionRight.textContent;
    if (right.startsWith('ANS')) {
            expressionRight.textContent = right.slice(3);
            expressionLeft.textContent += 'ANS';
    } else if (right.length) {
            expressionRight.textContent = right.slice(1);
            expressionLeft.textContent += right[0];
    }
}

function areParenthesisBalanced(expr) {
    let balance = 0;
    for (const char of expr) {
        if (char === '(') balance++;
        else if (char === ')') balance--;
        if (balance < 0) return false;
    }
    return balance === 0;
}