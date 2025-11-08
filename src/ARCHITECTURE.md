# Arquitetura e estrutura de pastas (proposta)

Este arquivo descreve a estrutura sugerida para o backend (`backend/src`) e inclui um diagrama PlantUML em `backend/diagrams/backend-structure.puml`.

## Objetivo
- Padronizar onde colocar módulos, infra e componentes cross-cutting.
- Facilitar navegação, testes e evolução (separação por responsabilidades).

## Árvore resumida (proposta)

backend/src
- app.module.ts
- main.ts
- core/
  - prisma/
    - prisma.module.ts
    - prisma.service.ts
  - config/
    - config.module.ts
    - app.config.ts
  - logger/
    - logger.service.ts
  - exceptions/
    - http-exception.filter.ts
  - guards/
    - auth.guard.ts
- common/
  - dtos/
  - pipes/
  - interceptors/
  - decorators/
  - constants.ts
- modules/
  - auth/
    - auth.module.ts
    - controller/
    - service/
    - dto/
    - strategies/
  - user/
    - user.module.ts
    - controller/
    - service/
    - repository/
    - dto/
    - interfaces/
  - devices/
    - devices.module.ts
    - controller/
    - service/
    - repository/
    - dto/
    - readings/  (submódulo opcional para EnergyReading)
  - energy/ (relatórios/aggregations)
  - automations/
  - realtime/
- integrations/
  - mqtt/
  - notification/
- jobs/
- scripts/
- tests/

## Notas
- `core/` agrupa infra (Prisma, config, logger) e deve expor providers reutilizáveis.
- `common/` contém utilitários e DTOs reutilizáveis entre módulos.
- `modules/*` contém toda a lógica de domínio.
- Preferir endpoints dedicados para ingestão de leituras (`/devices/:id/readings`) ao invés de embutir `readings` em `CreateDeviceDto`.

## Diagrama
Ver `backend/diagrams/backend-structure.puml` (PlantUML). Você pode renderizar com a extensão PlantUML do VSCode ou com `plantuml.jar`.

### Como gerar imagem localmente (PowerShell)
Se você tiver `plantuml.jar` e Java instalado:

```powershell
# Gere PNG da pasta atual
cd 'c:\Users\sr889\OneDrive\Documents\autouni\AutoUni\backend\src\diagrams'
java -jar path\to\plantuml.jar backend-structure.puml
```

Ou use a extensão PlantUML no VSCode e abra o arquivo `.puml`.

---

Se quiser, eu também posso gerar skeletons (controllers/services/DTOs) para o submódulo `readings` ou adicionar o DTO `CreateEnergyReadingDto`. Diga qual preferir.