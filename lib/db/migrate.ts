/**
 * Script de migración de base de datos utilizando Drizzle ORM con Neon Database
 * 
 * Este script ejecuta automáticamente las migraciones pendientes de la base de datos
 * utilizando la configuración de Drizzle ORM y una conexión serverless a Neon.
 * 
 * @author Sistema de Migración
 * @version 1.0.0
 * @requires drizzle-orm/neon-http/migrator
 * @requires drizzle-orm/neon-http
 * @requires @neondatabase/serverless
 * @requires dotenv
 */
// Importación de dependencias necesarias para la migración
import { migrate } from "drizzle-orm/neon-http/migrator";   // Función para ejecutar migraciones
import {drizzle} from "drizzle-orm/neon-http";              // Cliente ORM para conexiones HTTP con Neon
import {neon} from "@neondatabase/serverless";              // Cliente serverless de Neon Database
import * as dotenv from "dotenv";                           // Librería para manejo de variables de entorno


/**
 * Configuración de variables de entorno
 * Carga las variables desde el archivo .env.local en lugar del .env por defecto
 * Esto es común en aplicaciones Next.js donde se usa .env.local para desarrollo
 */
dotenv.config({path: ".env.local"})


/**
 * Validación de variable de entorno crítica
 * Verifica que la URL de la base de datos esté configurada correctamente
 * Si no existe, termina la ejecución inmediatamente para evitar errores
 */
if(!process.env.DATABASE_URL){
    throw new Error("Database url is not set in env.local");
}


/**
 * Función principal para ejecutar las migraciones de base de datos
 * 
 * Esta función asíncrona maneja todo el proceso de migración:
 * 1. Establece conexión con la base de datos
 * 2. Configura el cliente Drizzle ORM
 * 3. Ejecuta todas las migraciones pendientes
 * 4. Maneja errores y proporciona retroalimentación al usuario
 * 
 * @async
 * @function runMigration
 * @throws {Error} Si la migración falla por cualquier razón
 * @returns {Promise<void>} Promesa que se resuelve cuando las migraciones se completan exitosamente
 */
async function runMigration(){

    // Mensaje de inicio para seguimiento del proceso
    console.log("Starting database migration...");

    try {
        /**
         * Inicialización de la conexión a la base de datos
         * El operador ! indica que estamos seguros de que DATABASE_URL existe
         * (ya fue validado anteriormente)
         */
        const sql = neon(process.env.DATABASE_URL!);

        /**
         * Configuración del cliente Drizzle ORM
         * Utiliza la conexión SQL establecida para crear una instancia del ORM
        */
        const db = drizzle(sql);
        
         // Mensaje informativo sobre la ubicación de los archivos de migración
        console.log("Running migrations from ./drizzle folder");

        /**
         * Ejecución de las migraciones
         * La función migrate() busca y ejecuta todos los archivos de migración
         * ubicados en la carpeta especificada (./drizzle)
         * 
         * @param {Object} db - Instancia del cliente Drizzle ORM
         * @param {Object} options - Configuración de migración
         * @param {string} options.migrationsFolder - Ruta donde se encuentran los archivos de migración
         */
        await migrate(db, {migrationsFolder: "./drizzle"});

        // Mensaje de éxito tras completar todas las migraciones
        console.log("All migrations are successfully done");
        
    } catch (error) {
        /**
         * Manejo de errores durante el proceso de migración
         * Registra el error específico y termina el proceso con código de salida 1
         * para indicar que hubo un fallo en la ejecución
         */
        console.log("❌ Migration failed: ", error);
        process.exit(1); // Código de salida no exitoso
    }
}

/**
 * Ejecución del script de migración
 * Llama a la función principal para iniciar el proceso de migración
 * Al ser una función async, se ejecuta de manera asíncrona
 */
runMigration()