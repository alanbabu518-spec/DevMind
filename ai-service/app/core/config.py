import os

from dotenv import load_dotenv

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "DevMind AI Service")
APP_ENV = os.getenv("APP_ENV", "development")
