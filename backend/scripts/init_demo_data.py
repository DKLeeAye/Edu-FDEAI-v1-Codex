from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.seeds.demo import DEMO_PASSWORD, seed_demo_data


def main() -> None:
    with SessionLocal() as session:
        result = seed_demo_data(session)

    print("Seeded EduFDE demo data")
    print(f"tenant={result.tenant.slug}")
    print(f"institution={result.institution.code}")
    print(f"package_version={result.package_version.version}")
    print(f"demo_course={result.demo_course.code} ({result.demo_course.title})")
    print("demo_accounts:")
    print("  admin=admin@edufde.demo")
    print("  teacher=teacher@edufde.demo")
    print("  student=student@edufde.demo")
    print("  student2=student2@edufde.demo")
    print(f"demo_password={DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
