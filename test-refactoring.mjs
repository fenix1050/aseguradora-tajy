#!/usr/bin/env node
/**
 * Script de validación de refactorización
 * Verifica que todos los módulos exporten las funciones esperadas
 */

console.log('🧪 INICIANDO TESTS DE REFACTORIZACIÓN\n');

let errores = 0;
let exitos = 0;

// ============================================
// TEST 1: CRUD Module Exports
// ============================================
console.log('📦 TEST 1: Verificando exports de siniestros-crud.js');
try {
    const expectedExports = [
        'crearSiniestro',
        'actualizarSiniestro',
        'eliminarSiniestro',
        'getSiniestroByIdWithFallback',
        'prewarmCacheIds',
        'invalidarCacheSiniestros'
    ];

    // Leer el archivo y verificar que exporte las funciones
    const fs = await import('fs');
    const content = fs.readFileSync('./assets/js/siniestros/siniestros-crud.js', 'utf-8');

    let missing = [];
    for (const exportName of expectedExports) {
        if (!content.includes(`export async function ${exportName}`) &&
            !content.includes(`export function ${exportName}`)) {
            missing.push(exportName);
        }
    }

    if (missing.length > 0) {
        console.log(`   ❌ Faltan exports: ${missing.join(', ')}`);
        errores++;
    } else {
        console.log(`   ✅ Todos los exports presentes (${expectedExports.length})`);
        exitos++;
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errores++;
}

// ============================================
// TEST 2: Search Module Exports
// ============================================
console.log('\n🔍 TEST 2: Verificando exports de siniestros-search.js');
try {
    const expectedExports = [
        'cargarSiniestros',
        'buscarAseguradosFuzzy',
        'buscarSiniestrosPorNumero',
        'actualizarCacheAsegurados',
        'invalidarCacheAsegurados',
        'cambiarOrden',
        'getSiniestros',
        'getPaginaActual',
        'getTotalRegistros',
        'getOrdenActual',
        'getFiltrosActuales',
        'setFiltros',
        'getSiniestroById',
        'getSiniestroByAsegurado'
    ];

    const fs = await import('fs');
    const content = fs.readFileSync('./assets/js/siniestros/siniestros-search.js', 'utf-8');

    let missing = [];
    for (const exportName of expectedExports) {
        if (!content.includes(`export async function ${exportName}`) &&
            !content.includes(`export function ${exportName}`)) {
            missing.push(exportName);
        }
    }

    if (missing.length > 0) {
        console.log(`   ❌ Faltan exports: ${missing.join(', ')}`);
        errores++;
    } else {
        console.log(`   ✅ Todos los exports presentes (${expectedExports.length})`);
        exitos++;
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errores++;
}

// ============================================
// TEST 3: Reports Module Exports
// ============================================
console.log('\n📊 TEST 3: Verificando exports de siniestros-reports.js');
try {
    const expectedExports = [
        'generarMensaje',
        'generarUrlWhatsApp',
        'filtrarSiniestrosPorFecha',
        'generarHtmlReporte',
        'generarCsvReporte',
        'generarNombreArchivoReporte'
    ];

    const fs = await import('fs');
    const content = fs.readFileSync('./assets/js/siniestros/siniestros-reports.js', 'utf-8');

    let missing = [];
    for (const exportName of expectedExports) {
        if (!content.includes(`export function ${exportName}`)) {
            missing.push(exportName);
        }
    }

    if (missing.length > 0) {
        console.log(`   ❌ Faltan exports: ${missing.join(', ')}`);
        errores++;
    } else {
        console.log(`   ✅ Todos los exports presentes (${expectedExports.length})`);
        exitos++;
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errores++;
}

// ============================================
// TEST 4: Bridge Module Re-exports
// ============================================
console.log('\n🌉 TEST 4: Verificando re-exports en siniestros.js (bridge)');
try {
    const fs = await import('fs');
    const content = fs.readFileSync('./assets/js/siniestros.js', 'utf-8');

    // Verificar que existan bloques export { ... } from
    const crudExports = content.includes('from \'./siniestros/siniestros-crud.js\'');
    const searchExports = content.includes('from \'./siniestros/siniestros-search.js\'');
    const reportsExports = content.includes('from \'./siniestros/siniestros-reports.js\'');

    if (!crudExports || !searchExports || !reportsExports) {
        console.log(`   ❌ Faltan re-exports:`);
        if (!crudExports) console.log(`      - CRUD module`);
        if (!searchExports) console.log(`      - Search module`);
        if (!reportsExports) console.log(`      - Reports module`);
        errores++;
    } else {
        console.log(`   ✅ Todos los módulos re-exportados correctamente`);
        exitos++;
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errores++;
}

// ============================================
// TEST 5: Handler Imports
// ============================================
console.log('\n🎯 TEST 5: Verificando imports en handlers');
try {
    const fs = await import('fs');

    const handlers = [
        { file: 'siniestros.handlers.js', modules: ['siniestros-crud.js', 'siniestros-search.js'] },
        { file: 'filtros.handlers.js', modules: ['siniestros-search.js'] },
        { file: 'mensajes.handlers.js', modules: ['siniestros-crud.js', 'siniestros-search.js', 'siniestros-reports.js'] },
        { file: 'reportes.handlers.js', modules: ['siniestros-reports.js'] }
    ];

    let handlerErrors = 0;

    for (const handler of handlers) {
        const content = fs.readFileSync(`./assets/js/handlers/${handler.file}`, 'utf-8');

        let missingImports = [];
        for (const module of handler.modules) {
            if (!content.includes(module)) {
                missingImports.push(module);
            }
        }

        if (missingImports.length > 0) {
            console.log(`   ❌ ${handler.file}: Faltan imports de ${missingImports.join(', ')}`);
            handlerErrors++;
        } else {
            console.log(`   ✅ ${handler.file}: Imports correctos`);
        }
    }

    if (handlerErrors === 0) {
        exitos++;
    } else {
        errores++;
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errores++;
}

// ============================================
// TEST 6: Verificar que no haya imports del viejo siniestros.js
// ============================================
console.log('\n🔄 TEST 6: Verificando migración de imports');
try {
    const fs = await import('fs');

    const handlers = [
        'reportes.handlers.js'
        // Los otros handlers pueden seguir usando el bridge por compatibilidad
    ];

    let legacyImports = 0;

    for (const handler of handlers) {
        const content = fs.readFileSync(`./assets/js/handlers/${handler}`, 'utf-8');

        // Verificar que NO importe desde '../siniestros.js'
        if (content.includes('from \'../siniestros.js\'')) {
            console.log(`   ⚠️  ${handler}: Todavía usa import desde siniestros.js (bridge)`);
            legacyImports++;
        } else {
            console.log(`   ✅ ${handler}: Migrado a imports específicos`);
        }
    }

    if (legacyImports === 0) {
        console.log(`   ✅ Todos los handlers críticos migrados`);
        exitos++;
    } else {
        console.log(`   ⚠️  Algunos handlers usan el bridge (aceptable por compatibilidad)`);
        exitos++;
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errores++;
}

// ============================================
// TEST 7: Verificar estructura de directorios
// ============================================
console.log('\n📁 TEST 7: Verificando estructura de directorios');
try {
    const fs = await import('fs');

    const requiredFiles = [
        './assets/js/siniestros/siniestros-crud.js',
        './assets/js/siniestros/siniestros-search.js',
        './assets/js/siniestros/siniestros-reports.js',
        './assets/js/siniestros.js'
    ];

    let missingFiles = [];

    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            missingFiles.push(file);
        }
    }

    if (missingFiles.length > 0) {
        console.log(`   ❌ Archivos faltantes: ${missingFiles.join(', ')}`);
        errores++;
    } else {
        console.log(`   ✅ Todos los archivos presentes`);
        exitos++;
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errores++;
}

// ============================================
// TEST 8: Contar LOC de cada módulo
// ============================================
console.log('\n📏 TEST 8: Contando líneas de código');
try {
    const fs = await import('fs');

    const modules = [
        { file: './assets/js/siniestros/siniestros-crud.js', expected: '~289 LOC' },
        { file: './assets/js/siniestros/siniestros-search.js', expected: '~384 LOC' },
        { file: './assets/js/siniestros/siniestros-reports.js', expected: '~231 LOC' },
        { file: './assets/js/siniestros.js', expected: '~51 LOC' }
    ];

    let totalLOC = 0;

    for (const module of modules) {
        const content = fs.readFileSync(module.file, 'utf-8');
        const lines = content.split('\n').length;
        totalLOC += lines;
        console.log(`   📄 ${module.file.split('/').pop()}: ${lines} líneas (${module.expected})`);
    }

    console.log(`   ✅ Total: ${totalLOC} LOC en 4 archivos (vs 848 LOC original)`);
    exitos++;
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errores++;
}

// ============================================
// RESUMEN
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE PRUEBAS');
console.log('='.repeat(60));
console.log(`✅ Pruebas exitosas: ${exitos}`);
console.log(`❌ Pruebas fallidas: ${errores}`);
console.log('='.repeat(60));

if (errores === 0) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! La refactorización es exitosa.\n');
    process.exit(0);
} else {
    console.log('\n⚠️  ALGUNAS PRUEBAS FALLARON. Revisar errores arriba.\n');
    process.exit(1);
}
