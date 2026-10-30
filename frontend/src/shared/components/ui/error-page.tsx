import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import "./error-page.css";

export type ErrorType =
  | "404"
  | "500"
  | "503"
  | "network"
  | "401"
  | "403"
  | "generic";

type ErrorPageProps = {
  type?: ErrorType;
  title?: string;
  description?: string;
  onRetry?: () => void;
};

const errorConfig: Record<
  ErrorType,
  { code: string; title: string; description: string }
> = {
  "404": {
    code: "404",
    title: "This page wandered off.",
    description: "The page you're looking for doesn't exist or may have moved.",
  },
  "500": {
    code: "500",
    title: "Something went wrong.",
    description:
      "An unexpected server error occurred. Please try again shortly.",
  },
  "503": {
    code: "503",
    title: "We'll be back soon.",
    description:
      "DevMind is temporarily unavailable. Please try again in a moment.",
  },
  network: {
    code: "OFFLINE",
    title: "Connection interrupted.",
    description:
      "We couldn't reach the server. Check your connection and try again.",
  },
  "401": {
    code: "401",
    title: "Please sign in.",
    description:
      "Your session may have expired. Sign in to continue to your workspace.",
  },
  "403": {
    code: "403",
    title: "Access restricted.",
    description: "You don't have permission to access this resource.",
  },
  generic: {
    code: "OOPS",
    title: "Unexpected detour.",
    description: "Something unexpected happened. Let's get you back on track.",
  },
};

export default function ErrorPage({
  type = "generic",
  title,
  description,
  onRetry,
}: ErrorPageProps) {
  const config = errorConfig[type];

  const isAuthenticationError = type === "401";

  return (
    <main className="error-page">
      <div className="error-sky" aria-hidden="true">
        <div className="error-cloud error-cloud--back">
          <span />
          <span />
          <span />
        </div>

        <div className="error-cloud error-cloud--front">
          <span />
          <span />
          <span />
        </div>

        <div className="error-moon" />

        <div className="error-stars">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>

      <section className="error-content" aria-labelledby="error-title">
        <p className="error-brand">DEVMIND</p>

        <div className="error-illustration" aria-hidden="true">
          <span className="error-code">{config.code}</span>
        </div>

        <h1 id="error-title">{title ?? config.title}</h1>

        <p className="error-description">
          {description ?? config.description}
        </p>

        <div className="error-actions">
          <Link
            to={isAuthenticationError ? "/login" : "/Home"}
            className="error-button error-button--primary"
          >
            {isAuthenticationError ? "Sign in" : "Back to DevMind"}
          </Link>

          {onRetry && (
            <button
              type="button"
              className="error-button error-button--secondary"
              onClick={onRetry}
            >
              Try again
            </button>
          )}
        </div>

        <p className="error-footer">
          Every detour is an opportunity to learn something new.
        </p>
      </section>
    </main>
  );
}

/**
 * React Router error boundary.
 * Handles errors thrown by route loaders, actions, and rendering.
 */
export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 401:
        return <ErrorPage type="401" />;

      case 403:
        return <ErrorPage type="403" />;

      case 404:
        return <ErrorPage type="404" />;

      case 503:
        return <ErrorPage type="503" />;

      default:
        return <ErrorPage type="500" />;
    }
  }

  return <ErrorPage type="generic" />;
}