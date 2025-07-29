const buttons = document.querySelectorAll('button');
const displayExpression = document.getElementById('display-expression');
const liveResult = document.getElementById('result-preview');

let resultDisplayed = false;
let justCalculatedExpression = false;
let justInsertedANS = false;
let currentANS = 0;

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
    }
});

// Show the expression on the display screen based on the key clicked
function handleInput(value) {
    const isSymbol = ['+', '-', 'x', '÷', '%', '(', '*', '/'].includes(value);

    if (justCalculatedExpression) {
        displayExpression.textContent = value === 'ANS' ? 'ANS' : isSymbol ? 'ANS' + value : value;
        justCalculatedExpression = false;    
    } else if (resultDisplayed) {
        displayExpression.textContent = (value === 'ANS') ? 'ANS' : value;
        liveResult.textContent = '';
        resultDisplayed = false;
    } else {
        if (value === 'ANS') {
            displayExpression.textContent += 'ANS';
            justInsertedANS = true;
        } else {
            displayExpression.textContent += value;
            justInsertedANS = false;
        }
    }

    displayExpression.scrollLeft = displayExpression.scrollWidth;
    displayExpression.classList.remove('no-cursor');
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
    const expression = displayExpression.textContent;

    try {
        if (/[^0-9+\-*x().÷/%A-Za-z\s]+$/.test(expression)) {
            throw new Error('Invalid character');
        }

        const jsExpr = convertToJSExpression(expression);
        const result = new Function(`return ${jsExpr}`)();

        if (!isFinite(result)) {
            displayExpression.textContent = 'Error';
        } else {
            const formattedExpr = foramtNumber(result);
            displayExpression.textContent = formattedExpr;
            document.getElementById('ans-val').textContent = formattedExpr;
            currentANS = formattedExpr;
        }
        displayExpression.classList.add('no-cursor');
        liveResult.textContent = '';
        justCalculatedExpression = true;
    } catch {
        displayExpression.textContent = 'Error';
        liveResult.textContent = '';
        resultDisplayed = true;
    }
}

// liveResultPreview function: should show the current total of the expression entered
function liveResultPreview() {
    const currentExpr = displayExpression.textContent.trim();
    if (!currentExpr) {
        liveResult.textContent = '= 0';
        return;
    }

    const previewJsExpr = convertToJSExpression(currentExpr);

    try {
        const preResult = new Function(`return ${previewJsExpr}`)();
        if (isFinite(preResult)) {
            liveResult.textContent = `= ${foramtNumber(preResult)}`;
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
            liveResult.textContent = `= ${foramtNumber(exprResult)}`;
        } 
    } catch {
        liveResult.textContent = '= ...';
    }
}

// clearDisplay function - called when Escape key is pressed or 'C' on keypad
function clearDisplay() {
    displayExpression.textContent = '';
    liveResult.textContent = '';
    displayExpression.classList.remove("no-cursor");
    resultDisplayed = false;
    justCalculatedExpression = false;
}
// deleteLast function - called when Backspace is pressed or 'DEL' on keypad
function deleteLast() {
    if (resultDisplayed) {
        clearDisplay();
        return;
    } 
    if (justInsertedANS || displayExpression.textContent === 'ANS') {
        displayExpression.textContent = displayExpression.textContent.slice(0, -3);
        justInsertedANS = false;
    } else {
        displayExpression.textContent = displayExpression.textContent.slice(0, -1);
    }
    liveResultPreview();
}

function foramtNumber (num) {
    return parseFloat(num.toFixed(5));
}