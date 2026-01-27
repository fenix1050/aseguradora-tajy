// ============================================
// TEST RÁPIDO DE REALTIME
// ============================================
// Pega este código en la consola del navegador

console.clear();
console.log('%c🧪 TEST RÁPIDO DE REALTIME', 'font-size: 20px; font-weight: bold; color: #2196f3');
console.log('');

(async () => {
    // 1. Verificar usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('%c❌ NO hay usuario autenticado', 'color: red; font-weight: bold');
        return;
    }
    console.log('%c✅ Usuario autenticado:', 'color: green', user.id);

    // 2. Crear canal de prueba
    console.log('%cCreando canal de prueba...', 'color: blue');

    let eventoRecibido = false;

    const testChannel = supabase
        .channel('test-' + Date.now())
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'siniestros',
                filter: `user_id=eq.${user.id}`
            },
            (payload) => {
                console.log('%c🔔 ¡EVENTO RECIBIDO!', 'color: green; font-size: 16px; font-weight: bold');
                console.log('Tipo:', payload.eventType);
                console.log('Datos:', payload);
                eventoRecibido = true;
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('%c✅ Canal suscrito correctamente', 'color: green');
                console.log('');
                console.log('%c⏳ AHORA: Edita un siniestro y guárdalo', 'color: orange; font-size: 14px; font-weight: bold');
                console.log('%cEsperando eventos...', 'color: gray');
            } else {
                console.log('%c⚠️  Estado del canal:', 'color: orange', status);
            }
        });

    // Esperar 30 segundos
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log('');
    console.log('%c⏱️  Tiempo agotado (30 segundos)', 'color: gray');

    if (eventoRecibido) {
        console.log('%c🎉 ¡ÉXITO! Realtime funciona correctamente', 'color: green; font-size: 16px; font-weight: bold');
    } else {
        console.log('%c❌ PROBLEMA: No se recibió ningún evento', 'color: red; font-size: 16px; font-weight: bold');
        console.log('');
        console.log('%cSolución:', 'font-weight: bold');
        console.log('1. Ve a Supabase Dashboard');
        console.log('2. Database → Replication');
        console.log('3. Habilita Realtime en tabla "siniestros"');
        console.log('4. Guarda cambios y recarga la página');
        console.log('');
        console.log('%cMás info: Ver archivo HABILITAR_REALTIME.md', 'color: blue');
    }

    // Limpiar
    await supabase.removeChannel(testChannel);
})();
