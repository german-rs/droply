/**
 * API para la autenticación con ImageKit.
 * 
 * Este endpoint proporciona los parámetros de autenticación necesarios para
 * que el cliente pueda realizar operaciones directas con ImageKit (servicio de
 * gestión y optimización de imágenes). Utiliza el SDK de ImageKit para generar
 * tokens de sesión seguros después de verificar la autenticación del usuario.
 * 
 * @module ImageKitAuthAPI
 * @file route.ts
 */

// Servicio de autenticación de la aplicación
import { auth } from "@clerk/nextjs/server";

// Manejador de respuesta HTTP de Next.js
import { NextResponse } from "next/server";

// Cliente oficial de ImageKit para Node.js
import ImageKit from "imagekit";

/**
 * Inicialización del cliente ImageKit con las credenciales del entorno.
 * 
 * Las claves y URL endpoint deben estar configuradas en las variables de entorno.
 * Si alguna no está definida, se usa una cadena vacía como valor predeterminado,
 * lo que provocará errores controlados durante la ejecución.
 */
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
});

/**
 * Maneja peticiones GET para obtener parámetros de autenticación de ImageKit.
 * 
 * Esta función verifica que el usuario esté autenticado antes de generar
 * los parámetros necesarios para la integración del cliente con ImageKit.
 * Los parámetros incluyen firma, timestamp y token de autenticación.
 * 
 * @returns {NextResponse} Respuesta JSON con los parámetros de autenticación o un error
 */
export async function GET() {
  try {

     // Verificar la autenticación del usuario mediante Clerk
    const { userId } = await auth();

    // Rechazar la solicitud si el usuario no está autenticado
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generar parámetros de autenticación para ImageKit
    // Esto incluye: signature, token, expire y timestamp    
    const authParams = imagekit.getAuthenticationParameters();

    // Devolver los parámetros generados al cliente
    return NextResponse.json(authParams);

  } catch (error) {
    // En caso de error, devolver una respuesta genérica de error
    // sin exponer detalles internos del sistema    
    return NextResponse.json({error: "Failed to generate authentication parameters for imagekit"},
        {status: 500}
    );
  }
}
