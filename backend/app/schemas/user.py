from pydantic import BaseModel, Field


class ProfileSyncIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=200)
    photo_url: str | None = Field(default=None, max_length=2000)


class ProfileOut(BaseModel):
    id: str
    email: str | None
    display_name: str | None
    photo_url: str | None
    created_at: str | None = None
    updated_at: str | None = None
