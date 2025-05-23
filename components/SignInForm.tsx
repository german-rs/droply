"use client"

// Esquema de validación para el formulario
import { signInSchema } from "@/schemas/signInSchema";

// Utilidades para integración con react-hook-form
import { zodResolver } from "@hookform/resolvers/zod";

// Componentes UI personalizados
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

// Hooks de navegación y enrutamiento
import { useRouter } from "next/navigation";
import Link from "next/link";

// Utilidades para manejo de formularios
import { useForm } from "react-hook-form";

// Servicio de autenticación
import { useSignIn } from "@clerk/nextjs";

// Iconos para la interfaz
import { Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

// Librerías para validación y tipado
import { z } from "zod";

// Hooks de React para manejo de estado
import { useState } from "react";

/**
 * Componente principal del formulario de inicio de sesión.
 * 
 * @returns {JSX.Element} El formulario de inicio de sesión con validaciones y manejo de errores
 */
export default function signInForm(){

    // Hooks para navegación y autenticación
    const router = useRouter()
    const {signIn, isLoaded, setActive} = useSignIn()

     // Estados del componente
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    // Configuración del formulario con react-hook-form y validación Zod
    const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  /**
   * Maneja el envío del formulario de inicio de sesión.
   * 
   * @param {z.infer<typeof signInSchema>} data - Datos del formulario (email y contraseña)
   * @returns {Promise<void>} Promesa que resuelve después del intento de autenticación
   */
    const onSubmit = async (data: z.infer<typeof signInSchema>) => {
        if(!isLoaded) return
        setIsSubmitting(true)
        setAuthError(null)

        try {
          // Intentar autenticar al usuario con Clerk
          const result = await signIn.create({
              identifier: data.identifier,
              password: data.password
          })

           // Si la autenticación es exitosa, redirigir al dashboard
          if(result.status === "complete"){
              await setActive({session: result.createdSessionId})
              router.push("/dashboard");
          }else{
              console.error("Sign-in incomplete:", result);
              setAuthError("Sign-in could not be completed. Please try again.");
          }
           
        } catch (error: any) {
            console.error("Sign-in error:", error);
            setAuthError(
                error.errors?.[0]?.message || "An error occured during sign-in. Please try again"
            )
        }finally{
            setIsSubmitting(false)
        }
    }

  /**
   * Renderiza la interfaz del formulario de inicio de sesión.
   * 
   * El componente está estructurado en una tarjeta (Card) con:
   * - Encabezado con mensaje de bienvenida
   * - Cuerpo con el formulario y manejo de errores
   * - Pie de página con enlace a registro
   * 
   * @returns {JSX.Element} Componente visual del formulario de autenticación
   */
    return(
        <Card className="w-full max-w-md border border-default-200 bg-default-50 shadow-xl">
      <CardHeader className="flex flex-col gap-1 items-center pb-2">
        <h1 className="text-2xl font-bold text-default-900">Welcome Back</h1>
        <p className="text-default-500 text-center">
          Sign in to access your secure cloud storage
        </p>
      </CardHeader>

      <Divider />

      <CardBody className="py-6">
        {authError && (
          <div className="bg-danger-50 text-danger-700 p-4 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{authError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="identifier"
              className="text-sm font-medium text-default-900"
            >
              Email
            </label>
            <Input
              id="identifier"
              type="email"
              placeholder="your.email@example.com"
              startContent={<Mail className="h-4 w-4 text-default-500" />}
              isInvalid={!!errors.identifier}
              errorMessage={errors.identifier?.message}
              {...register("identifier")}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label
                htmlFor="password"
                className="text-sm font-medium text-default-900"
              >
                Password
              </label>
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              startContent={<Lock className="h-4 w-4 text-default-500" />}
              endContent={
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-default-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-default-500" />
                  )}
                </Button>
              }
              isInvalid={!!errors.password}
              errorMessage={errors.password?.message}
              {...register("password")}
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            color="primary"
            className="w-full"
            isLoading={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardBody>

      <Divider />

      <CardFooter className="flex justify-center py-4">
        <p className="text-sm text-default-600">
          Don't have an account?{" "}
          <Link
            href="/sign-up"
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
    );
}