from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import requests
import os
import logging
import uuid
from datetime import datetime, timedelta
import urllib3

# Отключаем предупреждения о небезопасных SSL-сертификатах
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()

app = Flask(__name__)

# Глобальные переменные для хранения токена
access_token = None
token_expiry = None

def get_token():
    """Получение токена доступа"""
    global access_token, token_expiry
    
    # Проверяем, есть ли действующий токен
    if access_token and token_expiry and datetime.now() < token_expiry:
        return access_token

    try:
        rq_uid = str(uuid.uuid4())
        url = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'RqUID': rq_uid,
            'Authorization': f'Basic {os.getenv("GIGACHAT_API_KEY")}'
        }
        payload = {
            'scope': 'GIGACHAT_API_PERS'
        }

        response = requests.post(url, headers=headers, data=payload, verify=False)
        response.raise_for_status()
        
        data = response.json()
        access_token = data['access_token']
        # Устанавливаем срок действия токена на 30 минут
        token_expiry = datetime.now() + timedelta(minutes=30)
        
        logger.info("Токен доступа успешно получен")
        return access_token

    except Exception as e:
        logger.error(f"Ошибка при получении токена: {str(e)}")
        raise

def chat_completion(prompt):
    """Отправка запроса к GigaChat API"""
    try:
        token = get_token()
        url = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f'Bearer {token}'
        }
        
        payload = {
            "model": "GigaChat",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "top_p": 0.1,
            "n": 1,
            "stream": False,
            "max_tokens": 1500,
            "repetition_penalty": 1
        }

        response = requests.post(url, headers=headers, json=payload, verify=False)
        response.raise_for_status()
        
        return response.json()['choices'][0]['message']['content']

    except Exception as e:
        logger.error(f"Ошибка при генерации текста: {str(e)}")
        raise

@app.route('/')
def index():
    """Отображение главной страницы"""
    return render_template('index.html')

@app.route('/api/generate', methods=['POST'])
def generate_text():
    """Обработка запроса на генерацию текста"""
    try:
        logger.info("Получен запрос на генерацию текста")
        data = request.json
        logger.info(f"Параметры запроса: {data}")
        
        # Проверка входных данных
        if not data.get('text'):
            logger.warning("Отсутствует текст для генерации")
            return jsonify({
                'success': False,
                'error': 'Пожалуйста, введите текст для генерации'
            }), 400

        if data.get('mode') == 'reply' and not data.get('originalText'):
            logger.warning("Отсутствует оригинальное сообщение для режима ответа")
            return jsonify({
                'success': False,
                'error': 'Пожалуйста, введите оригинальное сообщение для ответа'
            }), 400

        # Формирование промпта
        prompt = create_prompt(data)
        logger.info(f"Сформированный промпт: {prompt}")
        
        # Отправка запроса к GigaChat API
        logger.info("Отправка запроса к GigaChat API")
        result = chat_completion(prompt)
        logger.info("Получен ответ от GigaChat API")

        return jsonify({
            'success': True,
            'result': result
        })

    except Exception as e:
        logger.error(f"Ошибка при генерации текста: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.'
        }), 500

def create_prompt(data):
    """Создание промпта на основе параметров запроса"""
    mode = data.get('mode', 'write')
    text = data.get('text', '')
    original_text = data.get('originalText', '')
    tone = data.get('tone', 'auto')
    format_type = data.get('format', 'auto')
    length = data.get('length', 'auto')
    custom_tone = data.get('customTone', [])
    custom_format = data.get('customFormat', [])

    # Базовый промпт
    if mode == 'write':
        prompt = f'Напиши текст на тему: "{text}".'
    else:
        prompt = f'Вот оригинальное сообщение: "{original_text}". \nНапиши ответ, учитывая следующее: "{text}".'

    # Добавление параметров
    if tone and tone != 'auto':
        prompt += f' Используй {tone} тон.'
    
    # Добавление пользовательских параметров тона
    if custom_tone:
        prompt += f' Дополнительные требования к тону: {", ".join(custom_tone)}.'

    if format_type and format_type != 'auto':
        prompt += f' Формат сообщения: {format_type}.'
    
    # Добавление пользовательских параметров формата
    if custom_format:
        prompt += f' Дополнительные требования к формату: {", ".join(custom_format)}.'

    if length and length != 'auto':
        length_desc = {
            'short': 'короткий (1-2 предложения)',
            'medium': 'средний (3-5 предложений)',
            'long': 'длинный (более 5 предложений)'
        }.get(length)
        if length_desc:
            prompt += f' Длина ответа: {length_desc}.'

    return prompt

if __name__ == '__main__':
    # Загрузка конфигурации
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    # Запуск сервера
    logger.info(f"Запуск сервера на порту {port}")
    app.run(host='0.0.0.0', port=port, debug=debug) 