const buttons = document.querySelectorAll('button');
const display = document.getElementById('display');
const liveResult = document.getElementById('live-result');

let isResultShown = false;
let justCalculated = false;
let justInsertedANS = false;
let ANS = null;

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
    } else if (e.key.toLowerCase() === 'a') {
        handleInput('ANS');
    } else if (e.key === 'Enter') {
        e.preventDefault();
        calculate();
    } else if (e.key === 'Backspace') {
        deleteLast();
    } else if (e.key === 'Escape') {
        clearDisplay();
    }
});

function handleInput(inputVal) {
    console.log(display.textContent);
    if (justCalculated) {
        display.textContent = '';
        justCalculated = false;
    }
    if (isResultShown) {
        display.textContent = '';
        liveResult.textContent = '';
        isResultShown = false;
    }
    if (inputVal === 'ANS') {
        display.textContent += ANS;
        justInsertedANS = true;
    } else {
        display.textContent += inputVal;
        justInsertedANS = false;
    }
    display.classList.remove('no-cursor');
    livePreview();
}

function toJSExpression(expr) {
    return expr
        .replace(/ANS/g, ANS !== null ? ANS : '0')
        .replace(/x/g, '*')
        .replace(/÷/g, '/')
        .replace(/(\d)(\()/g, '$1*(')
        .replace(/(\))(\d)/g, ')*$2')
        .replace(/(\))(\()/g, ')*(');
}

function calculate() {
    const expression = display.textContent;
    try {
        if (/[^0-9+\-*x().÷/%A-Za-z\s]+$/.test(expression)) {
            throw new Error("Invalid Characters");
        }
        const jsExpr = toJSExpression(expression);
        const result = new Function(`return ${jsExpr}`)();

        if (!isFinite(result)) {
            display.textContent = 'Error';
        } else {
            const formatted = parseFloat(result.toFixed(5));
            display.textContent = formatted;
            ANS = formatted;
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

    if (/[^0-9+\-*x().÷/%A-Za-z\s]+$/.test(currentExpr)) {
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
        return;
    } 
    if (justInsertedANS) {
        display.textContent = display.textContent.slice(0, -ANS.toString().length);
        justInsertedANS = false;
    } else {
        display.textContent = display.textContent.slice(0, -1);
    }
    livePreview();
}