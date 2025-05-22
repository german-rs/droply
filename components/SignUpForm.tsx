"use client";

import { useForm } from "react-hook-form";
import { useSignUp } from "@clerk/nextjs";
import { z } from "zod";
import { signUpSchema } from "@/schemas/signUpSchema";
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import Link from "next/link";
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";


/**
 * Componente SignUpForm
 * 
 * Un formulario completo de registro de usuarios que maneja la creación de cuentas
 * y verificación de email usando el servicio de autenticación Clerk. El componente
 * proporciona un proceso de dos pasos:
 * 1. Registro inicial con email y contraseña
 * 2. Verificación de email con un código de 6 dígitos
 * 
 * Características:
 * - Validación de formulario usando react-hook-form con esquema Zod
 * - Alternar visibilidad de contraseñas
 * - Manejo y visualización de errores en tiempo real
 * - Estados de carga para mejor UX
 * - Flujo de verificación de email
 * - Diseño responsivo con componentes HeroUI
 * 
 * @returns {JSX.Element} El formulario completo de registro con flujo de verificación
 */
export default function SignUpForm() {

  // Router de Next.js para navegación después del registro exitoso
  const router = useRouter();

  // Gestión del estado del componente
  /** Controla si el componente muestra el formulario de verificación o registro */
  const [verifying, setVerifying] = useState(false);

   /** Rastrea el estado de carga durante los envíos de formulario */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Almacena el código de verificación ingresado por el usuario */
  const [verificationCode, setVerificationCode] = useState("");

  /** Almacena mensajes de error relacionados con autenticación */
  const [authError, setAuthError] = useState<string | null>(null);

   /** Controla la visibilidad del campo de contraseña */
  const [showPassword, setShowPassword] = useState(false);

  /** Controla la visibilidad del campo de confirmación de contraseña */
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

   /** Almacena mensajes de error específicos de verificación */
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );

   // Hook de autenticación de Clerk
  const { signUp, isLoaded, setActive } = useSignUp();

  // Configuración de React Hook Form con validación Zod
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  /**
   * Maneja el envío del formulario de registro inicial
   * 
   * Crea una nueva cuenta de usuario con Clerk e inicia el proceso de verificación de email.
   * En caso de éxito, cambia el componente al modo de verificación.
   * 
   * @param {z.infer<typeof signUpSchema>} data - Datos del formulario que contienen email, contraseña y confirmación
   * @returns {Promise<void>}
   */
  const onSubmit = async (data: z.infer<typeof signUpSchema>) => {
    // Asegurar que Clerk esté cargado antes de proceder
    if (!isLoaded) return;
    setIsSubmitting(true);
    setAuthError(null);

    try {
      // Crear la cuenta de usuario con Clerk
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
      });

      // Iniciar el proceso de verificación de email
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      // Cambiar al modo de verificación
      setVerifying(true);

    } catch (error: any) {
      console.error("Signup error: ", error);

      // Extraer y mostrar mensaje de error amigable para el usuario
      setAuthError(
        error.errors?.[0]?.message ||
          "An error occured during the signup. Please try again"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Maneja el envío del código de verificación de email
   * 
   * Valida el código de verificación ingresado por el usuario y completa el proceso de registro.
   * En verificación exitosa, crea una sesión y redirige al dashboard.
   * 
   * @param {React.FormEvent<HTMLFormElement>} e - Evento de envío del formulario
   * @returns {Promise<void>}
   */
  const handleVerificationSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

     // Asegurar que Clerk esté cargado y el objeto signUp exista
    if (!isLoaded || !signUp) return;
    setIsSubmitting(true);
    setAuthError(null);

    try {
      // Intentar verificar el email con el código proporcionado
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

       // Verificar si la verificación fue exitosa
      if (result.status === "complete") {
        // Crear y activar la sesión del usuario
        await setActive({ session: result.createdSessionId });

        // Redirigir al dashboard en registro exitoso
        router.push("/dashboard");

      } else {
        console.error("Verification incomplete", result);
        setVerificationError("Verification could not be complete");
      }
    } catch (error: any) {
      console.error("Verification incomplete: ", error);

       // Mostrar error de verificación amigable para el usuario
      setVerificationError(
        error.errors?.[0]?.message ||
          "An error occured during the signup. Please try again"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Vista de Verificación de Email
   * 
   * Se renderiza cuando el usuario necesita verificar su dirección de email.
   * Incluye entrada de código de verificación, manejo de errores y funcionalidad de reenvío.
   */
  if (verifying) {
    return (
        <Card className="w-full max-w-md border border-default-200 bg-default-50 shadow-xl">
        <CardHeader className="flex flex-col gap-1 items-center pb-2">
          <h1 className="text-2xl font-bold text-default-900">
            Verify Your Email
          </h1>
          <p className="text-default-500 text-center">
            We've sent a verification code to your email
          </p>
        </CardHeader>

        <Divider />

        <CardBody className="py-6">
          {verificationError && (
            <div className="bg-danger-50 text-danger-700 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{verificationError}</p>
            </div>
          )}

          <form onSubmit={handleVerificationSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="verificationCode"
                className="text-sm font-medium text-default-900"
              >
                Verification Code
              </label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="Enter the 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              color="primary"
              className="w-full"
              isLoading={isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-default-500">
              Didn't receive a code?{" "}
              <button
                onClick={async () => {
                  if (signUp) {
                    await signUp.prepareEmailAddressVerification({
                      strategy: "email_code",
                    });
                  }
                }}
                className="text-primary hover:underline font-medium"
              >
                Resend code
              </button>
            </p>
          </div>
        </CardBody>
      </Card>
     );
  }

  
  /**
   * Vista Principal del Formulario de Registro
   * 
   * El formulario principal de registro con campos de email, contraseña y confirmación de contraseña.
   * Incluye validación de formulario, visualización de errores y características de accesibilidad.
   */
   return (
    <Card className="w-full max-w-md border border-default-200 bg-default-50 shadow-xl">
      <CardHeader className="flex flex-col gap-1 items-center pb-2">
        <h1 className="text-2xl font-bold text-default-900">
          Create Your Account
        </h1>
        <p className="text-default-500 text-center">
          Sign up to start managing your images securely
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
              htmlFor="email"
              className="text-sm font-medium text-default-900"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              startContent={<Mail className="h-4 w-4 text-default-500" />}
              isInvalid={!!errors.email}
              errorMessage={errors.email?.message}
              {...register("email")}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-default-900"
            >
              Password
            </label>
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

          <div className="space-y-2">
            <label
              htmlFor="passwordConfirmation"
              className="text-sm font-medium text-default-900"
            >
              Confirm Password
            </label>
            <Input
              id="passwordConfirmation"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              startContent={<Lock className="h-4 w-4 text-default-500" />}
              endContent={
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  type="button"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-default-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-default-500" />
                  )}
                </Button>
              }
              isInvalid={!!errors.passwordConfirmation}
              errorMessage={errors.passwordConfirmation?.message}
              {...register("passwordConfirmation")}
              className="w-full"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm text-default-600">
                By signing up, you agree to our Terms of Service and Privacy
                Policy
              </p>
            </div>
          </div>

          <Button
            type="submit"
            color="primary"
            className="w-full"
            isLoading={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </CardBody>

      <Divider />

      <CardFooter className="flex justify-center py-4">
        <p className="text-sm text-default-600">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );

}
