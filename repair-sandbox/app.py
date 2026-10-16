import ast
import os
import re
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="DevMind Repair Sandbox")

MAX_CODE_SIZE = 20_000
EXECUTION_TIMEOUT_SECONDS = 5

FILENAME_PATTERN = r"^[a-zA-Z0-9_-]+\.py$"


class VerifyRequest(BaseModel):
    filename: str = Field(
        default="proposed.py",
        pattern=FILENAME_PATTERN,
    )
    proposed_code: str = Field(
        min_length=1,
        max_length=MAX_CODE_SIZE,
    )
    test_code: str | None = Field(
        default=None,
        max_length=MAX_CODE_SIZE,
    )


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/verify")
def verify(request: VerifyRequest):
    # Step 1: Validate proposed Python syntax.
    try:
        ast.parse(request.proposed_code)
    except SyntaxError as exc:
        return {
            "status": "failed",
            "syntax_valid": False,
            "tests_run": False,
            "tests_passed": False,
            "message": f"Python syntax error on line {exc.lineno}.",
        }

    # Step 2: If no tests were supplied, report syntax only.
    if request.test_code is None:
        return {
            "status": "syntax_checked",
            "syntax_valid": True,
            "tests_run": False,
            "tests_passed": False,
            "message": "Syntax is valid. No tests were supplied.",
        }

    # Step 3: Validate test syntax before execution.
    try:
        ast.parse(request.test_code)
    except SyntaxError as exc:
        return {
            "status": "failed",
            "syntax_valid": True,
            "tests_run": False,
            "tests_passed": False,
            "message": f"Test syntax error on line {exc.lineno}.",
        }

    # Step 4: Run tests inside a temporary workspace.
    # The Docker container must remain isolated and resource-limited.
    try:
        with tempfile.TemporaryDirectory(prefix="devmind-") as temp_dir:
            workspace = Path(temp_dir)

            (workspace / request.filename).write_text(
                request.proposed_code,
                encoding="utf-8",
            )

            (workspace / "test_repair.py").write_text(
                request.test_code,
                encoding="utf-8",
            )

            completed = subprocess.run(
                [
                    "python",
                    "-I",
                    "-c",
                    (
                        "import sys, unittest; "
                        "sys.path.insert(0, '.'); "
                        "unittest.main(module='test_repair', verbosity=2)"
                    ),
                ],
                cwd=temp_dir,
                capture_output=True,
                text=True,
                timeout=EXECUTION_TIMEOUT_SECONDS,
                check=False,
                env={
                    "PATH": os.environ.get("PATH", ""),
                    "PYTHONDONTWRITEBYTECODE": "1",
                },
            )

            passed = completed.returncode == 0
            output = (
                completed.stdout + "\n" + completed.stderr
            )[-4000:]

            return {
                "status": "tests_passed" if passed else "tests_failed",
                "syntax_valid": True,
                "tests_run": True,
                "tests_passed": passed,
                "exit_code": completed.returncode,
                "output": output,
                "message": (
                    "All supplied tests passed."
                    if passed
                    else "One or more supplied tests failed."
                ),
            }

    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "syntax_valid": True,
            "tests_run": True,
            "tests_passed": False,
            "message": "Tests exceeded the time limit.",
        }

    except OSError:
        raise HTTPException(
            status_code=500,
            detail="The sandbox could not run the tests.",
        ) from None
