from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.schemas.candidate import BaseCandidate
    from app.schemas.simulation import SimulationRun
    from app.schemas.variant import CandidateVariant


class MemoryStore:
    def __init__(self) -> None:
        self.candidates: dict[str, BaseCandidate] = {}
        self.variants: dict[str, CandidateVariant] = {}
        self.simulations: dict[str, SimulationRun] = {}
        self.event_queues: dict[str, asyncio.Queue] = {}
        self._candidate_variants: dict[str, list[str]] = {}

    def link_variant(self, candidate_id: str, variant_id: str) -> None:
        if candidate_id not in self._candidate_variants:
            self._candidate_variants[candidate_id] = []
        if variant_id not in self._candidate_variants[candidate_id]:
            self._candidate_variants[candidate_id].append(variant_id)

    def get_variant_ids(self, candidate_id: str) -> list[str]:
        return self._candidate_variants.get(candidate_id, [])

    def get_or_create_queue(self, simulation_id: str) -> asyncio.Queue:
        if simulation_id not in self.event_queues:
            self.event_queues[simulation_id] = asyncio.Queue()
        return self.event_queues[simulation_id]

    def cleanup_queue(self, simulation_id: str) -> None:
        self.event_queues.pop(simulation_id, None)


store = MemoryStore()
