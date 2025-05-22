/**
 * API Route Handler para la subida de archivos
 * 
 * Este módulo maneja la subida de archivos (imágenes y PDFs) utilizando ImageKit
 * como servicio de almacenamiento en la nube. Incluye autenticación de usuarios,
 * validación de tipos de archivo y organización jerárquica por carpetas.
 * 
 * @file route.ts
 */

import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import {and, eq} from "drizzle-orm";
import ImageKit from "imagekit";
import { NextRequest, NextResponse } from "next/server";
import {v4 as uuidv4} from "uuid";


/**
 * Configuración del cliente ImageKit
 * 
 * Inicializa el cliente de ImageKit utilizando las credenciales
 * almacenadas en las variables de entorno para el almacenamiento
 * seguro de archivos en la nube.
 */
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
});

/**
 * Handler POST para la subida de archivos
 * 
 * Procesa la subida de archivos validando la autenticación del usuario,
 * el tipo de archivo y la existencia de la carpeta padre. Los archivos
 * se almacenan en ImageKit con nombres únicos generados por UUID.
 * 
 * @param {NextRequest} request - Objeto de solicitud HTTP que contiene los datos del archivo
 * @returns {Promise<NextResponse>} Respuesta JSON con los datos del archivo subido o error
 * 
 * @throws {401} Cuando el usuario no está autenticado o no autorizado
 * @throws {400} Cuando el archivo no es válido o no se proporciona
 * @throws {404} Cuando la carpeta padre no existe
 * @throws {500} Cuando ocurre un error interno del servidor
 * 
 * @example
 * // Estructura del FormData esperado:
 * const formData = new FormData();
 * formData.append('file', fileObject);
 * formData.append('userId', 'user_123');
 * formData.append('parentId', 'folder_456'); // Opcional
 */
export async function POST(request: NextRequest){
    try {
        
        /**
         * Obtiene el ID del usuario autenticado desde Clerk
         * Si no hay usuario autenticado, retorna error 401
         */
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }


        /**
         * Extrae los datos del formulario multipart/form-data
         * - file: Archivo a subir
         * - formUserId: ID del usuario del formulario (para validación adicional)
         * - parentId: ID de la carpeta padre (opcional)
        */
        const formData = await request.formData()
        const file = formData.get("file") as File
        const formUserId = formData.get("userId") as string
        const parentId = formData.get("parentId") as string || null

        /**
         * Validación de seguridad: verifica que el usuario del formulario
         * coincida con el usuario autenticado para prevenir suplantación
        */
        if(formUserId !== userId){
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        /**
         * Verifica que se haya proporcionado un archivo
        */        
        if(!file){
            return NextResponse.json({ error: "No file provided" }, { status: 401 });
        }

        /**
         * Si se especifica un parentId, verifica que la carpeta padre exista,
         * pertenezca al usuario autenticado y sea efectivamente una carpeta
        */
        if(parentId){
            const [parentFolder] = await db
                .select()
                .from(files)
                .where(
                    and(
                        eq(files.id, parentId),
                        eq(files.userId, userId),
                        eq(files.isFolder, true)
                    )
                );
        }

        /**
         * Si se proporcionó parentId pero la carpeta no existe,
         * retorna error 404
         */
        if(!parentId){
            return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
        }

        /**
         * Valida que el archivo sea una imagen o PDF
         * Solo se permiten tipos MIME que comiencen con "image/" o "application/pdf"
         */
        if(!file.type.startsWith("image/") && file.type !== "application/pdf"){
            return NextResponse.json({ error: "Only images and pdf are supported" }, { status: 400 });
        }

        /**
         * Convierte el archivo a ArrayBuffer y luego a Buffer
         * para su procesamiento con ImageKit
         */
        const buffer = await file.arrayBuffer()
        const fileBuffer = Buffer.from(buffer)

        /**
         * Genera un nombre único para el archivo manteniendo la extensión original
         * Utiliza UUID v4 para garantizar la unicidad
         */
        const originalFilename = file.name
        const fileExtension = originalFilename.split(".").pop() || "";
        const uniqueFilename = `${uuidv4()}.${fileExtension}`;
       
        /**
         * Determina la ruta de la carpeta en ImageKit
         * - Si hay parentId: /droply/{userId}/folder/{parentId}
         * - Si no hay parentId: /droply/{userId}
         */
        const folderPath = parentId 
            ? `/droply/${userId}/folder/${parentId}` 
            : `/droply/${userId}`


        /**
         * Sube el archivo a ImageKit con la configuración especificada
         * - file: Buffer del archivo
         * - fileName: Nombre único generado
         * - folder: Ruta de la carpeta de destino
         * - useUniqueFileName: false (ya generamos nombre único)
         */
        const uploadResponse = await imagekit.upload({
            file: fileBuffer,
            fileName: uniqueFilename,
            folder: folderPath,
            useUniqueFileName: false
        });


        /**
         * Prepara los datos del archivo para almacenar en la base de datos
         * Incluye metadatos del archivo y URLs generadas por ImageKit
         */
        const fileData = {
            name: originalFilename,
            path: uploadResponse.filePath,
            size: file.size,
            type: file.type,
            fileUrl: uploadResponse.url,
            thumbnailUrl: uploadResponse.thumbnailUrl || null,
            userId: userId,
            parentId: parentId,
            isFolder: false,
            isStarred: false,
            isTrash: false 
        };

        /**
         * Inserta el registro del archivo en la base de datos
         * y retorna los datos del archivo creado
         */
        const [newFile] = await db
            .insert(files)
            .values(fileData)
            .returning()

        /**
        * Retorna el archivo creado con todos sus metadatos
        */
       return NextResponse.json(newFile);

    } catch (error) {
        /**
         * Manejo de errores genérico
         * Captura cualquier error no manejado y retorna un mensaje genérico
         * para evitar exponer información sensible del sistema
         */
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
} 