from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.seeds.demo import (
    DEMO_PASSWORD,
    OPEN_DESIGN_VNEXT_LATE_QA_COURSE_CODE,
    OPEN_DESIGN_VNEXT_LATE_QA_STUDENT_EMAIL,
    OPEN_DESIGN_VNEXT_QA_COURSE_CODE,
    OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL,
    seed_demo_data,
    seed_open_design_vnext_late_qa_data,
    seed_open_design_vnext_qa_data,
)


def main() -> None:
    with SessionLocal() as session:
        result = seed_demo_data(session)
        seed_open_design_vnext_qa_data(session)
        seed_open_design_vnext_late_qa_data(session)

    print("Seeded EduFDE demo data")
    print(f"tenant={result.tenant.slug}")
    print(f"institution={result.institution.code}")
    print(f"package_version={result.package_version.version}")
    print(f"demo_course={result.demo_course.code} ({result.demo_course.title})")
    print(f"visual_qa_course={OPEN_DESIGN_VNEXT_QA_COURSE_CODE}")
    print(f"visual_late_qa_course={OPEN_DESIGN_VNEXT_LATE_QA_COURSE_CODE}")
    print("demo_accounts:")
    print("  admin=admin@edufde.demo")
    print("  teacher=teacher@edufde.demo")
    print("  student=student@edufde.demo")
    print("  student2=student2@edufde.demo")
    print(f"  visual_qa_student={OPEN_DESIGN_VNEXT_QA_STUDENT_EMAIL}")
    print(f"  visual_late_qa_student={OPEN_DESIGN_VNEXT_LATE_QA_STUDENT_EMAIL}")
    print(f"demo_password={DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
