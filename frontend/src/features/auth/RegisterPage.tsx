import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { ApiError } from "@/api/errors";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/Button";
import { TextField } from "@/components/fields";
import { Spinner } from "@/components/Spinner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { applyServerErrors } from "@/lib/formErrors";
import { AuthLayout } from "./AuthLayout";
import { registerSchema, type RegisterValues } from "./schemas";

export function RegisterPage() {
  useDocumentTitle("Create account");
  const { status, register: registerAccount } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  if (status === "loading") {
    return (
      <div className="page-center">
        <Spinner label="Restoring your session" />
      </div>
    );
  }
  if (status === "authenticated") return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await registerAccount(values);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError("email", { type: "server", message: "An account with this email already exists." });
      } else {
        setServerError(applyServerErrors(error, setError, ["displayName", "email", "password"]));
      }
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Organise projects and tasks in one calm place."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="form">
        {serverError && (
          <div className="form-alert" role="alert">
            {serverError}
          </div>
        )}
        <TextField
          label="Display name"
          autoComplete="name"
          error={errors.displayName?.message}
          {...register("displayName")}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" variant="primary" loading={isSubmitting} className="btn-block">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
