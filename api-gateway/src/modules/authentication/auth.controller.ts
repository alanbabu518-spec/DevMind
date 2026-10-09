import type { Request, Response } from "express";
import { requestMagicLinkSchema } from "./auth.validation";
import { requestMagicLink as requestMagicLinkService } from "./auth.service";

export async function requestMagicLink(
  req: Request,
  res: Response,
): Promise<void> {
  const result = requestMagicLinkSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      status: "error",
      message: result.error.issues[0]?.message ?? "Invalid email address.",
    });
    return;
  }

  await requestMagicLinkService(result.data);

  res.status(200).json({
    status: "success",
    message:
      "If the request can be processed, you will receive an email with a sign-in link.",
  });
}
