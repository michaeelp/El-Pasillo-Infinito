# Migración opcional a Spark 1.3.1

Si Functions nunca llegó a crear perfiles en Firestore, no hace falta migrar. Publica las reglas de RTDB y la web nueva. Las cuentas de Authentication existentes siguen utilizando su correo y contraseña; si no tienen perfil, el juego permite completar uno.

Si hay progreso en Firestore, migra **antes de publicar la web 1.3.1** y con las partidas detenidas. La herramienta local lee perfiles y verifica que sus UID sigan existiendo en Auth, luego copia nombre, código, avatar, XP/nivel, estadísticas, logros, bestiario, recibos, amistades mutuas, solicitudes coherentes y récords Solo/Carrera/Cooperativo. No copia correo a RTDB. Convierte fechas a milisegundos y claves de equipo a los UID ordenados.

## Ejecutar desde tu ordenador

1. Instala Node.js y ejecuta `npm install` en el proyecto (`npm.cmd install` en PowerShell si `npm.ps1` está bloqueado).
2. En Firebase → Configuración del proyecto → Cuentas de servicio, genera una clave del proyecto que ya utilizas. Guarda el JSON **fuera del repositorio**, por ejemplo en una carpeta privada. No lo subas a GitHub. No es la configuración pública de `js/config.js`.
3. Comprueba que `FIREBASE_CONFIG.projectId` y `databaseURL` apuntan a ese proyecto.
4. En PowerShell, indica la ruta de la clave y ejecuta la vista previa:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\credenciales\pasillo-admin.json'
node tools/migrate-spark.mjs
```

5. Si la vista previa muestra las cuentas esperadas, ejecuta:

```powershell
node tools/migrate-spark.mjs --apply
```

La vista previa no modifica datos. `--apply` escribe la copia en RTDB en una única actualización atómica. No despliega servicios ni activa Blaze; son llamadas del SDK Admin ejecutadas localmente, sujetas a las cuotas de las bases. La herramienta limita el lote a 12 MB, comprueba nombres/códigos repetidos y no sobrescribe perfiles o récords nuevos que ya estén en RTDB. Una migración completada se reconoce por `migration/spark131`; repetir el comando no vuelve a copiarla.

Firestore y Authentication se conservan como origen. Después de comprobar la copia, publica `database.rules.json` en Realtime Database y la web nueva. Puedes cerrar el acceso del cliente a la base Firestore anterior pegando el `firestore.rules` incluido en su consola. La limpieza o eliminación del respaldo anterior es manual; el juego nuevo solo borra sus datos activos de RTDB y su cuenta Auth.

No se importan salas en curso, presencia ni invitaciones antiguas, porque son datos temporales. Los documentos sociales sin contraparte coherente se omiten. Los récords cuyos jugadores ya no tienen cuenta Auth se omiten. Si aparece un conflicto, la herramienta se detiene antes de escribir; conserva los datos originales y revisa el proyecto y las reservas.
