/**
 * Endpoint de API para recuperar archivos de usuario desde la base de datos.
 * 
 * Esta ruta maneja peticiones GET para obtener archivos basándose en la autenticación
 * del usuario y el filtrado opcional por carpeta padre. Garantiza que los usuarios
 * solo puedan acceder a sus propios archivos mediante verificaciones de autorización.
 * 
 * @module FileRetrievalAPI
 * @file route.ts
 */

// Importaciones de base de datos y esquema
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";

// Servicio de autenticación
import { auth } from "@clerk/nextjs/server";

// Operadores de consulta para la base de datos
import { eq, and, isNull} from "drizzle-orm";

// Manejadores de solicitud/respuesta de Next.js
import { NextRequest, NextResponse } from "next/server";

/**
 * Maneja peticiones GET para recuperar archivos de usuario
 * 
 * @param {NextRequest} request - El objeto de solicitud HTTP entrante
 * @returns {NextResponse} Respuesta JSON con los archivos o información de error
 */
export async function GET(request: NextRequest){
    try {

        // Autenticar usuario utilizando Clerk
        const {userId} = await auth()

        // Devolver 401 si el usuario no está autenticado
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Extraer parámetros de consulta de la URL
        const searchParams = request.nextUrl.searchParams
        const queryUserId = searchParams.get("userId")
        const parentId = searchParams.get("parentId")

        // Validar que el userId solicitado coincida con el usuario autenticado
        // Esto previene acceso no autorizado a archivos de otros usuarios
        if(!queryUserId || queryUserId !== userId){
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });   
        }

        // Variable para almacenar los resultados de la consulta
        let userFiles;

        // Determinar qué archivos recuperar según el parámetro parentId
        if(parentId){
            
            // Caso 1: Obtener archivos de una carpeta específica (donde parentId coincide)
            userFiles = await db
                .select()
                .from(files)
                .where(
                    and(
                        eq(files.userId, userId),  // Los archivos deben pertenecer al usuario actual
                        eq(files.parentId, parentId) // Los archivos deben estar en la carpeta especificada
                    )
                )
        }else{
            // Caso 2: Obtener archivos de nivel raíz (donde parentId es nulo)
            // Son archivos que no están contenidos en ninguna carpeta
            userFiles = await db
                .select()
                .from(files)
                .where(
                    and(
                        eq(files.userId, userId), // Los archivos deben pertenecer al usuario actual
                        isNull(files.parentId) // Los archivos deben estar en el nivel raíz (sin padre)
                    )
                )
        }

        // Devolver respuesta exitosa con los datos de los archivos
        return NextResponse.json(userFiles)
    } catch (error) {
        // Registrar el error para depuración en el servidor
        console.error("Error fetching files: ", error);

        // Devolver un error genérico al cliente para evitar filtrar detalles de implementación
        return NextResponse.json({ error: "Error to fetch files" }, { status: 500 });
    }
}