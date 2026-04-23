# Domain Contract Mapping

This mapping keeps backend domain boundaries aligned with Android and iOS contract files.

## Personal

- backend route/service: `backend/app/api/routes/personal.py`, `backend/app/services/personal_service.py`
- android DTO/repository: `apk/app/src/main/java/app/momentra/network/personal/PersonalModels.kt`, `apk/app/src/main/java/app/momentra/data/personal/PersonalApiRepository.kt`
- ios model/network: `momentra/momentra/Models/PersonalModels.swift`

## Group

- backend route/service: `backend/app/api/routes/group.py`, `backend/app/services/group_service.py`
- android DTO/repository: `apk/app/src/main/java/app/momentra/network/group/GroupModels.kt`, `apk/app/src/main/java/app/momentra/data/group/GroupApiRepository.kt`
- ios model/network: `momentra/momentra/Models/GroupModels.swift`, `momentra/momentra/Network/NetworkService+Group.swift`

## Business

- backend route/service: `backend/app/api/routes/business.py`, `backend/app/services/business_service.py`
- android DTO/repository: `apk/app/src/main/java/app/momentra/network/business/BusinessModels.kt`, `apk/app/src/main/java/app/momentra/data/business/BusinessApiRepository.kt`
- ios model/network: `momentra/momentra/Models/BusinessModels.swift`, `momentra/momentra/Network/NetworkService+Business.swift`

## Entry Points

- backend app entrypoint: `backend/app/main.py`
- backend compatibility runtime remains available via: `backend/main.py`
- backend local dev runner now targets: `backend/run_dev.py` -> `app.main:app`
- legacy iOS/Android model barrel files retained for compatibility:
  - `apk/app/src/main/java/app/momentra/network/HomeModels.kt`
  - `momentra/momentra/HomeModels.swift`

