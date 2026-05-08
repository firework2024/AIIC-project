from datetime import datetime, timezone


def main() -> None:
    now = datetime.now(timezone.utc).isoformat()
    print("GitHub connection test for AIIC-project")
    print(f"UTC timestamp: {now}")


if __name__ == "__main__":
    main()
