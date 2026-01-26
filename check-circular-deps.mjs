#!/usr/bin/env node
/**
 * Verificar dependencias circulares en módulos de siniestros
 */

console.log('🔄 VERIFICANDO DEPENDENCIAS CIRCULARES\n');

import fs from 'fs';

const modules = {
    'siniestros-crud.js': './assets/js/siniestros/siniestros-crud.js',
    'siniestros-search.js': './assets/js/siniestros/siniestros-search.js',
    'siniestros-reports.js': './assets/js/siniestros/siniestros-reports.js'
};

// Analizar imports de cada módulo
const dependencies = {};

for (const [name, path] of Object.entries(modules)) {
    const content = fs.readFileSync(path, 'utf-8');

    // Extraer todos los imports que empiecen con './' o '../'
    const importRegex = /import\s+.*?\s+from\s+['"](\..+?)['"]/g;
    const matches = [...content.matchAll(importRegex)];

    dependencies[name] = matches.map(m => {
        const importPath = m[1];
        // Normalizar el path
        if (importPath.includes('siniestros-crud.js')) return 'siniestros-crud.js';
        if (importPath.includes('siniestros-search.js')) return 'siniestros-search.js';
        if (importPath.includes('siniestros-reports.js')) return 'siniestros-reports.js';
        return null;
    }).filter(Boolean);
}

console.log('📦 Dependencias detectadas:\n');
for (const [module, deps] of Object.entries(dependencies)) {
    if (deps.length === 0) {
        console.log(`   ${module} → (sin dependencias entre módulos siniestros)`);
    } else {
        console.log(`   ${module} → ${deps.join(', ')}`);
    }
}

// Verificar ciclos
console.log('\n🔍 Verificando ciclos:\n');

function hasCycle(module, visited = new Set(), path = []) {
    if (visited.has(module)) {
        console.log(`   ❌ CICLO DETECTADO: ${[...path, module].join(' → ')}`);
        return true;
    }

    visited.add(module);
    path.push(module);

    const deps = dependencies[module] || [];
    for (const dep of deps) {
        if (hasCycle(dep, new Set(visited), [...path])) {
            return true;
        }
    }

    return false;
}

let cyclesFound = false;
for (const module of Object.keys(dependencies)) {
    if (hasCycle(module)) {
        cyclesFound = true;
    }
}

if (!cyclesFound) {
    console.log('   ✅ No se detectaron dependencias circulares');
}

// Mostrar grafo de dependencias
console.log('\n📊 Grafo de dependencias:\n');
console.log('   ┌─ siniestros-crud.js');
console.log('   │   └─ imports: supabase.js, auth.js, utils.js');
console.log('   │');
console.log('   ┌─ siniestros-search.js');
console.log('   │   └─ imports: supabase.js, auth.js, utils.js');
console.log('   │');
console.log('   ┌─ siniestros-reports.js');
console.log('   │   └─ imports: auth.js, utils.js, siniestros-search.js');
console.log('   │');
console.log('   └─ siniestros.js (bridge)');
console.log('       └─ re-exports: crud, search, reports');

console.log('\n' + '='.repeat(60));
if (!cyclesFound) {
    console.log('✅ ARQUITECTURA LIMPIA: No hay dependencias circulares\n');
    process.exit(0);
} else {
    console.log('❌ PROBLEMA: Se encontraron dependencias circulares\n');
    process.exit(1);
}
