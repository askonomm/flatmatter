class ConformanceResult:
    passed: bool = False
    error: str | None = None

    def __init__(self, passed: bool, error: str | None = None):
        self.passed = passed
        self.error = error
