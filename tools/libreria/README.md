# Librería: BPM, tonalidad y Camelot

Analiza una carpeta de música en tu compu y te deja un CSV con BPM, tonalidad, número Camelot, duración y nivel de cada track. Sirve para curar los ~600 tracks de la Era I, preparar sets con mezcla armónica y llenar la hoja de catálogo sin abrir cada archivo.

Solo **lee** el audio: no mueve, no renombra y no toca ningún archivo. Nada sale de tu compu.

## Una sola vez

1. Node 22.6 o más nuevo (`node -v`).
2. ffmpeg: macOS `brew install ffmpeg` · Windows `winget install ffmpeg`.
3. En la carpeta del repo: `npm install`.

## Analizar una carpeta

```bash
npm run libreria -- analizar "/Users/axel/Música/Era I"
```

- Recorre subcarpetas. Lee WAV, AIFF, MP3, FLAC, M4A, AAC, OGG y Opus.
- Escribe `rommuser-libreria.csv` dentro de esa carpeta (o donde digás con `--csv otra/ruta.csv`).
- Guarda lo hecho en `.rommuser-libreria-cache.json` en la misma carpeta. La segunda vez solo analiza lo nuevo o lo que cambió, y si se corta a la mitad no perdés lo avanzado.
- Tarda unos 4 segundos por track de 6 minutos la primera vez (600 tracks ≈ 40 minutos).
- Rango de BPM por defecto 85–175. Para una carpeta de DnB: `--rango 160-185`. Para house/techno puro: `--rango 110-140` evita confusiones de medio tiempo.

Columnas: `archivo, carpeta, bpm, tonalidad, camelot, confianza_tonalidad, duracion, rms_dbfs, pico_dbfs, ruta`.

`confianza_tonalidad` va de 0 a 1. Debajo de 0.10 el track es ambiguo (pads atonales, tracks muy percusivos): revisalo a oído. El número Camelot es lo más confiable; la letra (A menor / B mayor) la decide el bajo y puede fallar en tracks sin línea de bajo clara.

## Qué mezcla con qué

```bash
npm run libreria -- compatibles "/Users/axel/Música/Era I/rommuser-libreria.csv" "pieces"
```

Lista los tracks en Camelot vecino (mismo número, ±1, o relativo mayor/menor) y a menos de 6 % de tempo, también a medio o doble tiempo. Cambiá el margen con `--tolerancia 3`.

## Llevarlo a Sheets

Archivo › Importar › Subir el CSV › "Insertar hoja nueva", separador coma. Si la hoja está en configuración regional con coma decimal, importá con "Convertir texto en números" apagado.
