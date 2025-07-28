const buttons = document.querySelectorAll('button');
const display = document.getElementById('display');
const liveResult = document.getElementById('live-result');

let isResultShown = false;
let justCalculated = false;

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const value = btn.textContent.trim();

        if (btn.classList.contains('equal')) {
            calculate();
        } else if (btn.classList.contains('clear')) {
            clearDisplay();
        } else if (btn.classList.contains('delete')) {
            deleteLast();
        } else {
            handleInput(value);
        }
    })
})

document.addEventListener('keydown', (e) => {
    const allowedKeys = '0123456789+-*x/÷().%';
    if (allowedKeys.includes(e.key)) {
        let keyValue = e.key === '*' ? 'x' : e.key === '/' ? '÷' : e.key;
        handleInput(keyValue);
    } else if (e.key === 'Enter') {
        calculate();
    } else if (e.key === 'Backspace') {
        deleteLast();
    } else if (e.key === 'Escape') {
        clearDisplay();
    }
});

function handleInput(inputVal) {
    if (justCalculated) {
        clearDisplay();
        justCalculated = false;
    }
    if (isResultShown) {
        display.textContent = '';
        liveResult.textContent = '';
        isResultShown = false;
    }
    display.textContent += inputVal;
    previewResult();
}

function toJSExpression(expr) {
    return expr
        .replace(/x/g, '*')
        .replace(/÷/g, '/')
        .replace(/(\d)(\()/g, '$1*(')
        .replace(/(\))(\d)/g, ')*$2')
        .replace(/(\))(\()/g, ')*(');
}

function calculate() {
    const expression = display.textContent;
    try {
        if (/[^0-9+\-x*/÷%.()]/.test(expression)) {
            throw new Error("Invalid Characters");
        }
        const jsExpr = toJSExpression(expression);
        const result = new Function(`return ${jsExpr}`)();

        if (!isFinite(result)) {
            display.textContent = 'Error';
        } else {
            display.textContent = parseFloat(result.toFixed(5));
        }
        display.classList.add('no-cursor');
        liveResult.textContent = '';
        justCalculated = true;
    } catch {
        display.textContent = 'Error';
        display.classList.add('no-cursor');
        liveResult.textContent = '';
        isResultShown = true;
    }
}

function livePreview() {
    const currentExpr = display.textContent.trim();
    if (currentExpr === '') {
        liveResult.textContent = '';
        return;
    }

    if (/[^0-9+\-*x().÷/%]/.test(currentExpr)) {
        liveResult.textContent = '';
        return;
    }

    const previewJsExpr = toJSExpression(currentExpr);
    const operands = currentExpr.split(/[\+\-\*\x\÷\/%]/).filter(val => val.trim() !== '');
    if (operands.length < 2) {
        liveResult.textContent = '';
        return;
    }

    try {
        const preResult = new Function(`return ${previewJsExpr}`)();
        if (!isFinite(preResult)) {
            liveResult.textContent = '';
            return;
        }
         liveResult.textContent = `= ${parseFloat(preResult.toFixed(5))}`;
    } catch {
        liveResult.textContent = '';
    }
}

function clearDisplay() {
    display.textContent = '';
    liveResult.textContent = '';
    display.classList.remove("no-cursor");
    isResultShown = false;
    justCalculated = false;
}

function deleteLast() {
    if (isResultShown) {
        clearDisplay();
    } else {
        display.textContent = display.textContent.slice(0, -1);
        previewResult();
    }
}