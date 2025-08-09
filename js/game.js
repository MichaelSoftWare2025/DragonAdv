import TextEngine from './engine.js'

const engine = new TextEngine();

const gameContainer = document.getElementById('game-container');
const controls = document.getElementById('number-controls');
const fileInput = document.getElementById('gamefile');
const restartButton = document.getElementById('restart');

const previousDisplay = fileInput.style.display || '';

fileInput.addEventListener('change', () => {
    fileInput.style.display = 'none';

    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const jsonData = JSON.parse(e.target.result);
            console.log('JSON загружен:', jsonData);

            startGame(jsonData);
            render();
            // Не вызываем prompt() рекурсивно, слушатель уже подключён
        } catch (err) {
            alert('Ошибка парсинга JSON: ' + err.message);
        }
    };

    reader.readAsText(file);
});

function render() {
    const sceneText = engine.getSceneText();
    const count = engine.getChoiceCount();

    if (count === 0) {
        gameContainer.textContent = engine.getSceneText();

        controls.disabled = true;
        controls.value = '';
        fileInput.style.display = previousDisplay;
        alert('Конец игры.');
        restartButton.style.display = 'block';
        return;
    }

    // Формируем весь текст в одну строку с переносами
    let output = sceneText + '\n\n';

    for (let i = 0; i < count; i++) {
        output += `${i + 1}. ${engine.getChoiceText(i)}\n`;
    }

    output += `\nВыберите действие (1-${count}) и нажмите Enter:`;

    gameContainer.textContent = output;

    controls.disabled = false;
    controls.value = '';
    controls.focus();
}

// Добавляем слушатель только один раз
controls.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        const inputVal = controls.value.trim();
        const count = engine.getChoiceCount();
        const index = parseInt(inputVal, 10);

        if (!inputVal) {
            alert('Введите число!');
            return;
        }

        if (isNaN(index) || index < 1 || index > count) {
            alert(`Введите число от 1 до ${count}`);
            return;
        }

        engine.choose(index - 1);
        render();
    }
});

function startGame(jsonData) {
    engine.loadScript(jsonData);
    controls.disabled = false;
    controls.value = '';
    controls.focus();
}