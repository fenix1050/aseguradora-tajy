# 🎨 Instrucciones para el Logo

## 📁 Ubicación del Archivo

He modificado [app.html](app.html:473) para que cargue una imagen local como logo.

El código ahora busca un archivo llamado:
```
logo.png
```

Este archivo debe estar en la **misma carpeta** que `app.html`.

---

## 📏 Especificaciones Recomendadas

- **Formato:** PNG (con fondo transparente) o JPG
- **Tamaño recomendado:** 200x200 píxeles o mayor
- **Aspecto:** Cuadrado o casi cuadrado
- **Peso:** Menos de 500 KB para carga rápida

---

## 🔧 Cómo Agregar tu Logo

### Opción 1: Usar el nombre predeterminado

1. Renombra tu imagen a `logo.png`
2. Cópiala en la carpeta del proyecto:
   ```
   e:\Proyectos\Sistema de Gestion - Aseguradora Tajy\
   ```
3. Recarga la página en el navegador (`Ctrl + F5`)

### Opción 2: Usar otro nombre de archivo

Si prefieres otro nombre (ejemplo: `tajy-logo.jpg`):

1. Copia tu imagen a la carpeta del proyecto
2. Abre [app.html](app.html:473)
3. Busca la línea 473:
   ```html
   <img src="logo.png" alt="Logo Aseguradora Tajy">
   ```
4. Cambia `logo.png` por tu nombre de archivo:
   ```html
   <img src="tajy-logo.jpg" alt="Logo Aseguradora Tajy">
   ```
5. Guarda el archivo
6. Recarga la página (`Ctrl + F5`)

---

## 🎯 Ubicación Actual

La carpeta del proyecto es:
```
e:\Proyectos\Sistema de Gestion - Aseguradora Tajy\
```

Coloca tu archivo de imagen directamente en esta carpeta, junto a:
- app.html
- app.js
- index.html
- config.js
- etc.

---

## 🖼️ Ejemplo de Estructura de Archivos

```
Sistema de Gestion - Aseguradora Tajy/
├── app.html
├── app.js
├── logo.png          ← Tu logo aquí
├── index.html
├── config.js
├── iniciar_servidor.bat
└── ...
```

---

## ⚠️ Solución de Problemas

### Si no se ve el logo:

1. **Verifica el nombre del archivo:**
   - Debe ser exactamente `logo.png` (minúsculas)
   - Revisa la extensión (.png, .jpg, etc.)

2. **Verifica la ubicación:**
   - El archivo debe estar en la misma carpeta que `app.html`
   - NO en una subcarpeta

3. **Recarga la página:**
   - Presiona `Ctrl + F5` para forzar recarga
   - O cierra y vuelve a abrir el navegador

4. **Revisa la consola (F12):**
   - Si hay un error, aparecerá en rojo
   - El error dirá "404 Not Found" si no encuentra el archivo

### Si el logo se ve distorsionado:

Ajusta el tamaño en el CSS de [app.html](app.html:62-76):

```css
.logo {
    width: 60px;    /* Aumenta si quieres más grande */
    height: 60px;   /* Aumenta si quieres más grande */
    border-radius: 10px;
    overflow: hidden;
}
```

---

## 🎨 Cambios Realizados

### CSS ([app.html](app.html:62-76)):
- Removido `background: var(--primary)`
- Agregado `overflow: hidden` para bordes redondeados
- Agregado estilo para la imagen: `object-fit: contain`

### HTML ([app.html](app.html:472-474)):
- Reemplazado emoji 🛡️ por etiqueta `<img>`
- Ruta del archivo: `logo.png`
- Texto alternativo: "Logo Aseguradora Tajy"

---

## ✅ Próximos Pasos

1. Consigue o crea el logo de Aseguradora Tajy
2. Guárdalo como `logo.png` en la carpeta del proyecto
3. Recarga la página
4. ¡Listo! Deberías ver tu logo en la esquina superior izquierda

---

## 💡 Nota

Si no tienes un logo todavía, puedes:
- Usar un servicio como Canva para crear uno
- Descargar un icono de seguros de sitios como Flaticon
- Pedirle a un diseñador que cree uno personalizado
- Temporalmente, usar cualquier imagen cuadrada

El emoji 🛡️ seguirá apareciendo hasta que coloques el archivo `logo.png`.
