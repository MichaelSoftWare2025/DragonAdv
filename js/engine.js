class Choice {
  constructor(text, nextScene, condition = null) {
    this.text = text;
    this.nextScene = nextScene;
    this.condition = condition; // условие для отображения выбора
  }
}

class Scene {
  constructor(text) {
    this.rawText = text;  // текст с возможными {set ...} и переменными
    this.text = "";       // обработанный текст без set, с подставленными переменными
    this.choices = [];
  }
}

class TextEngine {
  constructor() {
    this.script = new Map();
    this.currentSceneId = "start";
    this.state = {}; // глобальное состояние игры
  }

  loadScript(scriptData) {
    this.script.clear();
    for (const [id, sceneData] of Object.entries(scriptData)) {
      this.loadScene(id, sceneData.text);
      for (const choice of sceneData.choices) {
        this.addChoice(id, choice.text, choice.next, choice.condition);
      }
    }
    this.setCurrentScene("start");
  }

  loadScene(id, text) {
    const scene = new Scene(text);
    this.script.set(id, scene);
  }

  addChoice(sceneId, choiceText, nextSceneId, condition = null) {
    const scene = this.script.get(sceneId);
    if (scene) {
      scene.choices.push(new Choice(choiceText, nextSceneId, condition));
    }
  }

  setCurrentScene(id) {
    if (this.script.has(id)) {
      this.currentSceneId = id;
      this.processScene();
    } else {
      console.warn(`Сцена ${id} не найдена`);
    }
  }

  processScene() {
    const scene = this.script.get(this.currentSceneId);
    if (!scene) return;

    // Обрабатываем {set var = value} и обновляем состояние
    scene.text = this.processSetCommands(scene.rawText);

    // Подставляем переменные в текст
    scene.text = this.interpolateVariables(scene.text);
  }

  processSetCommands(text) {
    const setRegex = /\{set\s+(\w+)\s*=\s*(.+?)\}/g;
    let match;
    while ((match = setRegex.exec(text)) !== null) {
      const [, varName, rawValue] = match;
      try {
        // Парсим значение JSON, чтобы поддерживать числа, bool и строки
        this.state[varName] = JSON.parse(rawValue);
      } catch {
        // Если JSON.parse не сработал, ставим строку без кавычек
        this.state[varName] = rawValue.trim();
      }
    }
    // Удаляем все команды set из текста
    return text.replace(setRegex, '').trim();
  }

  interpolateVariables(text) {
    // Заменяем {varName} на текущее значение из состояния
    return text.replace(/\{(\w+)\}/g, (match, varName) => {
      if (this.state[varName] !== undefined) {
        return this.state[varName];
      }
      return `{${varName}}`; // Если переменная не найдена — оставляем как есть
    });
  }

  evaluateCondition(condition) {
    if (!condition) return true; // если условия нет, выбор доступен

    // Очень простой парсер условия, поддерживает:
    // hasKey == true, health > 10 и т.п.
    const operators = ['==', '!=', '>=', '<=', '>', '<'];
    let operatorFound = null;
    for (const op of operators) {
      if (condition.includes(op)) {
        operatorFound = op;
        break;
      }
    }
    if (!operatorFound) {
      console.warn('Неизвестный оператор в условии:', condition);
      return false;
    }

    const [leftRaw, rightRaw] = condition.split(operatorFound).map(s => s.trim());
    const left = this.state[leftRaw];
    let right;

    try {
      right = JSON.parse(rightRaw);
    } catch {
      right = rightRaw;
    }

    switch (operatorFound) {
      case '==': return left === right;
      case '!=': return left !== right;
      case '>=': return left >= right;
      case '<=': return left <= right;
      case '>':  return left > right;
      case '<':  return left < right;
      default: return false;
    }
  }

  getSceneText() {
    const scene = this.script.get(this.currentSceneId);
    return scene ? scene.text : "Сцена не найдена.";
  }

  getAvailableChoices() {
    const scene = this.script.get(this.currentSceneId);
    if (!scene) return [];

    // Возвращаем только те варианты, где условие true
    return scene.choices.filter(choice => this.evaluateCondition(choice.condition));
  }

  getChoiceText(index) {
    const choices = this.getAvailableChoices();
    if (index >= 0 && index < choices.length) {
      return choices[index].text;
    }
    return "";
  }

  choose(index) {
    const choices = this.getAvailableChoices();
    if (index >= 0 && index < choices.length) {
      const next = choices[index].nextScene;
      if (this.script.has(next)) {
        this.setCurrentScene(next);
      } else {
        console.warn(`Сцена ${next} не найдена`);
      }
    }
  }

  getCurrentSceneId() {
    return this.currentSceneId;
  }

  getChoiceCount() {
    return this.getAvailableChoices().length;
  }
}

export default TextEngine;
