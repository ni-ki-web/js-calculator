const buttons = document.querySelectorAll('button');
const displayExpression = document.getElementById('display-expression');
const liveResult = document.getElementById('result-preview');
const expressionLeft = document.getElementById('expression-text-left');
const expressionRight = document.getElementById('expression-text-right');
const cursor = document.getElementById('blinking-cursor');

let resultDisplayed = false;
let justCalculated = false;
let currentANS = 0;

// ============== Expression Handling ==============
function getFullExpression() {
    return expressionLeft.textContent + expressionRight.textContent;
}

function setExpression(left, right) {
    expressionLeft.textContent = left;
    expressionRight.textContent = right;
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

// ============== Event Listeners ==============
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
        } else if (btn.classList.contains('right-arrow')) {
            moveCursorToRight();
        } else {
            handleInput(btnVal);
        }
    });
});

document.addEventListener('keydown', (e) => {
    const allowedKeys = '0123456789+-*x/÷.%()';
    if (allowedKeys.includes(e.key)) {
       let keyVal = e.key === '*' ? 'x' : e.key === '/' ? '÷' : e.key;
       handleInput(keyVal);
       flashButton(keyVal);
    } else if (e.key.toLowerCase() === 'a') {
        handleInput('ANS');
        flashButton('ANS');
    } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculate();
        flashButton('Enter');
    } else if (e.key === 'Backspace') {
        deleteLast();
        flashButton('Backspace');
    } else if (e.key === 'Escape') {
        clearDisplay();
        flashButton('Escape');
    } else if (e.key === 'ArrowLeft') {
        moveCursorToLeft();
        flashButton('ArrowLeft');
    } else if (e.key === 'ArrowRight') {
        moveCursorToRight();
        flashButton('ArrowRight');
    }
});

// ============== Input Handling ==============
function handleInput(value) {
    const isSymbol = ['+', '-', 'x', '÷', '%', '(', '*', '/'].includes(value);
    const isOperator = /[+\-x÷*/%]/.test(value);
    const left = expressionLeft.textContent;
    const lastChar = left.slice(-1);
    const ansChar = left.slice(-3);

    if (resultDisplayed && left === 'Syntax Error') {
        setExpression(value, '');
        resetState();
        return;
    }

    // Validation Rules:
    // Prevent consecutive operators
    if (isOperator) {
        const rightFirst = expressionRight.textContent[0] || '';
        if (/[+\-x÷*/%]/.test(lastChar) || /[+\-x÷*/%]/.test(rightFirst)) return;
    }

    // Only allow '-', '(' digit or 'ANS' as first input
    if (!left) {
        if (value !== 'ANS' && !/^[-|\(|\d]$/.test(value)) return;
    }

    // If the first char is '-', the second must be a digit
    if (left === '-' && isSymbol && value !== 'ANS') return;

    // Disallow invalid parentheses combinations
    if (lastChar === '(' && value === ')') return;
    if (isOperator && value === ')') return;
    if (lastChar === '(' && value === '(') return;

    // Prevent ANSANS, ANSdigit or digitANS
    if ((value === 'ANS' && (/\d$/.test(lastChar) || ansChar === 'ANS')) || (ansChar === 'ANS' && /\d/.test(value))) return liveResult.textContent = 'Add an operator';

    if (justCalculated || resultDisplayed) {
        if (value === ')') return;
        const newLeft = (value === 'ANS') ? 'ANS' : (isSymbol) ? 'ANS' + value : value;
        setExpression(newLeft, '');
        resetState();
    } else {
        setExpression(left + value, expressionRight.textContent);
    }

    cursor.classList.remove('no-cursor');
}

// ============== Calculation ==============
function calculate() {
    const fullExpression = getFullExpression().trim();
    // Exit early if expression is empty or only operator symbols
    if (!fullExpression || /^[\+\-x÷*/%.()]+$/.test(fullExpression)) return;
    
    // First character must be a number, ANS, or -
    if (!/^(\(|ANS|[-\d])/.test(fullExpression)) return;

    // The last character must not be an operator, %, .
    if (/[+\-x÷*/%(.]$/.test(fullExpression)) {
        setError('Syntax Error');
        liveResult.textContent = '';
        resultDisplayed = true;
        return;
    }

    // Parantheses must close -> ()
    if (!areParenthesesBalanced(fullExpression)) {
        liveResult.textContent = 'Syntax Error';
        setError('Syntax Error');
        resultDisplayed = true;
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
        justCalculated = true;
        resultDisplayed = true;
        cursor.classList.add('no-cursor');
    } catch {
        setError('Error');
    }

    liveResult.textContent = '';
    scrollToCursor();
}

// ============== Preview ==============
function updateLiveResult() {
    const currentExpression = getFullExpression().trim();

    if (!currentExpression) return liveResult.textContent = '= 0';
    if (!areParenthesesBalanced(currentExpression)) return liveResult.textContent = '= ...';

    const previewJSExpression = convertToJSExpression(currentExpression);
    try {
        const previewResult = math.evaluate(previewJSExpression);
        if (isFinite(previewResult)) return liveResult.textContent = `= ${formatNumber(previewResult)}`;
    } catch {}

    // fallback: trim trailing operators and retry
    const trimmed = currentExpression.replace(/[+\-*/x÷%.(\s]+$/, '');
    if(!trimmed) return liveResult.textContent = '= 0';
    try {
        const fallback = convertToJSExpression(trimmed);
        const fallbackResult = math.evaluate(fallback);

        if (isFinite(fallbackResult)) {
            liveResult.textContent = `= ${formatNumber(fallbackResult)}`;
        } 
    } catch {
        liveResult.textContent = '= ...';
    }
}

// ============== Screen State ==============
function resetState() {
    resultDisplayed = false;
    justCalculated = false;
    cursor.classList.remove('no-cursor');
}

function clearDisplay() {
    setExpression('', '');
    liveResult.textContent = '';
    resetState();
}

// deleteLast function - called when Backspace is pressed or 'DEL' on keypad
function deleteLast() {
    if (resultDisplayed) return clearDisplay();
    const left = expressionLeft.textContent;
    expressionLeft.textContent = left.endsWith('ANS') ? left.slice(0, -3) : left.slice(0, -1);
    updateLiveResult();
    scrollToCursor();
}

// ============== Cursor ==============
function scrollToCursor() {
  const cursorOffset = cursor.offsetLeft;
  displayExpression.scrollLeft = cursorOffset - displayExpression.clientWidth / 2;
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

// ============== Utility Functions ==============
function formatNumber(num) {
    return (typeof num === 'number' && isFinite(num)) ? parseFloat(num.toFixed(5)) : 'Error';
}

function areParenthesesBalanced(expr) {
    let balance = 0;
    for (const char of expr) {
        if (char === '(') balance++;
        else if (char === ')') balance--;
        if (balance < 0) return false;
    }
    return balance === 0;
}

function setError(msg) {
    setExpression(msg);
    liveResult.textContent = '';
    resultDisplayed = true;
    cursor.classList.add('no-cursor');
}

function flashButton(key) {
    const keyBtn = document.querySelector(`button[data-key="${key}"]`);
    if (keyBtn) {
        keyBtn.classList.add('active');
        setTimeout(() => keyBtn.classList.remove('active'), 100);
    }
}