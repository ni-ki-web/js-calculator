const buttons = document.querySelectorAll('button');
const displayExpression = document.getElementById('display-expression');
const liveResult = document.getElementById('result-preview');
const exprLeft = document.getElementById('expression-text-left');
const exprRight = document.getElementById('expression-text-right');
const cursor = document.getElementById('blinking-cursor');

let resultDisplayed = false;
let justCalculatedExpression = false;
let justInsertedANS = false;
let currentANS = 0;
let cursorPostition = 0;

function getFullExpression() {
    return exprLeft.textContent + exprRight.textContent;
}

function setExpression(left, right) {
    exprLeft.textContent = left;
    exprRight.textContent = right;
    scrollToCursor();
    liveResultPreview();
}

// Event listener for each UI button : ensure the keys work when clicked
buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const btnVal = btn.textContent.trim();

        if (btn.classList.contains('equal')) {
            calculateExpression();
        } else if (btn.classList.contains('delete')) {
            deleteLast();
        } else if (btn.classList.contains('clear')) {
            clearDisplay();
        } else if (btn.classList.contains('left-arrow')) {
            document.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft'}));
        } else if (btn.classList.contains('right-arrow')) {
            document.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
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
        calculateExpression();
    } else if (e.key === 'Backspace') {
        deleteLast();
    } else if (e.key === 'Escape') {
        clearDisplay();
    } else if (e.key === 'ArrowLeft') {
        if (exprLeft.textContent.endsWith('ANS')) {
            exprLeft.textContent = exprLeft.textContent.slice(0, -3);
            exprRight.textContent = 'ANS' + exprRight.textContent;
        } else if (exprLeft.textContent.length > 0) {
            const lastChar = exprLeft.textContent.slice(-1);
            exprLeft.textContent = exprLeft.textContent.slice(0, -1);
            exprRight.textContent = lastChar + exprRight.textContent;
        }
        scrollToCursor();
    } else if (e.key === 'ArrowRight') {
        if (exprRight.textContent.startsWith('ANS')) {
            exprRight.textContent = exprRight.textContent.slice(3);
            exprLeft.textContent += 'ANS';
        } else if (exprRight.textContent.length > 0) {
            const nextChar = exprRight.textContent[0];
            exprRight.textContent = exprRight.textContent.slice(1);
            exprLeft.textContent += nextChar;
        }
        scrollToCursor();
    }
});

// Show the expression on the display screen based on the key clicked
function handleInput(value) {
    const isSymbol = ['+', '-', 'x', '÷', '%', '(', '*', '/'].includes(value);

    if (justCalculatedExpression) {
        if (value === 'ANS') {
            setExpression('ANS', '');
        } else if (isSymbol) {
            setExpression('ANS' + value, '');
        } else {
            setExpression(value, '');
        }
        justCalculatedExpression = false;
    } else if (resultDisplayed) {
        setExpression(value === 'ANS' ? 'ANS' : value, '');
        liveResult.textContent = '';
        resultDisplayed = false;
    } else {
        if (value === 'ANS') {
            exprLeft.textContent += 'ANS';
            justInsertedANS = true;
        } else {
            exprLeft.textContent += value;
            justInsertedANS = false;
        }
    }

    scrollToCursor();
    cursor.classList.remove('no-cursor');
    liveResultPreview();
}

function convertToJSExpression(expr) {
    return expr
        .replace(/ANS/g, currentANS.toString())
        .replace(/x/g, '*')
        .replace(/÷/g, '/')
        .replace(/(\d)(\()/g, '$1*(') // e.g., 2(3+1) -> 2*(3+1) 
        .replace(/(\))(\d)/g, ')*$2') // e.g., (3+1)2 -> (3+1)*2
        .replace(/(\))(\()/g, ')*('); // e.g., (2)(3+1) -> (2)*(3+1)
}

// Core function
function calculateExpression() {
    const expression = getFullExpression();

    try {
        if (/[^0-9+\-*x().÷/%A-Za-z\s]+$/.test(expression)) {
            throw new Error('Invalid character');
        }

        const jsExpr = convertToJSExpression(expression);
        const result = new Function(`return ${jsExpr}`)();

        if (!isFinite(result)) {
            displayExpression.textContent = 'Error';
        } else {
            const formattedExpr = formatNumber(result);
            setExpression(formattedExpr, '');
            document.getElementById('ans-val').textContent = formattedExpr;
            currentANS = result;
        }
        cursor.classList.add('no-cursor');
        liveResult.textContent = '';
        justCalculatedExpression = true;
    } catch {
        exprLeft.textContent = 'Error';
        liveResult.textContent = '';
        resultDisplayed = true;
    }
    scrollToCursor();
}

// liveResultPreview function: should show the current total of the expression entered
function liveResultPreview() {
    const currentExpr = getFullExpression().trim();
    if (!currentExpr) {
        liveResult.textContent = '= 0';
        return;
    }

    const previewJsExpr = convertToJSExpression(currentExpr);

    try {
        const preResult = new Function(`return ${previewJsExpr}`)();
        if (isFinite(preResult)) {
            liveResult.textContent = `= ${formatNumber(preResult)}`;
            return;
        }
    } catch {
        // If live expression can't be calculated, fallback
    }

    // fallback: trim trailing operators and retry
    let trimmedExpr = currentExpr.replace(/[\+\-\*x÷/%(\s]+$/, '');
    if(!trimmedExpr) {
        liveResult.textContent = '= 0';
        return;
    }
    try {
        const fallbackExpr = convertToJSExpression(trimmedExpr);
        const exprResult = new Function(`return ${fallbackExpr}`)();

        if (isFinite(exprResult)) {
            liveResult.textContent = `= ${formatNumber(exprResult)}`;
        } 
    } catch {
        liveResult.textContent = '= ...';
    }
}

// clearDisplay function - called when Escape key is pressed or 'C' on keypad
function clearDisplay() {
    exprLeft.textContent = '';
    exprRight.textContent = '';
    liveResult.textContent = '';
    cursor.classList.remove("no-cursor");
    resultDisplayed = false;
    justCalculatedExpression = false;
    scrollToCursor();
}

// deleteLast function - called when Backspace is pressed or 'DEL' on keypad
function deleteLast() {
    if (resultDisplayed) {
        clearDisplay();
        return;
    } 
    if (exprLeft.textContent.endsWith('ANS')) {
        exprLeft.textContent = exprLeft.textContent.slice(0, -3);
        justInsertedANS = false;
    } else {
        exprLeft.textContent = exprLeft.textContent.slice(0, -1);
    }
    liveResultPreview();
    scrollToCursor();
}

function scrollToCursor() {
    displayExpression.scrollLeft = displayExpression.scrollWidth;
}

function formatNumber(num) {
    return (typeof num === 'number' && isFinite(num)) ? parseFloat(num.toFixed(5)) : 'Error';
}