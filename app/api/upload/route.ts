/**
 * API para registrar archivos subidos a través de ImageKit.
 * 
 * Este endpoint maneja peticiones POST para registrar en la base de datos 
 * los metadatos de archivos que han sido previamente subidos al servicio ImageKit.
 * Realiza validaciones de autenticación, autorización y verifica la integridad
 * de los datos recibidos antes de almacenarlos en la base de datos.
 * 
 * @module FileRegistrationAPI
 * @file route.ts
 */

// Importación de la conexión a la base de datos
import { db } from "@/lib/db";

// Importación del esquema de la tabla de archivos
import { files } from "@/lib/db/schema";

// Servicio de autenticación
import { auth } from "@clerk/nextjs/server";

// Manejadores de solicitud/respuesta de Next.js
import { NextRequest, NextResponse } from "next/server";

/**
 * Maneja peticiones POST para registrar archivos en la base de datos.
 * 
 * Los archivos ya deben haber sido subidos a ImageKit previamente, y esta función
 * solo se encarga de registrar sus metadatos en la base de datos del sistema.
 * 
 * @param {NextRequest} request - El objeto de solicitud HTTP entrante con los datos del archivo
 * @returns {NextResponse} Respuesta JSON con el registro del archivo creado o un mensaje de error
 */
export async function POST(request: NextRequest){

    try {
        // Verificar autenticación del usuario mediante Clerk
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Analizar el cuerpo de la solicitud para obtener los datos del archivo
        const body = await request.json()
        const {imagekit, userId: bodyUserId} = body

        // Verificar que el usuario esté registrando archivos en su propia cuenta
        // Esto previene la manipulación de datos de otros usuarios
        if(bodyUserId !== userId){
            return NextResponse.json(
                { error: "Unauthorized" }, 
                { status: 401 }
            );    
        }

        // Validar que la respuesta de ImageKit contenga los datos necesarios
        // para crear un registro de archivo válido
        if(!imagekit || !imagekit.url){
            return NextResponse.json(
                { error: "Invalid file upload data" }, 
                { status: 401 }
            ); 
        }

        // Preparar los datos del archivo para su inserción en la base de datos
        // Utilizando valores predeterminados cuando sea necesario
        const fileData = {
        name: imagekit.name || "Untitled", // Nombre del archivo o predeterminado
        path: imagekit.filePath || `/droply/${userId}/${imagekit.name}`, // Ruta del archivo en el sistema
        size: imagekit.size || 0, // Tamaño en bytes
        type: imagekit.fileType || "image", // Tipo de archivo
        fileUrl: imagekit.url, // URL de acceso al archivo
        thumbnailUrl: imagekit.thumbnailUrl || null, // URL de la miniatura (si existe)
        userId: userId, // ID del propietario
        parentId: null,  // Nivel raíz por defecto
        isFolder: false, // Es un archivo, no una carpeta
        isStarred: false,  // No destacado por defecto
        isTrash: false,  // No está en papelera por defecto
        };

        // Insertar el registro del archivo en la base de datos
        // y recuperar el registro completo creado
        const [newFile] = await db.insert(files).values(fileData).returning();

        // Devolver el registro completo del archivo como respuesta
        return NextResponse.json(newFile);

    } catch (error) {
        // Registrar el error en el log del servidor para depuración
        console.error("Error saving file: ", error);

        // Devolver un mensaje de error genérico al cliente
        // sin exponer detalles internos del sistema
        return NextResponse.json(
            {error: "Failed to save file information"},
            {status: 500}
        );
    }
}
