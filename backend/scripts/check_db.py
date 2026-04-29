import sys
from pathlib import Path

from sqlalchemy import text

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal


def main() -> None:
    with SessionLocal() as session:
        result = session.execute(text("select 1")).scalar_one()

    print(f"database connection ok: {result}")


if __name__ == "__main__":
    main()
