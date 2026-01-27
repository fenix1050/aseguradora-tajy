// ============================================
// DIAGNÓSTICO DE REALTIME
// ============================================
// Ejecuta este código en la consola del navegador para diagnosticar problemas

console.log('🔍 INICIANDO DIAGNÓSTICO DE REALTIME\n');

async function diagnosticarRealtime() {
    const resultados = [];

    // 1. Verificar que Supabase esté cargado
    console.log('1️⃣ Verificando Supabase...');
    if (typeof supabase !== 'undefined') {
        resultados.push('✅ Supabase client está cargado');
    } else {
        resultados.push('❌ Supabase client NO está cargado');
        console.error('PROBLEMA CRÍTICO: Supabase no está cargado');
        return resultados;
    }

    // 2. Verificar usuario autenticado
    console.log('2️⃣ Verificando autenticación...');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        resultados.push(`✅ Usuario autenticado: ${user.id}`);
    } else {
        resultados.push('❌ NO hay usuario autenticado');
        return resultados;
    }

    // 3. Verificar conexión a Supabase
    console.log('3️⃣ Verificando conexión a base de datos...');
    try {
        const { data, error } = await supabase
            .from('siniestros')
            .select('id')
            .limit(1);

        if (error) {
            resultados.push(`❌ Error de conexión: ${error.message}`);
        } else {
            resultados.push('✅ Conexión a base de datos OK');
        }
    } catch (e) {
        resultados.push(`❌ Error al conectar: ${e.message}`);
    }

    // 4. Test de Realtime
    console.log('4️⃣ Testeando suscripción Realtime...');

    let eventoRecibido = false;
    const testChannel = supabase
        .channel('test-realtime-' + Date.now())
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'siniestros',
                filter: `user_id=eq.${user.id}`
            },
            (payload) => {
                console.log('✅ ¡EVENTO RECIBIDO!', payload);
                eventoRecibido = true;
            }
        )
        .subscribe((status) => {
            console.log('Estado de suscripción:', status);
        });

    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar si se suscribió correctamente
    if (testChannel.state === 'joined') {
        resultados.push('✅ Canal Realtime suscrito correctamente');

        // Hacer una actualización de prueba
        console.log('5️⃣ Editando un siniestro para generar evento...');
        console.log('   Por favor, edita UN siniestro ahora...');
        console.log('   Esperando 10 segundos...');

        await new Promise(resolve => setTimeout(resolve, 10000));

        if (eventoRecibido) {
            resultados.push('✅ ¡EVENTO RECIBIDO! Realtime funciona correctamente');
        } else {
            resultados.push('❌ NO se recibió evento. Realtime NO está funcionando');
            resultados.push('   Posible causa: Realtime no habilitado en tabla siniestros');
        }
    } else {
        resultados.push(`❌ Canal Realtime NO se suscribió (estado: ${testChannel.state})`);
    }

    // Limpiar canal de prueba
    await supabase.removeChannel(testChannel);

    // 5. Verificar permisos de notificaciones del navegador
    console.log('6️⃣ Verificando permisos de notificaciones...');
    if ('Notification' in window) {
        resultados.push(`ℹ️  Permisos de notificaciones: ${Notification.permission}`);
        if (Notification.permission === 'granted') {
            resultados.push('✅ Notificaciones del navegador habilitadas');
        } else if (Notification.permission === 'denied') {
            resultados.push('⚠️  Notificaciones del navegador bloqueadas');
        } else {
            resultados.push('ℹ️  Notificaciones no solicitadas aún');
        }
    } else {
        resultados.push('❌ Navegador no soporta notificaciones');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADOS DEL DIAGNÓSTICO');
    console.log('='.repeat(60));
    resultados.forEach(r => console.log(r));
    console.log('='.repeat(60) + '\n');

    return resultados;
}

// Ejecutar diagnóstico
diagnosticarRealtime().then(() => {
    console.log('✅ Diagnóstico completado');
}).catch(error => {
    console.error('❌ Error en diagnóstico:', error);
});
