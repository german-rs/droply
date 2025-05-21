/**
 * API para la creación de carpetas en el sistema de archivos.
 *
 * Este endpoint maneja peticiones POST para crear nuevas carpetas en la base de datos.
 * Incluye validaciones de autenticación, autorización y verificación de datos de entrada.
 * Permite la creación de carpetas tanto en el nivel raíz como dentro de carpetas existentes.
 *
 * @module FolderCreationAPI
 * @file route.ts
 */

// Importaciones de base de datos y esquema
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";

// Servicio de autenticación
import { auth } from "@clerk/nextjs/server";

// Operadores de consulta para la base de datos
import { eq, and } from "drizzle-orm";

// Manejadores de solicitud/respuesta de Next.js
import { NextRequest, NextResponse } from "next/server";

// Generador de identificadores únicos
import { v4 as uuidv4 } from "uuid";

/**
 * Maneja peticiones POST para crear nuevas carpetas
 *
 * @param {NextRequest} request - El objeto de solicitud HTTP entrante con los datos de la carpeta
 * @returns {NextResponse} Respuesta JSON con el resultado de la operación
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticar usuario utilizando Clerk
    const { userId } = await auth();

    // Devolver 401 si el usuario no está autenticado
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extraer y parsear el cuerpo de la solicitud
    const body = await request.json();
    const { name, userId: bodyUserId, parentId = null } = body;

    // Verificar que el userId del cuerpo coincida con el usuario autenticado
    // Esto previene la creación de carpetas en nombre de otros usuarios
    if (bodyUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validar que el nombre de la carpeta sea válido
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Si se especifica una carpeta padre, verificar que exista y pertenezca al usuario
    if (parentId) {
      const [parentFolder] = await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.id, parentId), // Debe coincidir el ID de la carpeta padre
            eq(files.userId, userId), // Debe pertenecer al usuario actual
            eq(files.isFolder, true) // Debe ser una carpeta, no un archivo
          )
        );

      // Si no se encuentra la carpeta padre, devolver error
      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 401 }
        );
      }
    }

    // Preparar datos para la creación de la carpeta en la base de datos
    const folderData = {
      id: uuidv4(),                           // Generar ID único para la carpeta
      name: name.trim(),                      // Eliminar espacios en blanco al inicio/final
      path: `/folders/${userId}/${uuidv4()}`, // Crear ruta única en el sistema
      size: 0,                                // Tamaño inicial de la carpeta
      type: "folder",                         // Tipo de elemento
      fileUrl: "",                            // Las carpetas no tienen URL de archivo
      thumbnailUrl: null,                     // Las carpetas no tienen miniatura
      userId,                                 // ID del propietario
      parentId,                               // ID de la carpeta contenedora (o null si es raíz)
      isFolder: true,                         // Marcar como carpeta
      isStarred: false,                       // Por defecto no está destacada
      isTrash: false,                         // Por defecto no está en papelera
    };

    // Insertar la carpeta en la base de datos y obtener el registro creado
    const [newFolder] = await db.insert(files).values(folderData).returning();

    // Devolver respuesta exitosa con los datos de la carpeta creada
    return NextResponse.json({
      success: true,
      message: "Folder create successfully",
      folder: newFolder,
    });
  } catch (error) {
    // Registrar el error para depuración en el servidor
    console.error("Error creating folder: ", error);

    // Devolver un error genérico al cliente para evitar filtrar detalles de implementación
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
