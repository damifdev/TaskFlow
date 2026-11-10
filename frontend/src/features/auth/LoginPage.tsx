import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ApiError } from "@/api/errors";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/Button";
import { TextField } from "@/components/fields";
import { Spinner } from "@/components/Spinner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { applyServerErrors } from "@/lib/formErrors";
import { AuthLayout } from "./AuthLayout";
import { loginSchema, type LoginValues } from "./schemas";
import { redirectTarget } from "./redirectTarget";

export function LoginPage() {
  useDocumentTitle("Sign in");
  const { status, login } = useAuth();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (status === "loading") {
    return (
      <div className="page-center">
        <Spinner label="Restoring your session" />
      </div>
    );
  }
  if (status === "authenticated") return <Navigate to={redirectTarget(location.state)} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setServerError("Incorrect email or password.");
      } else {
        setServerError(applyServerErrors(error, setError, ["email", "password"]));
      }
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New to TaskFlow? <Link to="/register">Create an account</Link>
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
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" variant="primary" loading={isSubmitting} className="btn-block">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
