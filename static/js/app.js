document.addEventListener('DOMContentLoaded', () => {
    // Элементы DOM
    const writeMode = document.getElementById('writeMode');
    const replyMode = document.getElementById('replyMode');
    const originalTextContainer = document.getElementById('originalTextContainer');
    const originalText = document.getElementById('originalText');
    const userInput = document.getElementById('userInput');
    const inputLabel = document.getElementById('inputLabel');
    const generateBtn = document.getElementById('generateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultText = document.getElementById('resultText');
    const copyBtn = document.getElementById('copyBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const paramButtons = document.querySelectorAll('.param-btn');
    const customToneInput = document.getElementById('customToneInput');
    const customFormatInput = document.getElementById('customFormatInput');
    const customToneTags = document.getElementById('customToneTags');
    const customFormatTags = document.getElementById('customFormatTags');

    // Текущий режим
    let currentMode = 'write';

    // Скрываем индикаторы при загрузке страницы
    loadingIndicator.classList.add('hidden');
    errorMessage.classList.add('hidden');

    // Текущие параметры
    let currentParams = {
        tone: 'auto',
        format: 'auto',
        length: 'auto',
        customTone: [],
        customFormat: []
    };
    
    // Хранение текста для разных режимов
    let writeText = '';
    let replyText = '';
    let originalReplyText = '';

    // Обработчики режимов
    writeMode.addEventListener('click', () => setMode('write'));
    replyMode.addEventListener('click', () => setMode('reply'));

    // Установка режима
    function setMode(mode) {
        currentMode = mode;
        if (mode === 'write') {
            // Сохраняем текст из режима ответа
            if (originalTextContainer.classList.contains('hidden') === false) {
                replyText = userInput.value;
                originalReplyText = originalText.value;
            }
            
            writeMode.classList.add('active');
            replyMode.classList.remove('active');
            originalTextContainer.classList.add('hidden');
            inputLabel.textContent = 'О чем вы хотите написать?';
            userInput.placeholder = 'Введите тему или описание...';
            
            // Восстанавливаем текст из режима написания
            userInput.value = writeText;
        } else {
            // Сохраняем текст из режима написания
            if (originalTextContainer.classList.contains('hidden') === true) {
                writeText = userInput.value;
            }
            
            writeMode.classList.remove('active');
            replyMode.classList.add('active');
            originalTextContainer.classList.remove('hidden');
            inputLabel.textContent = 'Как вы хотите ответить?';
            userInput.placeholder = 'Опишите, как вы хотите ответить...';
            
            // Восстанавливаем текст из режима ответа
            userInput.value = replyText;
            originalText.value = originalReplyText;
        }
        
        // Скрываем результаты и ошибки при смене режима
        resultContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
        
        // Очищаем валидацию
        clearValidation(userInput);
        clearValidation(originalText);
    }

    // Обработчики параметров
    paramButtons.forEach(button => {
        button.addEventListener('click', () => {
            const param = button.dataset.param;
            const value = button.dataset.value;
            
            if (value === 'custom') {
                // Показываем поле ввода для пользовательского параметра
                if (param === 'tone') {
                    customToneInput.classList.remove('hidden');
                    customToneInput.querySelector('input').focus();
                } else if (param === 'format') {
                    customFormatInput.classList.remove('hidden');
                    customFormatInput.querySelector('input').focus();
                }
                return;
            }
            
            // Обновление UI
            document.querySelectorAll(`.param-btn[data-param="${param}"]`)
                .forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Обновление параметров
            currentParams[param] = value;
        });
    });

    // Обработка пользовательских параметров
    function setupCustomInput(inputContainer, tagsContainer, paramType) {
        const input = inputContainer.querySelector('input');
        const applyBtn = inputContainer.querySelector('.apply-btn');
        const cancelBtn = inputContainer.querySelector('.cancel-btn');

        applyBtn.addEventListener('click', () => {
            const value = input.value.trim();
            if (value) {
                addCustomTag(value, tagsContainer, paramType);
                input.value = '';
                inputContainer.classList.add('hidden');
            }
        });

        cancelBtn.addEventListener('click', () => {
            input.value = '';
            inputContainer.classList.add('hidden');
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyBtn.click();
            }
        });
    }

    function addCustomTag(value, container, paramType) {
        const tag = document.createElement('div');
        tag.className = 'custom-tag';
        tag.innerHTML = `
            <span>${value}</span>
            <button><i class="fas fa-times"></i></button>
        `;

        tag.querySelector('button').addEventListener('click', () => {
            currentParams[`custom${paramType}`] = currentParams[`custom${paramType}`]
                .filter(item => item !== value);
            tag.remove();
        });

        container.appendChild(tag);
        currentParams[`custom${paramType}`].push(value);
    }

    setupCustomInput(customToneInput, customToneTags, 'Tone');
    setupCustomInput(customFormatInput, customFormatTags, 'Format');

    // Функция валидации поля
    function validateField(field, message) {
        const isValid = field.value.trim().length > 0;
        field.classList.toggle('invalid', !isValid);
        field.nextElementSibling.classList.toggle('show', !isValid);
        return isValid;
    }

    // Очистка валидации
    function clearValidation(field) {
        field.classList.remove('invalid');
        field.nextElementSibling.classList.remove('show');
    }

    // Обработчики ввода для очистки валидации
    userInput.addEventListener('input', () => clearValidation(userInput));
    originalText.addEventListener('input', () => clearValidation(originalText));

    // Генерация текста
    generateBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();
        const origText = originalText.value.trim();
        
        // Валидация полей
        const isUserInputValid = validateField(userInput);
        const isOriginalTextValid = currentMode === 'reply' ? validateField(originalText) : true;
        
        if (!isUserInputValid || !isOriginalTextValid) {
            return;
        }
        
        // Показываем индикатор загрузки и скрываем остальные элементы результата
        loadingIndicator.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
        
        try {
            console.log('Отправка запроса на генерацию текста...');
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mode: currentMode,
                    text: text,
                    originalText: origText,
                    ...currentParams
                })
            });
            
            const data = await response.json();
            
            // Скрываем индикатор загрузки
            loadingIndicator.classList.add('hidden');
            
            if (data.success) {
                resultText.textContent = data.result;
                resultContainer.classList.remove('hidden');
                errorMessage.classList.add('hidden');
            } else {
                errorMessage.querySelector('p').textContent = 
                    data.error || 'Произошла ошибка. Пожалуйста, попробуйте еще раз.';
                errorMessage.classList.remove('hidden');
                resultContainer.classList.add('hidden');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            loadingIndicator.classList.add('hidden');
            errorMessage.classList.remove('hidden');
            resultContainer.classList.add('hidden');
        }
    });

    // Очистка формы
    clearBtn.addEventListener('click', () => {
        // Очистка текстовых полей
        userInput.value = '';
        originalText.value = '';
        
        // Очистка переменных для хранения текста
        writeText = '';
        replyText = '';
        originalReplyText = '';
        
        // Очистка пользовательских полей ввода
        document.querySelector('#customToneInput input').value = '';
        document.querySelector('#customFormatInput input').value = '';
        
        // Сброс всех кнопок параметров на "Авто"
        document.querySelectorAll('.param-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.value === 'auto') {
                btn.classList.add('active');
            }
        });
        
        // Очистка пользовательских тегов
        customToneTags.innerHTML = '';
        customFormatTags.innerHTML = '';
        
        // Сброс текущих параметров
        currentParams = {
            tone: 'auto',
            format: 'auto',
            length: 'auto',
            customTone: [],
            customFormat: []
        };
        
        // Скрытие результатов и ошибок
        resultContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
        
        // Очистка валидации
        clearValidation(userInput);
        clearValidation(originalText);
    });

    // Копирование результата
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(resultText.textContent)
            .then(() => {
                const originalIcon = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = originalIcon;
                }, 1500);
            })
            .catch(err => console.error('Ошибка при копировании:', err));
    });

    // Инициализация
    setMode('write');
    console.log('Приложение инициализировано и готово к использованию');
}); 