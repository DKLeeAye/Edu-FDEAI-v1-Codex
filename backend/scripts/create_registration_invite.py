from __future__ import annotations

import argparse
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.models import Course, User
from app.models.enums import UserRole
from app.schemas.invites import RegistrationInviteCreateRequest
from app.services.auth import CurrentUserContext
from app.services.invites import create_registration_invite


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create an EduFDE registration invite.")
    parser.add_argument("--admin-email", default="admin@edufde.demo")
    parser.add_argument("--label", default="EduFDE 内测学生邀请码")
    parser.add_argument("--course-code", default="MFG-QA-DEMO")
    parser.add_argument("--max-uses", type=int, default=1)
    parser.add_argument("--expires-days", type=int, default=14)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with SessionLocal() as session:
        admin = session.scalar(
            select(User).where(
                User.email == args.admin_email.strip().lower(),
                User.role == UserRole.ADMIN,
                User.is_active.is_(True),
            )
        )
        if admin is None:
            raise RuntimeError(f"Active admin not found: {args.admin_email}")

        course = session.scalar(
            select(Course).where(
                Course.tenant_id == admin.tenant_id,
                Course.institution_id == admin.institution_id,
                Course.code == args.course_code.strip(),
            )
        )
        if course is None:
            raise RuntimeError(f"Course not found in admin scope: {args.course_code}")

        current_user = CurrentUserContext.from_user(admin)
        expires_at = datetime.now(UTC) + timedelta(days=args.expires_days)
        invite, invite_code = create_registration_invite(
            session,
            current_user=current_user,
            payload=RegistrationInviteCreateRequest(
                label=args.label,
                course_id=course.id,
                max_uses=args.max_uses,
                expires_at=expires_at,
                metadata_json={"source": "create_registration_invite_script"},
            ),
        )

    print("Created EduFDE registration invite")
    print(f"id={invite.id}")
    print(f"label={invite.label}")
    print(f"course_code={args.course_code}")
    print(f"max_uses={invite.max_uses}")
    print(f"expires_at={invite.expires_at}")
    print(f"invite_code={invite_code}")


if __name__ == "__main__":
    main()

