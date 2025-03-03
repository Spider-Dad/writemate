"""
Скрипт для генерации favicon.ico из SVG-файла.
Требует установки библиотек cairosvg и pillow:
pip install cairosvg pillow
"""

import os
import cairosvg
from PIL import Image
from io import BytesIO

# Путь к SVG-файлу
svg_path = os.path.join(os.path.dirname(__file__), 'favicon.svg')
# Путь для сохранения ICO-файла
ico_path = os.path.join(os.path.dirname(__file__), 'favicon.ico')

# Размеры иконок для ICO-файла
sizes = [16, 32, 48, 64, 128, 256]

# Создаем изображения разных размеров
images = []
for size in sizes:
    png_data = cairosvg.svg2png(url=svg_path, output_width=size, output_height=size)
    img = Image.open(BytesIO(png_data))
    images.append(img)

# Сохраняем как ICO-файл
images[0].save(
    ico_path,
    format='ICO',
    sizes=[(img.width, img.height) for img in images],
    append_images=images[1:]
)

print(f"Favicon.ico успешно создан: {ico_path}") 