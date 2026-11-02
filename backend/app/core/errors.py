"""Domain errors mapped to the consistent { error: { code, message } } response shape."""


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


class AIError(AppError):
    def __init__(self, message: str = "The AI service could not process this request. Please try again."):
        super().__init__(502, "ai_error", message)
