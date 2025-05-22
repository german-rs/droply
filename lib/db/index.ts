/**
 * Configuración de Base de Datos - index.ts
 * 
 * Este archivo configura la conexión a la base de datos utilizando Drizzle ORM
 * con Neon Database como proveedor de PostgreSQL serverless. Establece la instancia
 * principal de la base de datos que será utilizada en toda la aplicación.
 * 
 * Dependencias:
 * - drizzle-orm: ORM TypeScript-first para bases de datos SQL
 * - @neondatabase/serverless: Cliente serverless para Neon Database
 * 
 * Variables de entorno requeridas:
 * - DATABASE_URL: URL de conexión a la base de datos Neon
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

// Importar todos los esquemas de la base de datos
import * as schema from "./schema"

/**
 * Cliente SQL de Neon Database
 * 
 * Crea una instancia del cliente SQL serverless de Neon usando la URL de conexión
 * de la base de datos desde las variables de entorno. El operador de aserción no-null (!)
 * se utiliza porque DATABASE_URL es requerida para el funcionamiento de la aplicación.
 * 
 * @throws {Error} Si DATABASE_URL no está definida en las variables de entorno
 */
const sql = neon(process.env.DATABASE_URL!)


/**
 * Instancia de Drizzle ORM
 * 
 * Configura Drizzle ORM con el cliente SQL de Neon y los esquemas de la base de datos.
 * Esta instancia proporciona una interfaz type-safe para realizar operaciones de base de datos
 * con autocompletado y validación de tipos en tiempo de compilación.
 * 
 * Características:
 * - Type-safety completa con TypeScript
 * - Integración automática con esquemas definidos
 * - Soporte para consultas SQL complejas
 * - Migraciones automáticas y validación de esquemas
 * 
 * @example
 * ```typescript
 * // Realizar una consulta
 * const users = await db.select().from(schema.users);
 * 
 * // Insertar datos
 * await db.insert(schema.users).values({
 *   name: 'Juan Pérez',
 *   email: 'juan@ejemplo.com'
 * });
 * ```
 */
export const db = drizzle(sql, {schema})


/**
 * Cliente SQL Raw
 * 
 * Exporta el cliente SQL nativo de Neon para casos donde se necesite ejecutar
 * consultas SQL directas sin pasar por el ORM. Útil para:
 * - Consultas complejas que requieren SQL nativo
 * - Procedimientos almacenados
 * - Operaciones de mantenimiento de base de datos
 * - Consultas de rendimiento crítico
 * 
 * @example
 * ```typescript
 * // Ejecutar SQL directo
 * const result = await sql`SELECT COUNT(*) FROM users WHERE active = true`;
 * 
 * // Consulta con parámetros
 * const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
 * ```
 */
export {sql}

