from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, settings


def build_engine(config: Settings = settings) -> Engine:
    return create_engine(
        config.database_url,
        echo=config.database_echo,
        pool_pre_ping=True,
    )


def get_sessionmaker(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


engine = build_engine(settings)
SessionLocal = get_sessionmaker(engine)


def get_session() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
