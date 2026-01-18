#!/usr/bin/env python3
"""
Script para crear favicon desde el logo
Requiere: Pillow (pip install Pillow)
"""

try:
    from PIL import Image
    import os

    # Rutas
    logo_path = "logo/logo.png"
    favicon_ico = "favicon.ico"
    favicon_png = "favicon.png"

    print("🎨 Generando favicon desde logo...")

    # Abrir imagen original
    img = Image.open(logo_path)
    print(f"✅ Logo cargado: {img.size}")

    # Crear favicon.ico (múltiples tamaños)
    # ICO soporta múltiples resoluciones en un solo archivo
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]

    # Convertir a RGBA si no lo es
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Guardar como .ico con múltiples tamaños
    img.save(
        favicon_ico,
        format='ICO',
        sizes=sizes
    )
    print(f"✅ favicon.ico creado con tamaños: {sizes}")

    # Crear favicon.png de 32x32 para uso moderno
    img_32 = img.resize((32, 32), Image.Resampling.LANCZOS)
    img_32.save(favicon_png, format='PNG', optimize=True)
    print(f"✅ favicon.png creado (32x32)")

    print("\n🎉 Favicons generados exitosamente!")
    print(f"\nArchivos creados:")
    print(f"  - {favicon_ico} (múltiples tamaños)")
    print(f"  - {favicon_png} (32x32)")

except ImportError:
    print("❌ Error: Pillow no está instalado")
    print("\n📦 Instala Pillow con:")
    print("   pip install Pillow")
    print("\nO usa un servicio online:")
    print("   https://favicon.io/favicon-converter/")
    print("   https://realfavicongenerator.net/")

except FileNotFoundError:
    print("❌ Error: No se encontró logo/logo.png")
    print("Asegúrate de que el archivo exista en la carpeta 'logo'")

except Exception as e:
    print(f"❌ Error inesperado: {e}")
